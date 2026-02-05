import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/authMiddleware';
import { JWT_CONFIG } from '../constants/config';
import { youtubeCallback, instagramCallback, disconnectAccount } from '../controllers/oauthController';

const router = express.Router();

// Helper to generate unique ID
const generateId = (): string => {
  return crypto.randomUUID();
};

// Helper to hash password
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Helper to compare password
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Register
router.post('/register', async (req: Request, res: Response) => {
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
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with hashed password
    const userId = generateId();
    const result = await query(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?) RETURNING id, email, name, credits_remaining, subscription_tier',
      [userId, email, hashedPassword, name || email.split('@')[0]]
    );

    const user = result.rows[0];
    if (!JWT_CONFIG.SECRET) {
      return res.status(500).json({ message: 'Server configuration error.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_CONFIG.SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      success: true,
      user, 
      token 
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'User registration failed.', error: err.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, password_hash, name, credits_remaining, subscription_tier FROM users WHERE email = ?',
      [email]
    );
    
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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_CONFIG.SECRET as string, { expiresIn: '7d' });

    res.status(200).json({ 
      success: true,
      user, 
      token 
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const result = await query(
      'SELECT id, email, name, credits_remaining, subscription_tier FROM users WHERE id = ?',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = result.rows[0];
    res.status(200).json({
      success: true,
      user
    });
  } catch (err: any) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Failed to fetch user data.', error: err.message });
  }
});

// Get connected accounts
router.get('/connected-accounts', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await query(
      `SELECT id, platform, platform_user_id, platform_username, is_active, created_at, updated_at
       FROM connected_accounts 
       WHERE user_id = ? AND is_active = 1`,
      [userId]
    );

    const connectedAccounts = result.rows.map((account: any) => ({
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
  } catch (error: any) {
    console.error('Get connected accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected accounts',
      error: error.message,
    });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// OAuth Callbacks
router.get('/callback/youtube', youtubeCallback);
router.get('/callback/instagram', instagramCallback);

// Disconnect social account
router.delete('/account/:platform', authMiddleware, disconnectAccount);

export default router;
