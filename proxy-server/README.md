# Abair STT Proxy Server

Solves CORS issue by proxying requests to Abair.ie API.

## 🐳 Quick Start with Docker (EASIEST!)

**Prerequisites:** Docker Desktop installed

### One Command:
```bash
docker-compose up -d
```

**Or:** Double-click `START_DOCKER.bat`

**Test:** `http://localhost:3001/`

**See:** `DOCKER_QUICKSTART.md` for full guide

---

## 📦 Alternative: Node.js (Manual)

If you prefer running without Docker:

1. **Install Node.js**: https://nodejs.org/
2. **Install dependencies**: Double-click `INSTALL.bat`
3. **Start server**: Double-click `START_PROXY.bat`
4. **Test**: `http://localhost:3001/`

---

## How It Works

Browser → Proxy (localhost:3001) → Abair API (no CORS!)

## Endpoints

- Health: `GET http://localhost:3001/`
- STT: `POST http://localhost:3001/api/stt`

## Documentation

- `DOCKER_QUICKSTART.md` - Fast Docker setup
- `DOCKER_GUIDE.md` - Complete Docker reference
- `CLOUD_DEPLOYMENT.md` - Deploy to internet

---

**Recommended:** Use Docker for easiest setup! 🚀
