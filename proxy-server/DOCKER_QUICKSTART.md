# 🐳 Docker Quick Start Guide

## Super Easy Setup (3 Steps)

### Step 1: Open Terminal
- Press `Windows + R`
- Type `cmd` and press Enter
- Or: Right-click in `proxy-server` folder → "Open in Terminal"

### Step 2: Navigate to proxy-server
```bash
cd "C:\Users\pablo\OneDrive\Desktop\TCD\LI7895 - Computer-assisted Language Learning; Design, Implementation And Evaluation\Practicals\Website\proxy-server"
```

### Step 3: Start with Docker
```bash
docker-compose up -d
```

**OR just double-click `START_DOCKER.bat`** ⚡

---

## What Happens?

1. Docker builds the image (first time: ~30 seconds)
2. Creates a container
3. Starts the proxy server
4. Server runs on `http://localhost:3001`

---

## Test It Works

### Method 1: Browser
Open: `http://localhost:3001/`

Should see:
```json
{
  "status": "running",
  "service": "Abair STT Proxy",
  "version": "1.0.0"
}
```

### Method 2: Command Line
```bash
curl http://localhost:3001/
```

### Method 3: stt-test.html
1. Open `http://localhost:8000/project/stt-test.html`
2. Select "Proxy" mode
3. Click "Test Connection"
4. Should show: ✅ Proxy server connected

---

## Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Rebuild (if you change code)
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### "Docker daemon is not running"
**Fix:** Start Docker Desktop (look for whale icon in system tray)

### "Port 3001 is already in use"
**Fix:** Stop whatever is using port 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Then try again
docker-compose up -d
```

### "docker-compose: command not found"
**Fix:** Docker Desktop might not be installed properly
- Download: https://www.docker.com/products/docker-desktop/
- Install
- Restart computer
- Try again

### Container starts but stops immediately
**Fix:** Check logs
```bash
docker-compose logs
```

### Want to start fresh?
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## Why Docker is Better

✅ No Node.js installation needed  
✅ No version conflicts  
✅ Works exactly the same everywhere  
✅ Easy to start/stop  
✅ Isolated from your system  
✅ One command to run everything  

---

## What's Next?

1. ✅ Start proxy with Docker
2. ✅ Test at `http://localhost:3001/`
3. ✅ Open `stt-test.html` and test recording
4. ✅ Use main app for pronunciation practice

**The proxy will keep running in the background until you stop it!**

---

## Need Help?

Run these and share the output:
```bash
docker --version
docker-compose --version
docker ps
docker-compose logs
```

**Docker is the easiest way to run this!** 🚀
