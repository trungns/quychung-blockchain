package main

import (
	"embed"
	"io/fs"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/quychung/backend/internal/api"
	"github.com/quychung/backend/internal/database"
	"github.com/quychung/backend/internal/middleware"
	"github.com/quychung/backend/internal/services"
)

//go:embed static/*
var StaticFiles embed.FS

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	dbConfig := database.Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "quychung"),
		Password: getEnv("DB_PASSWORD", "quychung123"),
		DBName:   getEnv("DB_NAME", "quychung"),
	}

	if err := database.Connect(dbConfig); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize blockchain service
	blockchainService, err := services.NewBlockchainService()
	if err != nil {
		log.Printf("Warning: Failed to initialize blockchain service: %v", err)
		log.Println("Some features may not work properly")
	}

	// Initialize Gin
	router := gin.Default()

	// CORS middleware - Allow all origins since frontend is embedded
	// Frontend calls /api from same origin, but we allow CORS for development
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", "https://quychung.wellytech.vn"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			// In production with embedded frontend, requests come from same origin
			// Allow all for flexibility
			return true
		},
	}))

	// Initialize handlers
	authHandler := api.NewAuthHandler()
	treasuryHandler := api.NewTreasuryHandler(blockchainService)
	transactionHandler := api.NewTransactionHandler(blockchainService)
	reportHandler := api.NewReportHandler()

	// Dynamic env-config.js endpoint (serves runtime environment config to frontend)
	router.GET("/env-config.js", func(c *gin.Context) {
		googleClientID := getEnv("GOOGLE_CLIENT_ID", "")
		port := getEnv("PORT", "8080")
		apiURL := "http://localhost:" + port

		// Generate JavaScript config file
		jsContent := "window.ENV = {\n"
		jsContent += "  REACT_APP_API_URL: '" + apiURL + "',\n"
		jsContent += "  REACT_APP_GOOGLE_CLIENT_ID: '" + googleClientID + "'\n"
		jsContent += "};"

		c.Header("Content-Type", "application/javascript")
		c.String(200, jsContent)
	})

	// Public routes
	public := router.Group("/api")
	{
		public.GET("/auth/google", authHandler.GetAuthURL)
		public.GET("/auth/google/callback", authHandler.GoogleCallback)
		public.POST("/auth/google-login", authHandler.GoogleLogin)
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
	}

	// Protected routes
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// Treasury routes
		protected.POST("/treasuries", treasuryHandler.CreateTreasury)
		protected.GET("/treasuries", treasuryHandler.GetTreasuries)
		protected.GET("/treasuries/:id", treasuryHandler.GetTreasury)
		protected.POST("/treasuries/:id/members", treasuryHandler.AddMember)
		protected.PUT("/treasuries/:id/members/:memberId", treasuryHandler.UpdateMemberRole)
		protected.DELETE("/treasuries/:id/members/:memberId", treasuryHandler.RemoveMember)
		protected.GET("/treasuries/:id/balance", treasuryHandler.GetBalance)
		protected.GET("/treasuries/:id/bank-account", treasuryHandler.GetBankAccount)
		protected.PUT("/treasuries/:id/bank-account", treasuryHandler.UpdateBankAccount)
		protected.DELETE("/treasuries/:id/bank-account", treasuryHandler.DeleteBankAccount)

		// Transaction routes
		protected.POST("/treasuries/:id/transactions", transactionHandler.CreateTransaction)
		protected.GET("/treasuries/:id/transactions", transactionHandler.GetTransactions)
		protected.PUT("/treasuries/:id/transactions/:txId", transactionHandler.UpdateTransaction)
		protected.DELETE("/treasuries/:id/transactions/:txId", transactionHandler.DeleteTransaction)
		protected.POST("/treasuries/:id/transactions/:txId/confirm", transactionHandler.ConfirmTransaction)
		protected.POST("/treasuries/:id/transactions/:txId/reject", transactionHandler.RejectTransaction)

		// Report routes
		protected.GET("/treasuries/:id/reports/income-by-member", reportHandler.GetMonthlyIncomeByMember)
		protected.GET("/treasuries/:id/reports/monthly-expense", reportHandler.GetMonthlyExpense)
		protected.GET("/treasuries/:id/reports/yearly-summary", reportHandler.GetYearlySummary)
		protected.GET("/treasuries/:id/reports/top-contributors", reportHandler.GetTopContributors)
	}

	// Setup embedded static file serving for frontend
	staticFS, err := fs.Sub(StaticFiles, "static")
	if err == nil {
		// Serve static files (JS, CSS, images, etc.)
		router.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Skip API routes
			if strings.HasPrefix(path, "/api") {
				c.JSON(404, gin.H{"error": "API endpoint not found"})
				return
			}

			// Try to serve the file from embedded FS
			file, err := staticFS.Open(strings.TrimPrefix(path, "/"))
			if err != nil {
				// If file not found, serve index.html (for React Router)
				indexFile, err := staticFS.Open("index.html")
				if err != nil {
					c.JSON(404, gin.H{"error": "Not found"})
					return
				}
				defer indexFile.Close()
				c.DataFromReader(200, -1, "text/html", indexFile, nil)
				return
			}
			defer file.Close()

			// Determine content type
			stat, _ := file.Stat()
			if stat.IsDir() {
				// Serve index.html for directories
				indexFile, err := staticFS.Open("index.html")
				if err != nil {
					c.JSON(404, gin.H{"error": "Not found"})
					return
				}
				defer indexFile.Close()
				c.DataFromReader(200, -1, "text/html", indexFile, nil)
				return
			}

			// Serve the file with appropriate content type
			c.DataFromReader(200, stat.Size(), getContentType(path), file, nil)
		})
	} else {
		log.Printf("Warning: Failed to load embedded static files: %v", err)
		log.Println("Running in API-only mode")
	}

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	log.Printf("API available at: http://localhost:%s/api", port)
	log.Printf("Frontend available at: http://localhost:%s", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getContentType(path string) string {
	if strings.HasSuffix(path, ".html") {
		return "text/html"
	} else if strings.HasSuffix(path, ".css") {
		return "text/css"
	} else if strings.HasSuffix(path, ".js") {
		return "application/javascript"
	} else if strings.HasSuffix(path, ".json") {
		return "application/json"
	} else if strings.HasSuffix(path, ".png") {
		return "image/png"
	} else if strings.HasSuffix(path, ".jpg") || strings.HasSuffix(path, ".jpeg") {
		return "image/jpeg"
	} else if strings.HasSuffix(path, ".svg") {
		return "image/svg+xml"
	} else if strings.HasSuffix(path, ".ico") {
		return "image/x-icon"
	}
	return "application/octet-stream"
}
