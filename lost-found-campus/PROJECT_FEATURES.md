# 🦅 Lost & Found Campus - Project Features (V2.0)

## 🌟 Core Modules
| Module | Description | Status |
| :--- | :--- | :--- |
| **Authentication** | JWT-based Auth, RBAC (Student/Staff/Admin/Security), Auto-Suspension | ✅ |
| **Lost & Found** | Post items, Search, Filter by Campus/Category, Smart Matching | ✅ |
| **Claims** | Secure Claim Request, OTP Verification, Handover Code, Proof Upload | ✅ |
| **Chat** | Real-time socket.io chat, Image sharing, Call signaling | ✅ |
| **Notifications** | Push Notifications (Expo), In-app badges, Email alerts (simulated) | ✅ |

## � Advanced V2 Features (New)
| Feature | Implementation Details | Status |
| :--- | :--- | :--- |
| **1️⃣ AI Image Similarity** | Vector embedding generation & comparison for uploaded images. | ✅ |
| **2️⃣ Geolocation Heatmap** | visual cluster map of high-loss areas on campus. | ✅ |
| **3️⃣ Bounty System** | Cash reward tracking for lost items. | ✅ |
| **4️⃣ Blockchain Log** | Immutable SHA256 ledger for item integrity & audit. | ✅ |
| **5️⃣ Face Match ID** | Auto-detect faces on ID cards for instant user matching. | ✅ |
| **6️⃣ Insurance Badge** | Priority handling for insured/high-value items. | ✅ |
| **7️⃣ Fraud Detection** | Auto-suspension after 3 reports, Fraud Score calculation. | ✅ |
| **8️⃣ Auto Cleanup** | Cron job archives items older than 30 days. | ✅ |
| **9️⃣ Analytics Dashboard** | Campus Performance Score, Resolution Time, Category Breakdown. | ✅ |
| **🔟 Accessibility** | High Contrast Mode, Large Text support in Theme Engine. | ✅ |

## 📂 Project Structure
```
/backend
    /src
        /config         # DB & App Config
        /controllers    # (Logic mostly in routes for speed)
        /middleware     # Auth, RateLimit
        /models         # Mongoose Schemas (User, LostItem, FraudReport...)
        /routes         # API Endpoints
        /utils          # Helpers (aiService, blockchain, matcher, cronJobs)
    app.js              # Entry Point
    seed.js             # Database Seeder

/frontend
    /assets             # Images/Fonts
    /components         # Reusable UI (Cards, Modals, Badges)
    /config             # Axios & Env
    /context            # User & Theme Contexts
    /screens            # App Screens (Home, Post, Profile, Admin...)
    App.js              # Main Navigator
```

## 🛡️ Security Measures
- **Rate Limiting**: 1000 req/15min.
- **Helmet.js**: Secure HTTP headers.
- **Input Validation**: Mongoose types & sanitization.
- **RBAC**: Strict role checks on Admin routes.
- **Audit Logs**: Tracks all admin actions.

## ⚙️ Tech Stack
- **Backend**: Node.js, Express, MongoDB Atlas, Socket.io, Node-Cron.
- **Frontend**: React Native (Expo), React Navigation, Axios.
- **AI/ML**: Vector Similarity (Simulated/Custom Logic).
- **Blockchain**: SHA256 Linking (Local Ledger).

---
**Version:** 2.0.0
**Last Updated:** Feb 13, 2026
