const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== MOCK DATA =====
const campuses = [
    { _id: "c1", name: "IIT Delhi", location: "Hauz Khas, Delhi", isActive: true },
    { _id: "c2", name: "BITS Pilani", location: "Pilani, Rajasthan", isActive: true },
    { _id: "c3", name: "SRM University", location: "Chennai, TN", isActive: true },
    { _id: "c4", name: "Parul University", location: "Vadodara, Gujarat", isActive: true }
];

const users = [
    { _id: "u1", fullName: "Campus Admin", email: "admin@example.com", phone: "+919999999999", role: "admin", campusId: "c1" },
    { _id: "u2", fullName: "Jane Doe", email: "student@example.com", phone: "+918888888888", role: "student", campusId: "c1" }
];

let lostItems = [
    { _id: "l1", title: "Black Backpack", description: "Contains laptop and cables", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62", location: "Central Library", campusId: "c1", postedBy: "u1", createdAt: new Date() }
];

let foundItems = [
    { _id: "f1", title: "Blue Water Bottle", description: "Found near cafeteria", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8", location: "Cafeteria", campusId: "c1", postedBy: "u2", createdAt: new Date() }
];

let chats = [];
let claims = [];

// ===== AUTH ROUTES =====
app.get("/api/auth/campuses", (req, res) => {
    res.json(campuses);
});

app.post("/api/auth/login", (req, res) => {
    const user = users[0]; // Return admin user
    res.json({ user, message: "Login successful" });
});

app.get("/api/auth/profile", (req, res) => {
    res.json(users[0]);
});

app.post("/api/auth/push-token", (req, res) => {
    res.json({ message: "Token saved" });
});

// ===== LOST ITEMS =====
app.get("/api/lost", (req, res) => {
    res.json(lostItems);
});

app.post("/api/lost", (req, res) => {
    const newItem = { _id: `l${Date.now()}`, ...req.body, createdAt: new Date() };
    lostItems.push(newItem);
    res.status(201).json(newItem);
});

app.delete("/api/lost/:id", (req, res) => {
    lostItems = lostItems.filter(i => i._id !== req.params.id);
    res.json({ message: "Deleted" });
});

// ===== FOUND ITEMS =====
app.get("/api/found", (req, res) => {
    res.json(foundItems);
});

app.post("/api/found", (req, res) => {
    const newItem = { _id: `f${Date.now()}`, ...req.body, createdAt: new Date() };
    foundItems.push(newItem);
    res.status(201).json(newItem);
});

app.delete("/api/found/:id", (req, res) => {
    foundItems = foundItems.filter(i => i._id !== req.params.id);
    res.json({ message: "Deleted" });
});

// ===== CLAIMS =====
app.get("/api/claims/received", (req, res) => {
    res.json(claims);
});

app.post("/api/claims", (req, res) => {
    const newClaim = { _id: `cl${Date.now()}`, ...req.body, status: "pending", createdAt: new Date() };
    claims.push(newClaim);
    res.status(201).json(newClaim);
});

app.patch("/api/claims/:id", (req, res) => {
    const claim = claims.find(c => c._id === req.params.id);
    if (claim) claim.status = req.body.status;
    res.json(claim);
});

// ===== CHAT =====
app.get("/api/chat", (req, res) => {
    res.json(chats);
});

app.post("/api/chat/init", (req, res) => {
    const newChat = { _id: `ch${Date.now()}`, ...req.body, messages: [], createdAt: new Date() };
    chats.push(newChat);
    res.json(newChat);
});

app.post("/api/chat/send/:chatId", (req, res) => {
    const chat = chats.find(c => c._id === req.params.chatId);
    if (chat) {
        chat.messages.push({ text: req.body.text, senderId: "u1", createdAt: new Date() });
    }
    res.json(chat);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔥 Mock Backend running on http://localhost:${PORT}`);
    console.log(`📦 Using in-memory data (no database required)`);
});
