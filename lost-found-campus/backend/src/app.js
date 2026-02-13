const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');

// Number of CPU cores available
const numCPUs = os.cpus().length;

// For development, we might not want clustering to avoid log spam/debugging issues.
// But for "load balancing concept", we default to clustering.
// Set CLUSTER_MODE=false to disable clustering.
const isClusterMode = false;

if (isClusterMode && cluster.isMaster) {
    console.log(`Master ${process.pid} is running with ${numCPUs} CPU cores`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    const app = express();

    // Connect to Database (Each worker has its own connection pool)
    connectDB();

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: false,
    }));

    // Compression (Gzip)
    app.use(compression());

    // Rate Limiter: 1000 requests per 15 minutes per IP
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: "Too many requests, please try again later."
    });
    app.use(limiter);

    app.use((req, res, next) => {
        console.log(`[REQ] ${req.method} ${req.url}`);
        next();
    });
    app.use(cors());
    app.use(express.json({ limit: "20mb" }));
    app.use(express.urlencoded({ extended: true, limit: "20mb" }));
    app.use('/uploads', cors(), express.static('uploads'));

    // Routes
    app.use("/api/lost", require("./routes/lost.routes"));
    app.use("/api/found", require("./routes/found.routes"));
    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/chat", require("./routes/chatRoutes"));
    app.use("/api/claims", require("./routes/claimRoutes"));
    app.use("/api/notifications", require("./routes/notification.routes"));
    app.use("/api/reports", require("./routes/report.routes"));
    app.use("/api/admin-mgmt", require("./routes/adminManagementRoutes"));
    app.use("/api/calls", require("./routes/call.routes"));
    const securityRoutes = require('./routes/security.routes');
    app.use('/api/security', securityRoutes);

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error("⛔ [SERVER ERROR]:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    });

    const PORT = process.env.PORT || 5000;
    const server = require('http').createServer(app);
    const io = require('socket.io')(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Socket.io Signaling for Calling
    // Socket.io Signaling for Calling
    const users = {}; // map userId -> socketId
    const busyUsers = new Set(); // Set of userIds currently in a call
    const { Expo } = require('expo-server-sdk');
    const User = require('./models/User');
    const expo = new Expo();

    app.set('io', io);
    app.set('users', users);

    const sendPush = async (userId, title, body) => {
        try {
            const user = await User.findById(userId);
            if (user && Expo.isExpoPushToken(user.pushToken)) {
                await expo.sendPushNotificationsAsync([{
                    to: user.pushToken,
                    title: title,
                    body: body,
                    sound: 'default',
                    data: { type: 'call', senderId: userId }, // data for navigation/handling
                }]);
                console.log(`[PUSH] Sent to ${userId}`);
            }
        } catch (e) {
            console.error("[PUSH ERROR]", e);
        }
    };

    io.on('connection', (socket) => {
        socket.on('join', (userId) => {
            users[userId] = socket.id;
            // Also map socket.id back to userId for easy cleanup?
            socket.userId = userId;
            console.log(`User ${userId} joined with socket ${socket.id}`);
        });

        socket.on('call-user', async ({ to, offer, from, name }) => {
            if (busyUsers.has(to)) {
                socket.emit('call-rejected', { message: "User is currently busy." }); // Or custom event
                return;
            }

            const socketId = users[to];
            console.log(`[CALL] Call from ${from} (${name}) to ${to}. Target Socket: ${socketId}`);

            // Mark caller as busy? Ideally yes.
            busyUsers.add(from);

            if (socketId) {
                busyUsers.add(to);
                io.to(socketId).emit('incoming-call', { from, offer, name });
            } else {
                console.log(`[CALL] Target user ${to} not connected. Sending Push...`);
                // socket.emit('call-failed', { message: 'User is offline' }); // DISABLED
                // Send Push Notification
                sendPush(to, "Incoming Audio Call", `${name} is calling you...`);
            }
        });

        socket.on('answer-call', ({ to, answer }) => {
            const socketId = users[to];
            if (socketId) {
                // 'to' here is the Caller (since Callee answers TO Caller)
                // Caller is already busy. Callee (sender of answer) is also busy.
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

            // Clean up busy state
            // 'to' is the other party. 'socket.userId' is this party.
            if (socket.userId) busyUsers.delete(socket.userId);
            busyUsers.delete(to);
        });

        socket.on('reject-call', ({ to }) => {
            const socketId = users[to];
            if (socketId) io.to(socketId).emit('call-rejected');

            if (socket.userId) busyUsers.delete(socket.userId);
            busyUsers.delete(to);
        });

        socket.on('disconnect', () => {
            const userId = socket.userId;
            if (userId) {
                delete users[userId];
                busyUsers.delete(userId);
            }
            // Fallback cleanup if socket.userId wasn't set (e.g. strict legacy)
            // ... existing loop ...
            for (let id in users) {
                if (users[id] === socket.id) {
                    delete users[id];
                    busyUsers.delete(id);
                    break;
                }
            }
        });
    });

    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Worker ${process.pid} running on http://localhost:${PORT}`);
    });
}
