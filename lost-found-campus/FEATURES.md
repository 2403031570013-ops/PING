# 🦅 Lost & Found Campus - Features

A simple and powerful tool to find lost things and return found items on campus.

## 🚀 Key Features

### 1. Easy Login & Signup
- **Quick Profile Setup**: A simple 3-step process (Who you are, Your Campus, Reason) to start using the app.
- **Easy Verification**: Log in safely using a code sent to your WhatsApp or SMS.
- **Profiles for Everyone**: Different layouts and features for Students, Teachers, Security, and Admins.
- **🔐 Secure Admin Login**: Admin accounts require a **secret Admin Key** alongside credentials. Invalid key attempts are logged for audit.

### 2. Missing & Found Items
- **Fast Item Posting**: Quickly post about something you lost or found with photos.
- **Easy Categories**: Organize items by Phone, Keys, Bags, etc.
- **Rewards & Urgent Alerts**: Offer rewards for lost items or mark them as "Urgent" if needed.
- **Simple Search**: Easily find items by name, place, or category.
- **Share Items**: Share item details via WhatsApp, social media, or copy link.

### 3. Getting Your Items Back
- **Easy Claims**: Ask for your item back and show proof easily.
- **Simple Return Steps**: A clear step-by-step way to return or get back an item.
- **History**: See a list of all items that were successfully returned.

### 4. Campus Location Activity
- **Location Map**: See which parts of campus have the most missing or found items.
- **Busy Spot Alerts**: See real-time counts of reports at the Library, Canteen, etc.

---

## 🛡️ Account Safety & Community Protection

### 5. Report User Account
- **🚨 Report Any User**: Report accounts for harassment, fake profiles, scams, spam, impersonation, or hate speech.
- **Multi-Step Report Flow**: 3-step wizard — select reason → add details → review & confirm.
- **Auto-Suspension**: Users with 5+ reports get automatically suspended.
- **Admin Notifications**: Every report instantly notifies campus admins.
- **Audit Trail**: All reports are tracked with timestamps and admin resolution notes.

### 6. Report Items (Posts)
- **Flag Inappropriate Posts**: Report posts for spam, fake/misleading content, duplicates, or offensive material.
- **Community-Driven Moderation**: Multiple reports trigger automatic review.

### 7. Block Users
- **Block Anyone**: Block users you don't want to interact with.
- **Hidden From View**: Blocked users' items and messages are hidden.
- **Easy Unblock**: Unblock from your settings at any time.

### 8. Account Deletion
- **Right to Delete**: Users can permanently delete their account.
- **Safety Confirmation**: Must type "DELETE" to confirm — no accidental deletions.
- **Soft Delete**: Data is anonymized (not fully erased) for audit compliance.

---

## 🎨 Clean & Simple Design

- **Role-Based Dashboards**: Admin sees Admin Dashboard, Staff sees Security Desk, Students see Lost & Found feed.
- **Beautiful Look**: Modern colors and smooth animations that look great.
- **Dark & Light Mode**: Switch between dark and light themes whenever you want.
- **Theme-Aware UI**: All screens properly adapt to light and dark modes.
- **Works Everywhere**: Use it on your phone or computer easily.

---

## 🛡️ Admin & Security

- **🏛️ Admin Dashboard**: Dedicated admin interface with stats, user management, and audit logs.
- **🛡️ Security Desk**: Staff-specific interface for rapid item logging.
- **Report Moderation Panel**: Admins can review, investigate, and resolve reports.
- **User Management**: Suspend, ban, or warn users directly from admin console.
- **Activity Logs**: All important actions are saved safely to prevent mistakes.
- **Admin Key System**: `.env` configurable secret key for admin login verification.

---

## 🧠 Better Connected

- **Instant Alerts**: Get notified immediately about new messages or updates.
- **WhatsApp Alerts**: Get important codes and updates directly on WhatsApp.
- **Top Helpers**: A points system to reward people who help others find their lost items.
- **In-App Chat**: Secure chat between item finder and owner.
- **Call History**: Track all in-app calls.
- **Send Feedback**: Help improve the app (coming soon).

---

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| Admin Key Gate | Secret key required for admin login |
| Brute-Force Protection | Account lockout after 10 failed login attempts |
| Rate Limiting | API requests throttled per IP |
| Input Sanitization | NoSQL injection & XSS prevention |
| Helmet.js | Security headers on all responses |
| JWT Auth | Secure token-based authentication |
| OTP Verification | Phone verification for new accounts |
| Audit Logging | All security events tracked |

---
*Developed for Parul University Campus.*
