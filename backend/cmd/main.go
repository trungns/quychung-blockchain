package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/quychung/backend/internal/api"
	"github.com/quychung/backend/internal/database"
	"github.com/quychung/backend/internal/middleware"
	"github.com/quychung/backend/internal/services"
)

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

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize handlers
	authHandler := api.NewAuthHandler()
	treasuryHandler := api.NewTreasuryHandler(blockchainService)
	transactionHandler := api.NewTransactionHandler(blockchainService)
	reportHandler := api.NewReportHandler()

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
		protected.GET("/treasuries/:id/balance", treasuryHandler.GetBalance)

		// Transaction routes
		protected.POST("/treasuries/:id/transactions", transactionHandler.CreateTransaction)
		protected.GET("/treasuries/:id/transactions", transactionHandler.GetTransactions)

		// Report routes
		protected.GET("/treasuries/:id/reports/income-by-member", reportHandler.GetMonthlyIncomeByMember)
		protected.GET("/treasuries/:id/reports/monthly-expense", reportHandler.GetMonthlyExpense)
		protected.GET("/treasuries/:id/reports/yearly-summary", reportHandler.GetYearlySummary)
		protected.GET("/treasuries/:id/reports/top-contributors", reportHandler.GetTopContributors)
	}

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)

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
