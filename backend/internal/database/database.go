package database

import (
	"embed"
	"fmt"
	"log"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/quychung/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

//go:embed migrations/*.sql
var migrationFiles embed.FS

// MigrationHistory tracks executed migrations
type MigrationHistory struct {
	ID        uint      `gorm:"primaryKey"`
	Filename  string    `gorm:"unique;not null"`
	AppliedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

// Connect establishes connection to PostgreSQL database
func Connect(config Config) error {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		config.Host,
		config.Port,
		config.User,
		config.Password,
		config.DBName,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Database connection established successfully")
	return nil
}

// Migrate runs database migrations
func Migrate() error {
	log.Println("Running database migrations...")

	// First, run SQL migrations from files
	if err := runSQLMigrations(); err != nil {
		return fmt.Errorf("SQL migration failed: %w", err)
	}

	// Then, run GORM auto-migrations for models
	err := DB.AutoMigrate(
		&models.User{},
		&models.Treasury{},
		&models.Member{},
		&models.Transaction{},
		&models.ChainLog{},
		&models.TreasuryBankAccount{},
		&MigrationHistory{},
	)

	if err != nil {
		return fmt.Errorf("model migration failed: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// runSQLMigrations executes SQL migration files in order
func runSQLMigrations() error {
	log.Println("Running SQL migrations...")

	// Create migration_history table if not exists
	if err := DB.AutoMigrate(&MigrationHistory{}); err != nil {
		return fmt.Errorf("failed to create migration_history table: %w", err)
	}

	// Read all migration files
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Sort migration files by name (they should be numbered: 001_, 002_, etc.)
	var migrationFilenames []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			migrationFilenames = append(migrationFilenames, entry.Name())
		}
	}
	sort.Strings(migrationFilenames)

	// Execute migrations in order
	for _, filename := range migrationFilenames {
		// Check if migration already applied
		var count int64
		DB.Model(&MigrationHistory{}).Where("filename = ?", filename).Count(&count)

		if count > 0 {
			log.Printf("Migration %s already applied, skipping", filename)
			continue
		}

		// Read migration file
		content, err := migrationFiles.ReadFile(filepath.Join("migrations", filename))
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		// Execute migration
		log.Printf("Applying migration: %s", filename)
		if err := DB.Exec(string(content)).Error; err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", filename, err)
		}

		// Record migration as applied
		history := MigrationHistory{
			Filename:  filename,
			AppliedAt: time.Now().UTC(),
		}
		if err := DB.Create(&history).Error; err != nil {
			return fmt.Errorf("failed to record migration %s: %w", filename, err)
		}

		log.Printf("Migration %s applied successfully", filename)
	}

	log.Println("SQL migrations completed")
	return nil
}

// Close closes the database connection
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
