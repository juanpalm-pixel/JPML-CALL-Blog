# Docker Installation & Usage Guide

## 🐳 Running with Docker (Easiest!)

### Prerequisites
- ✅ Docker installed (you already have this!)
- ✅ Docker Desktop running

---

## Quick Start (3 Commands)

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Navigate to proxy-server folder
cd proxy-server

# 2. Build and start the container
docker-compose up -d

# 3. Check if it's running
docker-compose ps
```

**That's it!** Proxy is now running at `http://localhost:3001` 🎉

### Option 2: Using Docker directly

```bash
# 1. Navigate to proxy-server folder
cd proxy-server

# 2. Build the image
docker build -t abair-stt-proxy .

# 3. Run the container
docker run -d -p 3001:3001 --name abair-proxy abair-stt-proxy

# 4. Check if it's running
docker ps
```

---

## Common Commands

### Check Status
```bash
# With docker-compose
docker-compose ps

# With docker
docker ps
```

### View Logs
```bash
# With docker-compose
docker-compose logs -f

# With docker
docker logs -f abair-proxy
```

### Stop the Container
```bash
# With docker-compose
docker-compose down

# With docker
docker stop abair-proxy
```

### Restart the Container
```bash
# With docker-compose
docker-compose restart

# With docker
docker restart abair-proxy
```

### Remove Everything (Clean slate)
```bash
# With docker-compose
docker-compose down -v

# With docker
docker stop abair-proxy
docker rm abair-proxy
docker rmi abair-stt-proxy
```

---

## Testing the Proxy

### 1. Check Health Endpoint
```bash
curl http://localhost:3001/
```

**Expected Response:**
```json
{
  "status": "running",
  "service": "Abair STT Proxy",
  "version": "1.0.0"
}
```

### 2. Open in Browser
Visit: `http://localhost:3001/`

Should see the JSON response above.

### 3. Test from stt-test.html
1. Open `http://localhost:8000/project/stt-test.html`
2. Select "Proxy" mode
3. Click "Test Connection"
4. Should show: ✅ Proxy server connected

---

## Troubleshooting

### "Port 3001 is already in use"
**Solution 1:** Stop other process on port 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
ports:
  - "3002:3001"  # Use 3002 instead
```

### "Docker daemon is not running"
**Solution:** Start Docker Desktop

### "Cannot connect to Docker daemon"
**Solution:** 
- Make sure Docker Desktop is running
- Windows: Check system tray for Docker icon
- Restart Docker Desktop if needed

### Container starts but immediately stops
**Solution:** Check logs
```bash
docker-compose logs
```

### Changes not reflected after editing code
**Solution:** Rebuild the container
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Understanding the Setup

### Dockerfile
- Uses Node.js 18 Alpine (lightweight)
- Installs dependencies
- Exposes port 3001
- Runs the proxy server

### docker-compose.yml
- Defines the service
- Maps port 3001 (host) to 3001 (container)
- Sets environment variables
- Enables automatic restart
- Creates isolated network

---

## Advantages of Docker

✅ **No Node.js version conflicts** - Container has its own Node.js  
✅ **Clean environment** - Isolated from your system  
✅ **Easy to share** - Anyone with Docker can run it  
✅ **Consistent** - Works the same on Windows/Mac/Linux  
✅ **Easy cleanup** - Remove container, no trace left  
✅ **Auto-restart** - Container restarts if it crashes  

---

## Integration with Your Website

Once the Docker container is running:

1. **stt-test.html** will automatically work with proxy mode
2. **Main app** will detect proxy at `http://localhost:3001`
3. No code changes needed!

---

## Production Deployment with Docker

If you want to deploy the Docker container to the cloud:

### Option 1: Render (Docker Support)
```bash
# Push to GitHub
# In Render dashboard:
# - Select "Docker" as environment
# - Point to your repo
# - Render auto-detects Dockerfile
```

### Option 2: Railway (Docker Support)
```bash
railway up
# Automatically detects Dockerfile
```

### Option 3: Azure/AWS/GCP
- Upload Docker image
- Run as container service
- Many free tiers available

---

## Quick Reference Card

| Task | Command |
|------|---------|
| **Start** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **Restart** | `docker-compose restart` |
| **Logs** | `docker-compose logs -f` |
| **Status** | `docker-compose ps` |
| **Rebuild** | `docker-compose build` |
| **Clean All** | `docker-compose down -v` |

---

## What to Do Now

1. ✅ Open terminal/command prompt
2. ✅ Navigate to proxy-server folder
3. ✅ Run: `docker-compose up -d`
4. ✅ Wait 10-20 seconds for container to start
5. ✅ Test: `curl http://localhost:3001/`
6. ✅ Open: `http://localhost:8000/project/stt-test.html`
7. ✅ Select Proxy mode and test!

---

## Still Having Issues?

Share the output of:
```bash
docker --version
docker-compose --version
docker-compose ps
docker-compose logs
```

And I'll help debug! 🐛

---

**Docker setup is way easier than manual Node.js installation!** 🎉
