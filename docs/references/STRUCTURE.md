# Cấu trúc dự án

```
quychung/
├── backend/                      # Golang Backend
│   ├── cmd/
│   │   └── main.go              # Entry point
│   ├── internal/
│   │   ├── api/                 # API Handlers
│   │   │   ├── auth_handler.go
│   │   │   ├── transaction_handler.go
│   │   │   └── treasury_handler.go
│   │   ├── database/            # Database layer
│   │   │   └── database.go
│   │   ├── middleware/          # Middleware
│   │   │   └── auth.go
│   │   ├── models/              # Data models
│   │   │   └── models.go
│   │   └── services/            # Business logic
│   │       ├── auth_service.go
│   │       └── blockchain_service.go
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── frontend/                     # React.js Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── TransactionForm.js
│   │   │   └── TransactionList.js
│   │   ├── contexts/            # React contexts
│   │   │   └── AuthContext.js
│   │   ├── pages/               # Page components
│   │   │   ├── Login.js
│   │   │   ├── TreasuryDetail.js
│   │   │   └── TreasuryList.js
│   │   ├── services/            # API services
│   │   │   └── api.js
│   │   ├── styles/              # CSS files
│   │   │   ├── Login.css
│   │   │   ├── TreasuryList.css
│   │   │   ├── TreasuryDetail.css
│   │   │   ├── TransactionForm.css
│   │   │   └── TransactionList.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── contracts/                    # Smart Contracts
│   └── TreasuryLogger.sol       # Main contract
│
├── scripts/                      # Deployment scripts
│   ├── init-db.sql              # Database schema
│   ├── deploy-contract.js       # Contract deployment
│   ├── init.sh                  # Initialize system
│   ├── deploy.sh                # Deploy contract
│   ├── reset.sh                 # Reset data
│   └── package.json
│
├── docker-compose.yml            # Docker orchestration
├── Makefile                      # Make commands
├── .env.example                  # Environment template
├── .gitignore
├── LICENSE                       # MIT License
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Quick start guide
└── STRUCTURE.md                  # This file

```

## Luồng dữ liệu

```
User (Browser)
    ↓
Frontend (React)
    ↓ HTTP/REST
Backend (Golang API)
    ↓
    ├─→ PostgreSQL (Data storage)
    └─→ Geth (Blockchain)
            ↓
        Smart Contract
```

## API Endpoints

### Public
- `GET  /api/health` - Health check
- `GET  /api/auth/google` - Get Google OAuth URL
- `POST /api/auth/google-login` - Login with Google

### Protected (require JWT)
- `POST /api/treasuries` - Create treasury
- `GET  /api/treasuries` - List treasuries
- `GET  /api/treasuries/:id` - Get treasury
- `GET  /api/treasuries/:id/balance` - Get balance
- `POST /api/treasuries/:id/members` - Add member
- `POST /api/treasuries/:id/transactions` - Create transaction
- `GET  /api/treasuries/:id/transactions` - List transactions

## Database Schema

```sql
users (id, email, name, avatar_url, created_at, updated_at)
treasuries (id, name, description, created_by, chain_address, created_at, updated_at)
members (id, treasury_id, user_id, role, joined_at)
transactions (id, treasury_id, type, amount_token, note, created_by, created_at)
chain_logs (id, transaction_id, tx_hash, detail_hash, block_number, status, created_at)
```

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Backend | Golang 1.21 |
| Frontend | React 18 |
| Database | PostgreSQL 15 |
| Blockchain | Geth (Private PoA) |
| Smart Contract | Solidity 0.8 |
| Auth | Google OAuth 2.0 |
| API Framework | Gin |
| ORM | GORM |
| Routing | React Router |
| HTTP Client | Axios |
| Container | Docker |
| Orchestration | Docker Compose |

## Development Workflow

1. **Local Development**: Run services with `make start`
2. **Code Changes**: Edit files, services auto-reload (with volumes)
3. **Database Changes**: Update `scripts/init-db.sql` and restart
4. **Contract Changes**: Edit `.sol` file and run `make deploy-contract`
5. **Testing**: Use `make logs` to debug
6. **Reset**: Use `make reset` for clean slate

## Production Considerations

- Use HTTPS (nginx/traefik)
- Change all secrets in `.env`
- Use proper key management (Vault)
- Enable database backups
- Add monitoring (Prometheus/Grafana)
- Enable rate limiting
- Use CDN for frontend
- Scale backend horizontally
