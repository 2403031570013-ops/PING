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
const isClusterMode = process.env.CLUSTER_MODE !== 'false';

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
    app.use(helmet());

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

    app.use(cors());
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Routes
    app.use("/api/lost", require("./routes/lost.routes"));
    app.use("/api/found", require("./routes/found.routes"));
    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/chat", require("./routes/chatRoutes"));
    app.use("/api/claims", require("./routes/claimRoutes"));
    app.use("/api/notifications", require("./routes/notification.routes"));
    app.use("/api/reports", require("./routes/report.routes"));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Worker ${process.pid} running on http://localhost:${PORT}`);
    });
}
