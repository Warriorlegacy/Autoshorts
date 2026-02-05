"use strict";
/**
 * Response utility for consistent API response formatting
 * Usage: res.sendSuccess(data) or res.sendError(message, statusCode)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseFormatter = void 0;
/**
 * Response formatting middleware
 */
const responseFormatter = (req, res, next) => {
    // Send success response
    res.sendSuccess = function (data, statusCode = 200, message) {
        return this.status(statusCode).json({
            success: true,
            data,
            message,
            timestamp: new Date().toISOString(),
        });
    };
    // Send error response
    res.sendError = function (message, statusCode = 500, code, details) {
        return this.status(statusCode).json({
            success: false,
            error: {
                code: code || 'ERROR',
                message,
                details,
            },
            timestamp: new Date().toISOString(),
        });
    };
    next();
};
exports.responseFormatter = responseFormatter;
exports.default = exports.responseFormatter;
//# sourceMappingURL=responseFormatter.js.map