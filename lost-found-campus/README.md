# 🦅 Lost & Found Campus - Complete System

Welcome to the **production-ready** source code for the "Lost & Found Campus" platform.

## 📂 Project Structure

```
lost-found-campus/
├── backend/                # Node.js + Express API Server
│   ├── src/
│   │   ├── config/         # DB Connection & Passport
│   │   ├── controllers/    # Route Logic (if separated)
│   │   ├── middleware/     # Auth, RBAC, Validation
│   │   ├── models/         # Mongoose Schemas (User, LostItem, etc.)
│   │   ├── routes/         # Express Routes (Auth, Report, Chat, Admin)
│   │   ├── utils/          # Matcher Algorithm, Email, etc.
│   │   └── app.js          # Entry Point & Socket.io Setup
│   ├── uploads/            # Local Image Storage (use S3 for Prod)
│   ├── .env.example        # Sample Environment Variables
│   └── package.json
│
├── frontend/               # React Native (Expo) App + Web Dashboard
│   ├── assets/             # Images & Fonts
│   ├── components/         # Reusable UI (Buttons, Cards, Inputs)
│   ├── config/             # Axios & API Setup
│   ├── context/            # Global State (User, Theme)
│   ├── navigation/         # React Navigation Stacks
│   ├── screens/            # Application Screens (Home, Profile, Security)
│   │   ├── security_mode/  # Specific UI for Guards
│   │   └── ...
│   ├── utils/              # Socket.io Client, Helpers
│   ├── App.js              # Main App Entry
│   ├── app.json            # Expo Configuration
│   └── package.json
│
├── DEPLOYMENT.md           # Step-by-step deploy guide
└── PROJECT_FEATURES.md     # Feature list & specifications
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
*   Node.js (v18+)
*   MongoDB Atlas Account
*   Expo Go App on your phone

### 1. Backend Setup
1.  Navigate to `backend/`:
    ```bash
    cd backend
    npm install
    ```
2.  Create a `.env` file (copy from `.env.example`):
    ```env
    MONGO_URI=mongodb+srv://...
    JWT_SECRET=your_super_secret_key
    PORT=5000
    ```
3.  Start the server:
    ```bash
    npm start
    ```
    *(Backend runs on http://localhost:5000)*

### 2. Frontend Setup
1.  Navigate to `frontend/`:
    ```bash
    cd frontend
    npm install
    ```
    *(If you face legacy peer dep issues, use `npm install --legacy-peer-deps`)*
2.  Start Expo:
    ```bash
    npx expo start
    ```
3.  Scan the QR code with **Expo Go** (Android/iOS) or press `w` for Web Dashboard.

---

## 🔑 Default Credentials (After Seeding)

**Admin User:**
*   Email: `admin@paruluniversity.ac.in`
*   Password: `admin` (or whatever set in `seed.js`)

**Security User:**
*   Email: `security@paruluniversity.ac.in`
*   Password: `security`

---

## � Deployment (Production)

### Quick Deployment Guide

**Status:** ✅ **PRODUCTION READY**

1. **See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** for step-by-step instructions
2. **Deploy Backend** to [Render.com](https://render.com)
3. **Deploy Frontend** to [Vercel.com](https://vercel.com)
4. **Database** setup on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

**Key URLs after deployment:**
- Backend API: `https://your-backend.onrender.com`
- Frontend: `https://your-frontend.vercel.app`
- MongoDB Atlas: `https://cloud.mongodb.com`

---

## 🛠️ Security Features Implemented
*   **JWT Auth**: Secure stateless authentication.
*   **RBAC**: Middleware ensures Students cannot access Admin API.
*   **Suspension**: Immediate lockout for banned users.
*   **Input Sanitization**: All MongoDB queries use Mongoose to prevent injection.
*   **Rate Limiting**: API is protected against brute force.
*   **Audit Logging**: Every sensitive admin action is logged permanently.
*   **Helmet.js**: Secure HTTP headers on all responses.
*   **Bcryptjs**: Password hashing with 12 salt rounds.
*   **OTP Brute-force Protection**: Lockout after 3 failed attempts.

---

## 📱 Features Checklist
- [x] Smart Matching Algorithm (Keyword/Location/Time)
- [x] Multi-Campus Isolation
- [x] Secure Claim System (Proof Upload & OTP Handover)
- [x] Karma Points & Leaderboard
- [x] In-App Chat (Real-time Socket.io)
- [x] Security Desk Module (Quick Log & Auto-Notify)
- [x] Push Notifications (Expo)
- [x] Admin Dashboard (Stats, User Management, CSV Export)

This system is built to be **scalable** and **secure**.
