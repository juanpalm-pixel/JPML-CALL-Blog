# Abair STT Proxy - FREE Cloud Deployment Guide

## 🐳 Docker Setup (EASIEST - Recommended!)

### Quick Start
```bash
cd proxy-server
docker-compose up -d
```

**Done!** Proxy running at `http://localhost:3001` 🎉

**Or use the shortcut:** Double-click `START_DOCKER.bat`

**Full Docker guide:** See `DOCKER_GUIDE.md`

---

## ☁️ Cloud Deployment (For Public Access)

## 🎯 Goal
Deploy the proxy server to the cloud so it's **always available** and can be accessed from any website (not just localhost).

---

## Option 1: Render.com (Recommended - Easiest)

### Step 1: Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub (free)

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Choose "Build and deploy from a Git repository"
3. Connect your GitHub repo (or use Render's Git)

### Step 3: Configure Service
- **Name**: `abair-stt-proxy`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node proxy-server.js`
- **Plan**: `Free`

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait 2-3 minutes for deployment
3. You'll get a URL like: `https://abair-stt-proxy.onrender.com`

### Step 5: Update Your Website
In `stt-test.html` and `browser-stt-service.js`, change:
```javascript
const proxyUrl = 'https://abair-stt-proxy.onrender.com/api/stt';
```

**✅ Done! Now accessible from anywhere.**

---

## Option 2: Railway.app

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Sign up with GitHub (free $5/month credit)

### Step 2: Deploy
1. Click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your repo → `proxy-server` folder
4. Railway auto-detects Node.js

### Step 3: Get URL
1. Go to Settings → Generate Domain
2. You'll get: `https://abair-stt-proxy.up.railway.app`

### Step 4: Update Code
```javascript
const proxyUrl = 'https://abair-stt-proxy.up.railway.app/api/stt';
```

---

## Option 3: Vercel (Serverless)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
cd proxy-server
vercel
```

### Step 3: Follow Prompts
- Project name: `abair-stt-proxy`
- Deploy: Yes
- You'll get: `https://abair-stt-proxy.vercel.app`

---

## Option 4: Heroku (Classic)

### Step 1: Create Procfile
In `proxy-server/`:
```
web: node proxy-server.js
```

### Step 2: Deploy
```bash
heroku create abair-stt-proxy
git push heroku main
```

### Step 3: Get URL
`https://abair-stt-proxy.herokuapp.com`

---

## 🎓 For TCD/University Hosting

If you have access to TCD servers:

### Option A: TCD Web Space
1. Upload `proxy-server/` folder
2. SSH into server
3. Run: `npm install && node proxy-server.js`
4. Keep alive with `pm2` or `forever`

### Option B: TCD Cloud Services
Ask computing services about:
- Node.js hosting
- Container deployment (Docker)
- Cloud platform access

---

## 📝 Files Needed for Deployment

Already created in `proxy-server/`:
- ✅ `package.json` - Dependencies
- ✅ `proxy-server.js` - Main code
- 🆕 Need: `vercel.json` (if using Vercel)
- 🆕 Need: `Procfile` (if using Heroku)

---

## 🔧 Environment Variables (if needed)

Some platforms need:
```
PORT=3001
NODE_ENV=production
```

Set in platform dashboard:
- Render: Environment → Add Variable
- Railway: Variables tab
- Vercel: Settings → Environment Variables

---

## ✅ Testing After Deployment

1. Visit: `https://your-proxy-url.com/`
   - Should show: `{ "status": "running", "service": "Abair STT Proxy" }`

2. Test STT endpoint:
   ```bash
   curl -X POST https://your-proxy-url.com/api/stt \
     -H "Content-Type: application/json" \
     -d '{"recogniseBlob":"test","developer":true,"method":"online2bin"}'
   ```

3. Update your website's proxy URL

4. Hard refresh browser (Ctrl+Shift+R)

---

## 💰 Cost Comparison

| Platform | Free Tier | Always On? | Easy? |
|----------|-----------|------------|-------|
| **Render** | ✅ 750 hrs/month | Sleeps after 15min | ⭐⭐⭐⭐⭐ |
| **Railway** | ✅ $5 credit/month | Yes | ⭐⭐⭐⭐ |
| **Vercel** | ✅ Unlimited | Yes | ⭐⭐⭐⭐ |
| **Heroku** | ❌ No longer free | No | ⭐⭐⭐ |

**Recommendation: Use Render** (easiest, sufficient for class project)

---

## 🚀 Quick Deploy (Copy-Paste)

### For Render:
1. Push code to GitHub
2. https://dashboard.render.com/select-repo
3. Connect repo
4. Use settings above
5. Deploy

### For Railway:
```bash
cd proxy-server
npm install -g railway
railway login
railway init
railway up
railway open
```

---

## 🎉 After Deployment

Update these files with your new URL:

1. **stt-test.html** line ~110:
   ```javascript
   <input type="text" id="proxyUrl" value="https://YOUR-URL-HERE.onrender.com/api/stt">
   ```

2. **browser-stt-service.js** line ~489:
   ```javascript
   const proxyUrl = 'https://YOUR-URL-HERE.onrender.com/api/stt';
   ```

**Your Irish E-Reader will now work from anywhere! 🇮🇪**
