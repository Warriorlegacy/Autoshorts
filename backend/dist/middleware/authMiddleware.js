"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../constants/config");
// Validate JWT_SECRET is set before using middleware
if (!config_1.JWT_CONFIG.SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable not set. Cannot initialize authentication middleware.');
}
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token missing or invalid.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_CONFIG.SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
exports.authMiddleware = authMiddleware;
// Also export as authenticateToken for backwards compatibility
exports.authenticateToken = exports.authMiddleware;
//# sourceMappingURL=authMiddleware.js.map