"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const videos_1 = __importStar(require("./routes/videos"));
const tts_1 = __importDefault(require("./routes/tts"));
const images_1 = __importDefault(require("./routes/images"));
const youtube_1 = __importDefault(require("./routes/youtube"));
const instagram_1 = __importDefault(require("./routes/instagram"));
const topic_1 = __importDefault(require("./routes/topic"));
const social_1 = __importDefault(require("./routes/social"));
const db_1 = require("./config/db");
const errorHandler_1 = require("./middleware/errorHandler");
const responseFormatter_1 = require("./middleware/responseFormatter");
const rateLimiter_1 = require("./middleware/rateLimiter");
const config_1 = require("./constants/config");
const fs_1 = require("fs");
const autoPostScheduler_1 = __importDefault(require("./services/autoPostScheduler"));
const videoPollingService_1 = require("./services/videoPollingService");
// Validate configuration at startup
config_1.CONFIG.validate();
const app = (0, express_1.default)();
const PORT = config_1.CONFIG.SERVER.PORT;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express_1.default.urlencoded({ extended: true }));
app.use(responseFormatter_1.responseFormatter);
app.use(rateLimiter_1.generalLimiter);
// Serve static files
app.use('/renders', express_1.default.static(path_1.default.join(__dirname, '..', 'public', 'renders')));
app.use('/images', express_1.default.static(path_1.default.join(__dirname, '..', 'public', 'images')));
// Ensure images directory exists
const imagesDir = path_1.default.join(__dirname, '..', 'public', 'images');
fs_1.promises.access(imagesDir).catch(() => {
    fs_1.promises.mkdir(imagesDir, { recursive: true });
});
app.use('/api/auth', rateLimiter_1.authLimiter, auth_1.default);
app.use('/api/videos', videos_1.default);
app.use('/api/queue', videos_1.queueRoutes);
app.use('/api/tts', rateLimiter_1.ttsLimiter, tts_1.default);
app.use('/api/images', rateLimiter_1.imageLimiter, images_1.default);
app.use('/api/youtube', youtube_1.default);
app.use('/api/instagram', instagram_1.default);
app.use('/api/topic', topic_1.default);
app.use('/api/social', social_1.default);
// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        res.status(200).json({
            status: 'ok',
            message: 'Backend is running.',
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({
            status: 'error',
            message: 'Backend error.'
        });
    }
});
// Root endpoint
app.get('/', (req, res) => {
    const frontendPath = path_1.default.join(__dirname, '..', 'public', 'frontend');
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// Serve frontend in production
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public', 'frontend')));
// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
    const frontendPath = path_1.default.join(__dirname, '..', 'public', 'frontend');
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// 404 Not Found handler (register before error handler)
app.use(errorHandler_1.notFoundHandler);
// Global error handling middleware (MUST be last)
app.use(errorHandler_1.errorHandler);
// Start server with database connection test
const startServer = async () => {
    try {
        await (0, db_1.testConnection)();
        app.listen(PORT, () => {
            console.log(`✓ Server is running on http://localhost:${PORT}`);
            autoPostScheduler_1.default.start();
            (0, videoPollingService_1.startVideoPollingService)();
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map