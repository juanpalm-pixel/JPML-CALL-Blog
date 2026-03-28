# Abair STT Proxy Server

Solves CORS issue by proxying requests to Abair.ie API.

## Quick Start

1. **Install Node.js**: https://nodejs.org/
2. **Install dependencies**: Double-click `INSTALL.bat`
3. **Start server**: Double-click `START_PROXY.bat`
4. **Update frontend**: Code will auto-detect proxy

## How It Works

Browser → Proxy (localhost:3001) → Abair API (no CORS!)

## Endpoints

- Health: `GET http://localhost:3001/`
- STT: `POST http://localhost:3001/api/stt`
