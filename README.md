# RS Yasmin - Hospital Management System

Platform manajemen Rumah Sakit Yasmin dengan arsitektur Node.js + React + MySQL.

## Quick Start

### Development Setup

```bash
# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Generate JWT secret (paste result ke backend/.env)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Start services
docker-compose up -d

# Initialize database
npm run --prefix backend prisma:migrate
```

### Environment Variables

**Backend (.env)**
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Secret key untuk signing JWT tokens
- `NODE_ENV`: development / production
- `PORT`: Server port (default: 8000)

**Frontend (.env.local)**
- `VITE_API_URL`: Backend API URL

## Architecture

```
nginx:80
├── /api/* → backend:8000
├── / → frontend:5173
└── /socket.io → backend:8000 (WebSocket)
```

## Security Features

✅ CORS whitelist (tidak lagi origin: '*')  
✅ Rate limiting 100 req/15min  
✅ Security headers (HSTS, CSP, X-Frame-Options)  
✅ JWT authentication  
✅ Non-root container user  
✅ Health check endpoints  
✅ Credentials di .env (tidak di git)  

## Docker Compose Services

- **mysql**: Database
- **backend**: API server
- **frontend**: Web interface
- **nginx**: Reverse proxy

## Production Deployment

1. Update `docker-compose.yml` dengan production variables
2. Enable HTTPS di nginx.conf
3. Setup MySQL backups
4. Configure PM2 clustering
5. Setup monitoring (Prometheus, Grafana)

## Troubleshooting

**Database connection error**
```bash
docker-compose exec mysql mysql -u root -proot123
```

**Clear containers**
```bash
docker-compose down -v
```

**View logs**
```bash
docker-compose logs -f backend
```

---

DevOps setup by: 2026-10-01
