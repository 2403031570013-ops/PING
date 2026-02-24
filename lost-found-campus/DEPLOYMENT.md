# 🦅 Lost & Found Campus - Deployment Guide

This guide covers how to deploy the entire "Lost & Found Campus" system to production.

## 🏗️ System Architecture Refresher
*   **Backend**: Node.js + Express + Socket.io (Deploy on **Render** or **Railway**)
*   **Database**: MongoDB Atlas (Cloud)
*   **Frontend**: React Native (Deploy on **Google Play Console** for Android, **App Store** for iOS, or simply as an **Expo Go** project).
*   **Admin Dashboard**: Accessible via the Web Build of the Frontend (Deploy on **Vercel** or **Netlify**).

---

## ✅ Step 1: MongoDB Atlas Setup
1.  Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a **new Cluster** (M0 Sandbox is free).
3.  Go to **Database Access** -> Create a new Database User (e.g., `admin_user`). save the password!
4.  Go to **Network Access** -> Add IP Address -> `0.0.0.0/0` (Allow access from anywhere).
5.  Get your **Connection String**:
    *   Click "Connect" -> "Connect your application".
    *   Copy the URI (e.g., `mongodb+srv://admin_user:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`).

---

## 🚀 Step 2: Backend Deployment (Render.com)
We will deploy the `backend/` folder as a Node.js Web Service.

1.  Push your code to **GitHub**.
2.  Log in to [Render](https://render.com).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Settings**:
    *   **Root Directory**: `backend` (Important!)
    *   **Build Command**: `npm install`
    *   **Start Command**: `node src/app.js`
6.  **Environment Variables** (Add these):
    *   `MONGO_URI`: (Paste your connection string from Step 1)
    *   `JWT_SECRET`: (Generate a strong random string)
    *   `PORT`: `10000` (Render's internal port)
    *   `NODE_ENV`: `production`
7.  Click **Deploy Web Service**.
8.  **Wait** for deployment to finish. Copy the *onrender.com* URL (e.g., `https://lost-found-api.onrender.com`).

---

## 📱 Step 3: Frontend Deployment (Expo)

### A. Configuration
1.  Open `frontend/config/axios.js`.
2.  Update the `API_BASE_URL` to your **Render Backend URL**:
    ```javascript
    // const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Local
    const API_BASE_URL = 'https://lost-found-api.onrender.com/api'; // Production
    ```
3.  Open `frontend/utils/socket.js`.
4.  Update the `SOCKET_URL`:
    ```javascript
    // const SOCKET_URL = 'http://127.0.0.1:5000'; // Local
    const SOCKET_URL = 'https://lost-found-api.onrender.com'; // Production
    ```

### B. Publish to Expo (Easiest)
1.  Install EAS CLI: `npm install -g eas-cli`
2.  Login: `eas login`
3.  Configure project: `eas build:configure`
4.  Run a build (for Android provided as example):
    ```bash
    eas build --platform android
    ```
5.  Wait for the build to finish. You will get an `.apk` (or `.aab` for Play Store) link.

### C. Deploy Web Dashboard (Admin)
Since we have admin screens, we can deploy the web version.
1.  In `frontend/`:
    ```bash
    npx expo export -p web
    ```
2.  This creates a `dist/` or `web-build/` folder.
3.  Upload this folder to **Vercel** or **Netlify**.
4.  Ensure your backend handles CORS for your new Vercel domain! (Update `app.js` CORS settings if needed).

---

## 🛡️ Step 4: Final Security Checklist
1.  **Rate Limiting**: Ensure `express-rate-limit` is active (check `app.js`).
2.  **Helmet**: Ensure `helmet()` middleware is active for security headers.
3.  **Input Validation**: Backend routes have validation checks (we implemented ObjectId checks).
4.  **No Debug Logs**: Remove `console.log` statements or set `NODE_ENV=production` to suppress them if your logger supports it (standard `console.log` still prints, consider using a proper logger like `winston` for advanced filtering).

---

## 🤝 Handover
Once deployed:
1.  Share the **Android APK link** with students.
2.  Share the **Web Dashboard URL** with Campus Administration.
3.  Share the **Security Mode** instructions with Guard staff.

**System is ready for Launch! 🚀**
