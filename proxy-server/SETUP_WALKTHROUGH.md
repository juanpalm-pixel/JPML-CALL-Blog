# 🎯 Complete Docker Setup - Step by Step

## What You Need
✅ Docker Desktop installed (you have this!)
✅ Docker Desktop **running** (check system tray for whale icon 🐳)

---

## Method 1: One-Click Setup (Easiest)

### Step 1: Navigate to proxy-server folder
Open File Explorer:
```
C:\Users\pablo\OneDrive\Desktop\TCD\LI7895 - Computer-assisted Language Learning; Design, Implementation And Evaluation\Practicals\Website\proxy-server
```

### Step 2: Double-click `START_DOCKER.bat`

### Step 3: Wait 10-30 seconds

### Step 4: See success message! ✅

**Done!** The proxy is running at `http://localhost:3001`

---

## Method 2: Command Line (More Control)

### Step 1: Open Command Prompt
- Press `Windows + R`
- Type `cmd`
- Press Enter

### Step 2: Navigate to folder
```bash
cd "C:\Users\pablo\OneDrive\Desktop\TCD\LI7895 - Computer-assisted Language Learning; Design, Implementation And Evaluation\Practicals\Website\proxy-server"
```

### Step 3: Start Docker
```bash
docker-compose up -d
```

**What this does:**
- `-d` = detached mode (runs in background)
- Docker builds image (first time only)
- Creates container
- Starts proxy server

### Step 4: Verify it's running
```bash
docker-compose ps
```

**Should see:**
```
NAME                STATE     PORTS
abair-stt-proxy    running   0.0.0.0:3001->3001/tcp
```

---

## Testing the Proxy

### Test 1: Browser
Open: `http://localhost:3001/`

**Expected:**
```json
{
  "status": "running",
  "service": "Abair STT Proxy",
  "version": "1.0.0"
}
```

### Test 2: STT Test Page
1. Make sure web server is running (double-click `START_SERVER.bat` in Website folder)
2. Open: `http://localhost:8000/project/stt-test.html`
3. Select **"Proxy"** mode (radio button)
4. Click **"Test Connection"**
5. Should show: ✅ Proxy server connected

### Test 3: Record Audio
Still on `stt-test.html`:
1. Type Irish text in "Expected text" box: `Dia dhuit`
2. Click **"Start Recording"**
3. Say: "Dia dhuit" (hello)
4. Click **"Stop Recording"**
5. Wait 3-5 seconds
6. See transcript appear!

---

## Managing the Container

### View Logs (See what's happening)
```bash
docker-compose logs -f
```
Press `Ctrl+C` to exit

### Stop the Proxy
```bash
docker-compose down
```
Or double-click `STOP_DOCKER.bat`

### Restart the Proxy
```bash
docker-compose restart
```

### Check Status
```bash
docker-compose ps
```

### Full Clean (Start fresh)
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## Common Issues & Solutions

### ❌ "Cannot connect to Docker daemon"
**Problem:** Docker Desktop not running  
**Solution:** 
1. Look for whale icon 🐳 in system tray (bottom-right)
2. If not there, search for "Docker Desktop" and start it
3. Wait for whale icon to appear
4. Try again

### ❌ "Port 3001 is already in use"
**Problem:** Something else using port 3001  
**Solution 1:** Find and stop it
```bash
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

**Solution 2:** Change port in `docker-compose.yml`
```yaml
ports:
  - "3002:3001"  # Use 3002 instead
```
Then update `stt-test.html` to use port 3002

### ❌ "docker-compose: command not found"
**Problem:** Docker Desktop not properly installed  
**Solution:**
1. Download: https://www.docker.com/products/docker-desktop/
2. Install (requires restart)
3. Open Docker Desktop
4. Wait for it to fully start
5. Try again

### ❌ Container starts but immediately exits
**Problem:** Error in proxy code or config  
**Solution:** Check logs
```bash
docker-compose logs
```
Share the error message if you need help!

### ❌ "Error response from daemon: network ... not found"
**Problem:** Network issue  
**Solution:**
```bash
docker-compose down
docker network prune -f
docker-compose up -d
```

---

## Understanding What Docker Does

### The Dockerfile
```dockerfile
FROM node:18-alpine    # Gets Node.js 18
WORKDIR /app           # Sets working directory
COPY package*.json ./  # Copies package files
RUN npm install        # Installs dependencies
COPY proxy-server.js   # Copies your code
EXPOSE 3001           # Opens port 3001
CMD ["node", ...]     # Starts the server
```

### The docker-compose.yml
```yaml
services:
  proxy:
    build: .           # Build from Dockerfile
    ports:
      - "3001:3001"   # Map port 3001
    restart: unless-stopped  # Auto-restart if crashes
```

---

## Advantages of Docker

| Benefit | Explanation |
|---------|-------------|
| ✅ **No Node.js needed** | Container has its own Node.js |
| ✅ **Clean setup** | Isolated from your system |
| ✅ **Easy management** | One command to start/stop |
| ✅ **No conflicts** | Own environment, no version issues |
| ✅ **Consistent** | Works exactly the same everywhere |
| ✅ **Auto-restart** | Container restarts if it crashes |

---

## Using with Your Website

Once Docker container is running:

### Automatic Detection
Your website will **automatically** detect the proxy:
- `stt-test.html` - Select "Proxy" mode
- Main app (`index.html`) - Auto-detects at startup

### No Code Changes Needed!
The proxy runs at `http://localhost:3001` and your code already looks for it there.

---

## What If It's Still Not Working?

### Diagnostic Commands
Run these and share the output:

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Check running containers
docker ps -a

# Check container logs
docker-compose logs

# Check if port is accessible
curl http://localhost:3001/
```

### Get Help
1. Take screenshot of error
2. Copy full error message from terminal
3. Share diagnostic command outputs
4. I'll help debug!

---

## Expected Terminal Output (Success)

When you run `docker-compose up -d`:

```
[+] Building 12.3s (10/10) FINISHED
[+] Running 2/2
 ✔ Network proxy-server_abair-network  Created
 ✔ Container abair-stt-proxy           Started
```

When you test `curl http://localhost:3001/`:

```json
{"status":"running","service":"Abair STT Proxy","version":"1.0.0"}
```

When you check `docker-compose ps`:

```
NAME                IMAGE               STATUS      PORTS
abair-stt-proxy    proxy-server_proxy  running     0.0.0.0:3001->3001/tcp
```

---

## Final Checklist

- [ ] Docker Desktop installed
- [ ] Docker Desktop running (whale icon visible)
- [ ] Terminal/CMD open in `proxy-server` folder
- [ ] Run: `docker-compose up -d`
- [ ] Wait 10-30 seconds
- [ ] Test: `http://localhost:3001/` in browser
- [ ] Open: `http://localhost:8000/project/stt-test.html`
- [ ] Select "Proxy" mode
- [ ] Click "Test Connection"
- [ ] See: ✅ Proxy server connected
- [ ] Record audio and test!

**If all checks pass: You're ready to go! 🎉**

---

**This should work perfectly. If you have any issues, just share the error message and I'll help immediately!** 🐳
