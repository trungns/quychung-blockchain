.PHONY: help init start stop restart logs deploy-contract reset clean

help: ## Show this help message
	@echo "Quỹ Chung - Treasury Management System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

init: ## Initialize and start all services
	@chmod +x scripts/*.sh
	@./scripts/init.sh

start: ## Start all services
	@docker-compose up -d
	@echo "✅ Services started"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8080"

stop: ## Stop all services
	@docker-compose down
	@echo "✅ Services stopped"

restart: ## Restart all services
	@docker-compose restart
	@echo "✅ Services restarted"

logs: ## View logs (use Ctrl+C to exit)
	@docker-compose logs -f

deploy-contract: ## Deploy contract to Hardhat blockchain
	@chmod +x scripts/deploy-hardhat-docker.sh
	@./scripts/deploy-hardhat-docker.sh

reset: ## Reset all data (WARNING: destroys everything)
	@chmod +x scripts/reset.sh
	@./scripts/reset.sh

clean: ## Clean up Docker resources
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Cleaned up"

db-shell: ## Connect to PostgreSQL shell
	@docker-compose exec postgres psql -U quychung -d quychung

backend-shell: ## Connect to backend container shell
	@docker-compose exec backend sh

hardhat-console: ## Connect to Hardhat console
	@docker-compose exec hardhat npx hardhat console --network localhost

status: ## Check services status
	@docker-compose ps

build: ## Build all Docker images
	@docker-compose build

update: ## Pull latest images and restart
	@docker-compose pull
	@docker-compose up -d
	@echo "✅ Updated and restarted"

setup-frontend: ## Setup frontend with Google OAuth config
	@chmod +x scripts/generate-frontend-env.sh
	@./scripts/generate-frontend-env.sh

check-oauth: ## Check OAuth configuration
	@chmod +x scripts/check-oauth-config.sh
	@./scripts/check-oauth-config.sh
