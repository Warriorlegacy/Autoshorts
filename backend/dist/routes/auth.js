"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const authMiddleware_1 = require("../middleware/authMiddleware");
const config_1 = require("../constants/config");
const oauthController_1 = require("../controllers/oauthController");
const router = express_1.default.Router();
// Helper to generate unique ID
const generateId = () => {
    return crypto_1.default.randomUUID();
};
// Helper to hash password
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(10);
    return bcryptjs_1.default.hash(password, salt);
};
// Helper to compare password
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
// Register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }
        // Check if user already exists
        const existingUser = await (0, db_1.query)('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }
        // Hash password
        const hashedPassword = await hashPassword(password);
        // Create user with hashed password
        const userId = generateId();
        const result = await (0, db_1.query)('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?) RETURNING id, email, name, credits_remaining, subscription_tier', [userId, email, hashedPassword, name || email.split('@')[0]]);
        const user = result.rows[0];
        if (!config_1.JWT_CONFIG.SECRET) {
            return res.status(500).json({ message: 'Server configuration error.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.JWT_CONFIG.SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            user,
            token
        });
    }
    catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'User registration failed.', error: err.message });
    }
});
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        // Find user by email
        const result = await (0, db_1.query)('SELECT id, email, password_hash, name, credits_remaining, subscription_tier FROM users WHERE email = ?', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        const userRecord = result.rows[0];
        // Verify password
        const passwordMatch = await comparePassword(password, userRecord.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        // Return user without password hash
        const user = {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            credits_remaining: userRecord.credits_remaining,
            subscription_tier: userRecord.subscription_tier
        };
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.JWT_CONFIG.SECRET, { expiresIn: '7d' });
        res.status(200).json({
            success: true,
            user,
            token
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed.', error: err.message });
    }
});
// Get current user
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        const result = await (0, db_1.query)('SELECT id, email, name, credits_remaining, subscription_tier FROM users WHERE id = ?', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = result.rows[0];
        res.status(200).json({
            success: true,
            user
        });
    }
    catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ message: 'Failed to fetch user data.', error: err.message });
    }
});
// Get connected accounts
router.get('/connected-accounts', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const result = await (0, db_1.query)(`SELECT id, platform, platform_user_id, platform_username, is_active, created_at, updated_at
       FROM connected_accounts 
       WHERE user_id = ? AND is_active = 1`, [userId]);
        const connectedAccounts = result.rows.map((account) => ({
            id: account.id,
            platform: account.platform,
            username: account.platform_username,
            userId: account.platform_user_id,
            connectedAt: account.created_at,
            updatedAt: account.updated_at,
        }));
        res.status(200).json({
            success: true,
            connectedAccounts,
        });
    }
    catch (error) {
        console.error('Get connected accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch connected accounts',
            error: error.message,
        });
    }
});
// Logout
router.post('/logout', (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
});
// OAuth Callbacks
router.get('/callback/youtube', oauthController_1.youtubeCallback);
router.get('/callback/instagram', oauthController_1.instagramCallback);
// Disconnect social account
router.delete('/account/:platform', authMiddleware_1.authMiddleware, oauthController_1.disconnectAccount);
exports.default = router;
//# sourceMappingURL=auth.js.map