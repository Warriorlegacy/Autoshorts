import { Response, Request } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import * as oauthController from '../../controllers/oauthController';
import * as db from '../../config/db';

// Mock database and fetch
jest.mock('../../config/db');
global.fetch = jest.fn();

describe('OAuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let redirectMock: jest.Mock;

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
    } as any;

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

      await oauthController.youtubeCallback(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization code is required',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.query = { code: 'auth-code', state: 'state123' };
      (mockReq as any).session = { userId: undefined };

      await oauthController.youtubeCallback(mockReq as Request, mockRes as Response);

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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockUserResponse);

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await oauthController.youtubeCallback(mockReq as Request, mockRes as Response);

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/settings')
      );
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('platform=youtube')
      );
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('connected=true')
      );
    });

    it('should handle token exchange failure', async () => {
      mockReq.query = { code: 'auth-code', state: 'state123' };

      const mockTokenResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error_description: 'Invalid authorization code',
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockTokenResponse);

      await oauthController.youtubeCallback(mockReq as Request, mockRes as Response);

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('connected=false')
      );
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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockUserResponse);

      await oauthController.youtubeCallback(mockReq as Request, mockRes as Response);

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('connected=false')
      );
    });
  });

  describe('instagramCallback', () => {
    it('should return 400 when authorization code is missing', async () => {
      mockReq.query = { state: 'state123' };

      await oauthController.instagramCallback(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.query = { code: 'auth-code', state: 'state123' };
      (mockReq as any).session = { userId: undefined };

      await oauthController.instagramCallback(mockReq as Request, mockRes as Response);

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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockUserResponse);

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await oauthController.instagramCallback(mockReq as Request, mockRes as Response);

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/settings')
      );
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('platform=instagram')
      );
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('connected=true')
      );
    });

    it('should handle Instagram token exchange failure', async () => {
      mockReq.query = { code: 'auth-code', state: 'state123' };

      const mockTokenResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error_description: 'Invalid code',
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockTokenResponse);

      await oauthController.instagramCallback(mockReq as Request, mockRes as Response);

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('connected=false')
      );
    });
  });

  describe('disconnectAccount', () => {
    let authReq: Partial<AuthRequest>;

    beforeEach(() => {
      authReq = {
        user: { id: 'user123', email: 'test@example.com' },
        params: { platform: 'youtube' },
      };
    });

    it('should return 401 when user is not authenticated', async () => {
      authReq.user = undefined;

      await oauthController.disconnectAccount(authReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid platform', async () => {
      authReq.params = { platform: 'invalid-platform' };

      await oauthController.disconnectAccount(authReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid platform',
      });
    });

    it('should successfully disconnect YouTube account', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await oauthController.disconnectAccount(authReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'youtube account disconnected successfully',
      });
    });

    it('should successfully disconnect Instagram account', async () => {
      authReq.params = { platform: 'instagram' };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await oauthController.disconnectAccount(authReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'instagram account disconnected successfully',
      });
    });

    it('should handle database error when disconnecting', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await oauthController.disconnectAccount(authReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to disconnect account',
        })
      );
    });
  });
});
