import { query, testConnection, initDB } from './config/db';
import { RenderingService, VideoScene } from './services/renderingService';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive Test Script for Remotion Video Rendering
 * Tests the end-to-end video rendering pipeline
 */

interface TestResult {
  success: boolean;
  stage: string;
  duration?: number;
  error?: string;
  videoId?: string;
  outputPath?: string;
}

class VideoRenderingTest {
  private renderingService: RenderingService;
  private testVideoId: string | null = null;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.renderingService = new RenderingService();
  }

  /**
   * Log with timestamp
   */
  private log(message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void {
    const timestamp = new Date().toISOString();
    const icons = {
      info: 'ℹ️',
      error: '❌',
      success: '✅',
      warning: '⚠️',
    };
    console.log(`[${timestamp}] ${icons[type]} ${message}`);
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 1: Initializing database connection...');

    try {
      await testConnection();
      await initDB();

      const duration = Date.now() - stageStart;
      this.log(`Database initialized successfully (${duration}ms)`, 'success');

      return {
        success: true,
        stage: 'database_init',
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Database initialization failed: ${errorMessage}`, 'error');

      return {
        success: false,
        stage: 'database_init',
        error: errorMessage,
      };
    }
  }

  /**
   * Create test user and test video data with 3 scenes
   */
  async createTestVideo(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 2: Creating test user and video in database...');

    try {
      // Create test user first
      const testUserId = 'test-user-' + Date.now();
      const testUserEmail = `test-${Date.now()}@example.com`;
      
      // Insert test user into database
      const userResult = await query(
        `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
        [
          testUserId,
          testUserEmail,
          '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // test password hash
        ]
      );

      // Create 3 test scenes with realistic data
      const testScenes: VideoScene[] = [
        {
          id: 'scene-1',
          narration: 'Welcome to the future of content creation! AutoShorts helps you create engaging videos in minutes.',
          textOverlay: 'Create Amazing Content',
          duration: 10,
          background: {
            type: 'gradient',
            source: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          },
        },
        {
          id: 'scene-2',
          narration: 'Our AI-powered system generates scripts, voiceovers, and visuals automatically. Just choose your niche!',
          textOverlay: 'AI-Powered Videos',
          duration: 12,
          background: {
            type: 'gradient',
            source: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          },
        },
        {
          id: 'scene-3',
          narration: 'Start creating viral content today. Join thousands of creators who trust AutoShorts for their short videos.',
          textOverlay: 'Get Started Now',
          duration: 8,
          background: {
            type: 'gradient',
            source: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          },
        },
      ];

      const totalDuration = testScenes.reduce((sum, scene) => sum + scene.duration, 0);

      // Generate a proper UUID for the test video
      const testVideoUUID = crypto.randomUUID();
      
      // Insert test video into database with explicit UUID
      const result = await query(
        `INSERT INTO videos (id, user_id, title, caption, niche, language, duration, visual_style, status, scenes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testVideoUUID,
          testUserId,
          'Test Video - AutoShorts Demo',
          'Experience the power of AI video generation with AutoShorts. #AI #ContentCreation #Video',
          'Technology',
          'en',
          totalDuration,
          'modern',
          'pending',
          JSON.stringify(testScenes),
          JSON.stringify({
            testRun: true,
            createdAt: new Date().toISOString(),
            sceneCount: testScenes.length,
          }),
        ]
      );

      this.testVideoId = testVideoUUID;
      const duration = Date.now() - stageStart;

      this.log(`Test user created with ID: ${testUserId}`, 'success');
      this.log(`Test video created with ID: ${this.testVideoId}`, 'success');
      this.log(`  - Total duration: ${totalDuration}s`);
      this.log(`  - Scenes: ${testScenes.length}`);
      this.log(`  - Estimated file size: ~${Math.round(totalDuration * 0.5)}MB`);

      return {
        success: true,
        stage: 'create_video',
        duration,
        videoId: this.testVideoId || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to create test video: ${errorMessage}`, 'error');

      return {
        success: false,
        stage: 'create_video',
        error: errorMessage,
      };
    }
  }

  /**
   * Render the test video
   */
  async renderTestVideo(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 3: Rendering test video...');

    try {
      if (!this.testVideoId) {
        throw new Error('No test video ID available - create video first');
      }

      this.log(`Starting render for video ${this.testVideoId}...`);
      this.log('  - This may take 30-120 seconds depending on video length');
      this.log('  - Remotion will bundle and render the composition');

      await this.renderingService.renderVideo(this.testVideoId);

      const duration = Date.now() - stageStart;
      this.log(`Video rendered successfully (${duration}ms)`, 'success');

      return {
        success: true,
        stage: 'render_video',
        duration,
        videoId: this.testVideoId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Video rendering failed: ${errorMessage}`, 'error');

      return {
        success: false,
        stage: 'render_video',
        error: errorMessage,
        videoId: this.testVideoId || undefined,
      };
    }
  }

  /**
   * Verify the output file was created
   */
  async verifyOutput(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 4: Verifying output file...');

    try {
      if (!this.testVideoId) {
        throw new Error('No test video ID available');
      }

      const outputPath = path.join(process.cwd(), 'public', 'renders', `${this.testVideoId}.mp4`);

      // Check if file exists
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Output file not found: ${outputPath}`);
      }

      // Get file stats
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Verify file has content
      if (stats.size === 0) {
        throw new Error('Output file exists but is empty (0 bytes)');
      }

      const duration = Date.now() - stageStart;
      this.log(`Output file verified successfully (${duration}ms)`, 'success');
      this.log(`  - Path: ${outputPath}`);
      this.log(`  - Size: ${fileSizeMB} MB`);
      this.log(`  - Created: ${stats.mtime.toISOString()}`);

      return {
        success: true,
        stage: 'verify_output',
        duration,
        videoId: this.testVideoId,
        outputPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Output verification failed: ${errorMessage}`, 'error');

      return {
        success: false,
        stage: 'verify_output',
        error: errorMessage,
        videoId: this.testVideoId || undefined,
      };
    }
  }

  /**
   * Check video status in database
   */
  async checkVideoStatus(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 5: Checking video status in database...');

    try {
      if (!this.testVideoId) {
        throw new Error('No test video ID available');
      }

      const result = await query(
        'SELECT id, status, video_url, thumbnail_url, updated_at FROM videos WHERE id = ?',
        [this.testVideoId]
      );

      if (result.rows.length === 0) {
        throw new Error('Video record not found in database');
      }

      const video = result.rows[0];
      const duration = Date.now() - stageStart;

      this.log(`Video status checked (${duration}ms)`, 'success');
      this.log(`  - Status: ${video.status}`);
      this.log(`  - Video URL: ${video.video_url || 'N/A'}`);
      this.log(`  - Thumbnail URL: ${video.thumbnail_url || 'N/A'}`);
      this.log(`  - Last Updated: ${video.updated_at}`);

      // Verify status is completed
      if (video.status !== 'completed') {
        this.log(`Warning: Video status is '${video.status}', expected 'completed'`, 'warning');
      }

      return {
        success: video.status === 'completed',
        stage: 'check_status',
        duration,
        videoId: this.testVideoId || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Status check failed: ${errorMessage}`, 'error');

      return {
        success: false,
        stage: 'check_status',
        error: errorMessage,
        videoId: this.testVideoId || undefined,
      };
    }
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<TestResult> {
    const stageStart = Date.now();
    this.log('Stage 6: Cleaning up test data...');

    try {
      // Delete test video from database
      if (this.testVideoId) {
        await query('DELETE FROM videos WHERE id = ?', [this.testVideoId]);
        this.log(`Deleted test video record: ${this.testVideoId}`);

        // Delete output file
        const outputPath = path.join(process.cwd(), 'public', 'renders', `${this.testVideoId}.mp4`);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          this.log(`Deleted output file: ${outputPath}`);
        }
      }

      const duration = Date.now() - stageStart;
      this.log(`Cleanup completed (${duration}ms)`, 'success');

      return {
        success: true,
        stage: 'cleanup',
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Cleanup failed: ${errorMessage}`, 'warning');

      // Don't fail the test if cleanup fails
      return {
        success: true,
        stage: 'cleanup',
        duration: Date.now() - stageStart,
      };
    }
  }

  /**
   * Run the complete test suite
   */
  async run(): Promise<void> {
    this.startTime = Date.now();
    this.log('========================================', 'info');
    this.log('VIDEO RENDERING END-TO-END TEST', 'info');
    this.log('========================================', 'info');
    this.log('');

    // Stage 1: Initialize database
    const dbResult = await this.initializeDatabase();
    this.results.push(dbResult);

    if (!dbResult.success) {
      this.log('Aborting test - database initialization failed', 'error');
      await this.printSummary();
      process.exit(1);
    }

    // Stage 2: Create test video
    const createResult = await this.createTestVideo();
    this.results.push(createResult);

    if (!createResult.success) {
      this.log('Aborting test - video creation failed', 'error');
      await this.printSummary();
      process.exit(1);
    }

    // Stage 3: Render video
    const renderResult = await this.renderTestVideo();
    this.results.push(renderResult);

    if (!renderResult.success) {
      this.log('Test failed - video rendering failed', 'error');
      await this.printSummary();
      await this.cleanup();
      process.exit(1);
    }

    // Stage 4: Verify output
    const verifyResult = await this.verifyOutput();
    this.results.push(verifyResult);

    if (!verifyResult.success) {
      this.log('Test failed - output verification failed', 'error');
      await this.printSummary();
      await this.cleanup();
      process.exit(1);
    }

    // Stage 5: Check database status
    const statusResult = await this.checkVideoStatus();
    this.results.push(statusResult);

    // Stage 6: Cleanup (optional - can be disabled for debugging)
    const shouldCleanup = process.env.KEEP_TEST_VIDEO !== 'true';
    if (shouldCleanup) {
      await this.cleanup();
    } else {
      this.log('Skipping cleanup (KEEP_TEST_VIDEO=true)', 'info');
    }

    // Print final summary
    await this.printSummary();

    // Exit with appropriate code
    const allPassed = this.results.every((r) => r.success);
    process.exit(allPassed ? 0 : 1);
  }

  /**
   * Print test summary
   */
  async printSummary(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;

    this.log('');
    this.log('========================================', 'info');
    this.log('TEST SUMMARY', 'info');
    this.log('========================================', 'info');

    this.results.forEach((result) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'PASSED' : 'FAILED';
      const duration = result.duration ? `(${result.duration}ms)` : '';

      console.log(`${icon} ${result.stage.toUpperCase()}: ${status} ${duration}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.outputPath) {
        console.log(`   Output: ${result.outputPath}`);
      }
    });

    this.log('');
    const allPassed = this.results.every((r) => r.success);
    if (allPassed) {
      this.log(`All tests PASSED! Total duration: ${totalDuration}ms`, 'success');
    } else {
      this.log(`Some tests FAILED! Total duration: ${totalDuration}ms`, 'error');
    }

    if (this.testVideoId) {
      this.log(`Test Video ID: ${this.testVideoId}`, 'info');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const test = new VideoRenderingTest();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⚠️ Test interrupted by user');
    await test.cleanup();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('\n⚠️ Test terminated');
    await test.cleanup();
    process.exit(1);
  });

  // Run the test
  test.run().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { VideoRenderingTest };
