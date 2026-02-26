# 🚀 DEPLOYMENT CHECKLIST - LOST & FOUND CAMPUS

## Pre-Deployment (DO FIRST)

### 1. GitHub Setup
- [ ] Code pushed to GitHub (main branch)
- [ ] .env file is NOT committed (verify in .gitignore)
- [ ] No API keys or secrets in code
- [ ] All debug scripts removed or documented

**Command to verify:**
```bash
git status  # Should show nothing (all committed)
git log --oneline -5  # Should show recent commits
```

---

## Backend Deployment to Render.com

### Step 1: Create Render Account
- [ ] Go to https://render.com
- [ ] Sign up / Login
- [ ] Connect GitHub repository

### Step 2: Create Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Select your GitHub repository
- [ ] Branch: `main`
- [ ] Name: `lost-found-backend` (or your choice)
- [ ] Runtime: `Node`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`

### Step 3: Configure Environment Variables
In Render dashboard, add these environment variables:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lost-found-campus?retryWrites=true&w=majority
JWT_SECRET=<generate-random-32-char-string>
ADMIN_KEY=<generate-random-16-char-string>
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=<your-value>
CLOUDINARY_API_KEY=<your-value>
CLOUDINARY_API_SECRET=<your-value>
ENABLE_CLUSTER=true
ENABLE_CRON_JOBS=true
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check logs for any errors
- [ ] Note the deployment URL (e.g., `https://lost-found-backend-xxxxx.onrender.com`)

### Step 5: Verify Backend
```bash
# Test health endpoint
curl https://your-backend-url.onrender.com/api/health

# Should return:
# {"status":"ok","uptime":XXX,"timestamp":"2026-02-26T...","env":"production"}
```

---

## Frontend Deployment to Vercel

### Step 1: Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up / Login
- [ ] Connect GitHub repository

### Step 2: Configure Project
- [ ] Click "New Project"
- [ ] Select `lost-found-campus` repository
- [ ] Framework: "Expo"
- [ ] Build command: `npm run build` (or Vercel auto-detects)

### Step 3: Update Backend URL
**CRITICAL:** Update frontend to point to your deployed backend

In `frontend/config/axios.js`, update:
```javascript
const PRODUCTION_URL = 'https://your-backend-url.onrender.com/api/';
```

Commit and push this change.

### Step 4: Deploy
- [ ] Vercel auto-deploys on push to main
- [ ] Wait for build to complete
- [ ] Check deployment URL
- [ ] Test the site

### Step 5: Verify Frontend
- [ ] Open https://your-frontend-url.vercel.app
- [ ] Login works
- [ ] Can post items
- [ ] Chat works
- [ ] Admin dashboard accessible

---

## Database Setup (MongoDB Atlas)

### Step 1: Create Cluster
- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Create new Cluster (M0 free tier is fine)
- [ ] Wait for cluster to initialize

### Step 2: Create Database User
- [ ] Go to "Database Access"
- [ ] Create new user
- [ ] Username: `admin_user` (or your choice)
- [ ] Password: <strong>Save this!</strong>
- [ ] Database User Privileges: "Admin"

### Step 3: Network Access
- [ ] Go to "Network Access"
- [ ] Click "Add IP Address"
- [ ] Select "Allow Access from Anywhere" (0.0.0.0/0)
- [ ] Confirm

### Step 4: Get Connection String
- [ ] Click "Connect"
- [ ] Select "Connect your application"
- [ ] Copy the connection string
- [ ] Replace `<password>` with your user password
- [ ] Use this as `MONGO_URI` in Render environment

**Example:**
```
mongodb+srv://admin_user:password123@cluster0.mongodb.net/lost-found-campus?retryWrites=true&w=majority
```

---

## Post-Deployment Testing

### Test 1: Health Check
```bash
curl https://your-backend-url/api/health
```
Expected: `{"status":"ok",...}`

### Test 2: User Registration
1. Open frontend URL
2. Click "Sign Up"
3. Fill in details
4. Should see onboarding screen

### Test 3: Login
1. Use credentials from Step 2
2. Should land on HomeScreen
3. Should see "Lost Items" feed

### Test 4: Post Item
1. Click "+" button
2. Add title, description, photo
3. Submit
4. Should see success notification

### Test 5: Real-time Chat
1. Click on any item
2. Click "Call" or "Email"
3. Chat should open
4. Type message
5. Should see real-time updates

### Test 6: Admin Access
1. Login with admin account
2. Go to Admin Dashboard
3. Should see stats and controls

---

## Troubleshooting

### Backend won't start
- [ ] Check MONGO_URI is correct
- [ ] Check JWT_SECRET is set
- [ ] Check Render logs for errors
- [ ] Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0

### Frontend can't connect to backend
- [ ] Verify backend URL in `frontend/config/axios.js`
- [ ] Check CORS is enabled in backend (app.js line ~95)
- [ ] Verify backend is actually running
- [ ] Check network tab in browser DevTools

### Database connection fails
- [ ] Verify MONGO_URI format
- [ ] Check username/password are correct
- [ ] Check cluster exists in MongoDB Atlas
- [ ] Check network access is allowed

### Push notifications not working
- [ ] Set up Expo push token registration
- [ ] Check push token is saved in database
- [ ] Verify Firebase credentials (if using)

---

## Performance Optimization

### Backend
- [ ] Rate limiting enabled (1000 req/15min)
- [ ] Compression enabled
- [ ] Cluster mode enabled (multiple workers)
- [ ] Cron jobs running
- [ ] Database indexes created

### Frontend
- [ ] Web build optimized
- [ ] Images lazy-loaded
- [ ] Socket.io reconnection logic
- [ ] Badge polling every 5 seconds

---

## Security Checklist

- [ ] No .env file committed
- [ ] All secrets in environment variables
- [ ] Admin key protected
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Helmet.js headers enabled
- [ ] Input sanitization enabled
- [ ] JWT tokens expiring properly

---

## Go-Live Checklist

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and functional
- [ ] Database seeded with demo data
- [ ] All user flows tested
- [ ] Admin dashboard accessible
- [ ] Chat working in real-time
- [ ] Push notifications tested
- [ ] Performance acceptable
- [ ] No console errors

---

## Support Resources

- **Backend Logs:** Render Dashboard → Logs
- **Frontend Logs:** Vercel Dashboard → Deployments
- **Database:** MongoDB Atlas → Collections
- **Documentation:** DEPLOYMENT.md & README.md in repo

---

**Status:** ✅ Ready for production deployment  
**Last Updated:** February 26, 2026
