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
Object.defineProperty(exports, "__esModule", { value: true });
const oauthController = __importStar(require("../../controllers/oauthController"));
const db = __importStar(require("../../config/db"));
// Mock database and fetch
jest.mock('../../config/db');
global.fetch = jest.fn();
describe('OAuthController', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    let redirectMock;
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        redirectMock = jest.fn().mockReturnThis();
        mockRes = {
            status: statusMock,
            json: jsonMock,
            redirect: redirectMock,
        };
        mockReq = {
            query: {},
            params: {},
            session: { userId: 'user123' },
        };
        // Set environment variables
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
        process.env.INSTAGRAM_APP_ID = 'test-app-id';
        process.env.INSTAGRAM_APP_SECRET = 'test-app-secret';
        process.env.BACKEND_URL = 'http://localhost:3001';
        process.env.FRONTEND_URL = 'http://localhost:3000';
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('youtubeCallback', () => {
        it('should return 400 when authorization code is missing', async () => {
            mockReq.query = { state: 'state123' };
            await oauthController.youtubeCallback(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Authorization code is required',
            });
        });
        it('should return 401 when user is not authenticated', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            mockReq.session = { userId: undefined };
            await oauthController.youtubeCallback(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should successfully handle YouTube OAuth callback', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            const mockTokenResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'youtube-token',
                    refresh_token: 'refresh-token',
                    expires_in: 3600,
                }),
            };
            const mockUserResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    id: 'UCtest123',
                    snippet: { title: 'Test Channel' },
                }),
            };
            global.fetch
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(mockUserResponse);
            db.query.mockResolvedValueOnce({ rows: [] });
            await oauthController.youtubeCallback(mockReq, mockRes);
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/settings'));
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('platform=youtube'));
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('connected=true'));
        });
        it('should handle token exchange failure', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            const mockTokenResponse = {
                ok: false,
                json: jest.fn().mockResolvedValue({
                    error_description: 'Invalid authorization code',
                }),
            };
            global.fetch.mockResolvedValueOnce(mockTokenResponse);
            await oauthController.youtubeCallback(mockReq, mockRes);
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('connected=false'));
        });
        it('should handle user fetch failure', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            const mockTokenResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'youtube-token',
                    expires_in: 3600,
                }),
            };
            const mockUserResponse = {
                ok: false,
            };
            global.fetch
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(mockUserResponse);
            await oauthController.youtubeCallback(mockReq, mockRes);
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('connected=false'));
        });
    });
    describe('instagramCallback', () => {
        it('should return 400 when authorization code is missing', async () => {
            mockReq.query = { state: 'state123' };
            await oauthController.instagramCallback(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
        it('should return 401 when user is not authenticated', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            mockReq.session = { userId: undefined };
            await oauthController.instagramCallback(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should successfully handle Instagram OAuth callback', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            const mockTokenResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'instagram-token',
                    user_id: 'ig123',
                    token_type: 'bearer',
                }),
            };
            const mockUserResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    id: 'ig123',
                    username: 'testuser',
                }),
            };
            global.fetch
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(mockUserResponse);
            db.query.mockResolvedValueOnce({ rows: [] });
            await oauthController.instagramCallback(mockReq, mockRes);
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/settings'));
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('platform=instagram'));
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('connected=true'));
        });
        it('should handle Instagram token exchange failure', async () => {
            mockReq.query = { code: 'auth-code', state: 'state123' };
            const mockTokenResponse = {
                ok: false,
                json: jest.fn().mockResolvedValue({
                    error_description: 'Invalid code',
                }),
            };
            global.fetch.mockResolvedValueOnce(mockTokenResponse);
            await oauthController.instagramCallback(mockReq, mockRes);
            expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining('connected=false'));
        });
    });
    describe('disconnectAccount', () => {
        let authReq;
        beforeEach(() => {
            authReq = {
                user: { id: 'user123', email: 'test@example.com' },
                params: { platform: 'youtube' },
            };
        });
        it('should return 401 when user is not authenticated', async () => {
            authReq.user = undefined;
            await oauthController.disconnectAccount(authReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return 400 for invalid platform', async () => {
            authReq.params = { platform: 'invalid-platform' };
            await oauthController.disconnectAccount(authReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid platform',
            });
        });
        it('should successfully disconnect YouTube account', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            await oauthController.disconnectAccount(authReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'youtube account disconnected successfully',
            });
        });
        it('should successfully disconnect Instagram account', async () => {
            authReq.params = { platform: 'instagram' };
            db.query.mockResolvedValueOnce({ rows: [] });
            await oauthController.disconnectAccount(authReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'instagram account disconnected successfully',
            });
        });
        it('should handle database error when disconnecting', async () => {
            db.query.mockRejectedValueOnce(new Error('Database error'));
            await oauthController.disconnectAccount(authReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Failed to disconnect account',
            }));
        });
    });
});
//# sourceMappingURL=oauthController.test.js.map