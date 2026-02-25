const cluster = require('cluster');
const os = require('os');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix for Node <-> Atlas connection issues
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');
const { sanitizeInput } = require('./middleware/sanitize');

// Clustering configuration
const numCPUs = os.cpus().length;
const isClusterMode = process.env.ENABLE_CLUSTER === 'true'; // Set true for production load balancing


const initCronJobs = require('./utils/cronJobs');

if (isClusterMode && cluster.isMaster) {
    console.log(`Master ${process.pid} is running with ${numCPUs} CPU cores`);
    initCronJobs();

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    const app = express();
    app.set('trust proxy', 1); // Fix for express-rate-limit on Render/proxies


    // Connect to Database
    connectDB().then(() => {
        console.log("✔ [DATABASE] Connected and Ready.");
    }).catch(err => {
        console.error("✘ [DATABASE] Connection Failed:", err.message);
    });

    // Init Cron Jobs (Single Worker Mode)
    if (!isClusterMode) {
        initCronJobs();
    }

    // ================================================================
    // MIDDLEWARE STACK
    // ================================================================

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: false,
    }));

    // Compression (Gzip)
    app.use(compression());

    // Global Rate Limiter: 1000 requests per 15 minutes per IP
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many requests. Please try again later." }
    });
    app.use(limiter);

    // Auth rate limiter - generous for profile/refresh, strict for login/register
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200, // Generous: includes profile polling, token refresh, etc.
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many authentication attempts. Please try again later." }
    });

    // Strict limiter ONLY for login/register/otp (brute-force protection)
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20, // 20 login attempts per 15 min per IP
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many login attempts. Please try again in 15 minutes." },
        keyGenerator: (req) => req.ip + ':login' // Separate bucket for login
    });

    // Request logging (dev only)
    if (process.env.NODE_ENV !== 'production') {
        app.use((req, res, next) => {
            console.log(`[REQ] ${req.method} ${req.url}`);
            next();
        });
    }

    // CORS
    app.use(cors());

    // Body parsing
    app.use(express.json({ limit: "20mb" }));
    app.use(express.urlencoded({ extended: true, limit: "20mb" }));

    // Input sanitization (NoSQL injection / XSS prevention)
    app.use(sanitizeInput);

    // Static files
    app.use('/uploads', cors(), express.static('uploads'));

    // ================================================================
    // API ROUTES
    // ================================================================

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'development'
        });
    });

    // Core routes
    const authRoutes = require("./routes/authRoutes");
    // Apply generous limiter to all auth, strict limiter only to login/register/otp
    app.use("/api/auth", authLimiter);
    app.post("/api/auth/login", loginLimiter);
    app.post("/api/auth/register", loginLimiter);
    app.post("/api/auth/verify-otp", loginLimiter);
    app.use("/api/auth", authRoutes);
    app.use("/api/lost", require("./routes/lost.routes"));
    app.use("/api/found", require("./routes/found.routes"));
    app.use("/api/chat", require("./routes/chatRoutes"));
    app.use("/api/claims", require("./routes/claimRoutes"));
    app.use("/api/notifications", require("./routes/notification.routes"));
    app.use("/api/reports", require("./routes/report.routes"));
    app.use("/api/items", require("./routes/itemRoutes"));
    app.use("/api/calls", require("./routes/call.routes"));
    app.use("/api/security", require("./routes/security.routes"));
    app.use("/api/admin-mgmt", require("./routes/adminManagementRoutes"));

    // New feature routes
    app.use("/api/chatbot", require("./routes/chatbotRoutes"));
    app.use("/api/nft", require("./routes/nftRoutes"));
    app.use("/api/whatsapp", require("./routes/whatsappRoutes"));
    app.use("/api/user-reports", require("./routes/userReport.routes"));

    // ================================================================
    // GLOBAL ERROR HANDLER (No stack trace leaks)
    // ================================================================
    app.use((err, req, res, next) => {
        console.error("⛔ [SERVER ERROR]:", err);

        const status = err.status || 500;
        const isProduction = process.env.NODE_ENV === 'production';

        res.status(status).json({
            message: isProduction ? "Internal server error." : (err.message || "Internal Server Error"),
            error: true,
            ...(isProduction ? {} : { path: req.path })
        });
    });

    // ================================================================
    // HTTP SERVER + SOCKET.IO
    // ================================================================
    const PORT = process.env.PORT || 5000;
    const server = require('http').createServer(app);
    const io = require('socket.io')(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Socket.io state
    const users = {}; // map userId -> socketId
    const busyUsers = new Set();
    const { Expo } = require('expo-server-sdk');
    const User = require('./models/User');
    const expo = new Expo();

    app.set('io', io);
    app.set('users', users);

    /**
     * Send push notification to a user
     */
    const sendPush = async (userId, title, body, data = {}) => {
        try {
            const user = await User.findById(userId);
            if (user && Expo.isExpoPushToken(user.pushToken)) {
                await expo.sendPushNotificationsAsync([{
                    to: user.pushToken,
                    title,
                    body,
                    sound: 'default',
                    data: { type: data.type || 'notification', ...data },
                }]);
                console.log(`[PUSH] Sent to ${userId}`);
            }
        } catch (e) {
            console.error("[PUSH ERROR]", e.message);
        }
    };

    app.set('sendPush', sendPush);

    // ================================================================
    // SOCKET.IO EVENT HANDLERS
    // ================================================================
    io.on('connection', (socket) => {
        socket.on('join', (userId) => {
            if (!userId) return;
            users[userId] = socket.id;
            socket.userId = userId;
            socket.join(userId); // Join a room named after userId for targeted events
            console.log(`User ${userId} joined with socket ${socket.id}`);
        });

        // ---- Call Signaling ----
        socket.on('call-user', async ({ to, offer, from, name }) => {
            if (busyUsers.has(to)) {
                socket.emit('call-rejected', { message: "User is currently busy." });
                return;
            }

            const socketId = users[to];
            console.log(`[CALL] Call from ${from} (${name}) to ${to}. Target Socket: ${socketId}`);
            busyUsers.add(from);

            if (socketId) {
                busyUsers.add(to);
                io.to(socketId).emit('incoming-call', { from, offer, name });
            } else {
                console.log(`[CALL] Target user ${to} not connected. Sending Push...`);
                sendPush(to, "Incoming Audio Call", `${name} is calling you...`, { type: 'call', senderId: from });
            }
        });

        socket.on('answer-call', ({ to, answer }) => {
            const socketId = users[to];
            if (socketId) {
                io.to(socketId).emit('call-answered', { answer });
            }
        });

        socket.on('ice-candidate', ({ to, candidate }) => {
            const socketId = users[to];
            if (socketId) io.to(socketId).emit('ice-candidate', { candidate });
        });

        socket.on('end-call', ({ to }) => {
            const socketId = users[to];
            if (socketId) io.to(socketId).emit('call-ended');
            if (socket.userId) busyUsers.delete(socket.userId);
            busyUsers.delete(to);
        });

        socket.on('reject-call', ({ to }) => {
            const socketId = users[to];
            if (socketId) io.to(socketId).emit('call-rejected');
            if (socket.userId) busyUsers.delete(socket.userId);
            busyUsers.delete(to);
        });

        // ---- Cleanup on disconnect ----
        socket.on('disconnect', () => {
            const userId = socket.userId;
            if (userId) {
                delete users[userId];
                busyUsers.delete(userId);
            }
            // Fallback cleanup
            for (let id in users) {
                if (users[id] === socket.id) {
                    delete users[id];
                    busyUsers.delete(id);
                    break;
                }
            }
        });
    });

    // ================================================================
    // START SERVER (Local Only)
    // ================================================================
    if (require.main === module) {
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`\n🚀 Lost & Found Campus Backend`);
            console.log(`   Worker ${process.pid} running on http://localhost:${PORT}`);
            console.log(`   Mode: ${isClusterMode ? '💎 CLUSTER ENABLED' : '🔌 SINGLE PROCESS'}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
        });

    }

    // Export for Vercel
    module.exports = app;
}
