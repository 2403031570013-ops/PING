# 🎓 Lost & Found Campus

A production-grade, multi-campus university trust system built for students to report lost and found items within their college community. Featuring a modern technical stack and premium UX.

## 🌟 Key Features

- **Multi-Campus Isolation**: Secure data segmentation ensures students only see items relevant to their campus.
- **Push Notifications**: Instant alerts powered by Expo Notifications whenever a user receives a new chat message.
- **Real-Time Messaging**: Built-in communication layer for finders and owners to coordinate returns safely.
- **Axios Networking**: Centralized API client with automatic Firebase Token injection and interceptors.
- **Admin Dashboard**: Secure moderation panel for campus staff to manage and curate cross-platform reports.
- **Modern UI/UX**: Feature-rich interface with dual-feed tabs, real-time search, pull-to-refresh, and status tracking.

## 🛠 Tech Stack

- **Mobile**: React Native (Expo SDK 54), React Navigation, Axios.
- **Backend**: Node.js, Express, MongoDB Cloud (Mongoose).
- **Communication**: Expo Server SDK (Push Notifications).
- **Security**: Firebase Admin SDK (JWT Validation) & Firebase Client Auth.
- **Storage**: Firebase Storage (Secure Cloud Photo Hosting).

---

## 📂 Project Architecture

### `/frontend`
- `config/axios.js`: Centralized network engine with request interceptors.
- `context/UserContext.js`: Global state orchestration for user synchronization.
- `screens/`:
  - `LoginScreen.js`: Secure email/password entry.
  - `CampusSelectScreen.js`: One-time university onboarding.
  - `HomeScreen.js`: High-performance dual-feed (Lost/Found).
  - `InboxScreen.js`: Personalized communication hub.
  - `ChatScreen.js`: Real-time conversation interface with push delivery.
  - `PostItemScreen.js`: Multi-step reporting flow with image picking.
  - `AdminScreen.js`: Protected dashboard for items moderation.

### `/backend`
- `src/app.js`: Unified entry point.
- `src/controllers/`: Business logic (Chat, Auth, Items).
- `src/models/`: Simplified, high-performance Mongoose schemas.
- `src/middleware/`: JWT verification and role-based access control.
- `seed.js`: Intelligent script for populating campuses and demo data.

---

## 🚀 Deployment Guide

### 1. Backend Ignite
```bash
cd backend
npm install
node seed.js  # Build university list & demo content
npm run dev   # Start the Express engine (Default: Port 5000)
```

### 2. Frontend Launch
```bash
cd frontend
npm install
npx expo start
```

*Note: For testing on physical devices, update the `baseURL` in `frontend/config/axios.js` to your machine's local IP.*

---

## 👨‍💼 Administrator Privileges
The system includes a secure role-based access control (RBAC).
1. Run `node seed.js` to create a default admin user (`demo@example.com`).
2. Logging in with this user enables the **ADMIN PANEL** badge on the home feed.
3. Admins have global deletion rights for their specific campus items.

## 📄 License
Engineering excellence for the university community.
