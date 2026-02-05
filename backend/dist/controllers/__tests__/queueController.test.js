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
const queueController = __importStar(require("../../controllers/queueController"));
const db = __importStar(require("../../config/db"));
// Mock database
jest.mock('../../config/db');
describe('QueueController', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockReq = {
            user: { id: 'user123', email: 'test@example.com' },
            body: {},
            params: {},
            query: {},
        };
    });
    describe('addToQueue', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { videoId: 'video123' };
            mockReq.body = { platforms: ['youtube'], scheduledAt: '2024-02-01' };
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return 400 when platforms array is empty', async () => {
            mockReq.params = { videoId: 'video123' };
            mockReq.body = { platforms: [], scheduledAt: '2024-02-01' };
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'At least one platform is required',
            }));
        });
        it('should return 400 when scheduledAt is not provided', async () => {
            mockReq.params = { videoId: 'video123' };
            mockReq.body = { platforms: ['youtube'] };
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Scheduled date/time is required',
            }));
        });
        it('should return 404 when video does not exist', async () => {
            mockReq.params = { videoId: 'nonexistent' };
            mockReq.body = { platforms: ['youtube'], scheduledAt: '2024-02-01' };
            db.query.mockResolvedValueOnce({ rows: [] });
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
        it('should return 400 when video is already in queue', async () => {
            mockReq.params = { videoId: 'video123' };
            mockReq.body = { platforms: ['youtube'], scheduledAt: '2024-02-01' };
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'video123' }] }) // Video exists
                .mockResolvedValueOnce({ rows: [{ id: 'queue123' }] }); // Already in queue
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('already in queue'),
            }));
        });
        it('should successfully add video to queue', async () => {
            mockReq.params = { videoId: 'video123' };
            mockReq.body = { platforms: ['youtube', 'instagram'], scheduledAt: '2024-02-01T10:00:00' };
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'video123' }] }) // Video exists
                .mockResolvedValueOnce({ rows: [] }) // Not in queue
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'queue123',
                        video_id: 'video123',
                        scheduled_at: '2024-02-01T10:00:00',
                        platforms: JSON.stringify(['youtube', 'instagram']),
                        status: 'queued',
                        created_at: new Date().toISOString(),
                    },
                ],
            }); // Insert successful
            await queueController.addToQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                queueId: 'queue123',
                message: 'Video added to queue successfully',
            }));
        });
    });
    describe('getQueuedVideos', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;
            await queueController.getQueuedVideos(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return paginated queued videos', async () => {
            mockReq.query = { page: '1', limit: '10' };
            db.query.mockResolvedValue({
                rows: [
                    {
                        id: 'queue1',
                        video_id: 'video1',
                        scheduled_at: '2024-02-01',
                        platforms: JSON.stringify(['youtube']),
                        status: 'queued',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        title: 'Video 1',
                        caption: 'Caption 1',
                        niche: 'tech',
                        duration: 60,
                        visual_style: 'modern',
                        video_url: null,
                        thumbnail_url: null,
                        total: '1',
                    },
                ],
            });
            await queueController.getQueuedVideos(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                queuedVideos: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'queue1',
                        videoId: 'video1',
                    }),
                ]),
                pagination: expect.objectContaining({
                    page: 1,
                    limit: 10,
                    total: 1,
                }),
            }));
        });
        it('should return empty list when no videos queued', async () => {
            mockReq.query = { page: '1', limit: '10' };
            db.query.mockResolvedValue({ rows: [] });
            await queueController.getQueuedVideos(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                queuedVideos: [],
            }));
        });
    });
    describe('removeFromQueue', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { queueId: 'queue123' };
            await queueController.removeFromQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return 404 when queue item not found', async () => {
            mockReq.params = { queueId: 'nonexistent' };
            db.query.mockResolvedValueOnce({ rows: [] });
            await queueController.removeFromQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
        it('should successfully remove video from queue', async () => {
            mockReq.params = { queueId: 'queue123' };
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'queue123' }] }) // Check exists
                .mockResolvedValueOnce({ rows: [] }); // Delete
            await queueController.removeFromQueue(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Video removed from queue successfully',
            });
        });
    });
    describe('updateQueueItem', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { queueId: 'queue123' };
            await queueController.updateQueueItem(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return 404 when queue item not found', async () => {
            mockReq.params = { queueId: 'nonexistent' };
            mockReq.body = { scheduledAt: '2024-02-02' };
            db.query.mockResolvedValueOnce({ rows: [] });
            await queueController.updateQueueItem(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
        it('should return 400 when no update fields provided', async () => {
            mockReq.params = { queueId: 'queue123' };
            mockReq.body = {};
            db.query.mockResolvedValueOnce({ rows: [{ id: 'queue123' }] });
            await queueController.updateQueueItem(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'No fields to update',
            }));
        });
        it('should successfully update queue item with new scheduled date', async () => {
            mockReq.params = { queueId: 'queue123' };
            mockReq.body = { scheduledAt: '2024-02-02T15:00:00' };
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'queue123' }] }) // Check exists
                .mockResolvedValueOnce({ rows: [] }); // Update query
            await queueController.updateQueueItem(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Queue item updated successfully',
            });
        });
        it('should successfully update queue item with new platforms', async () => {
            mockReq.params = { queueId: 'queue123' };
            mockReq.body = { platforms: ['youtube', 'instagram', 'tiktok'] };
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'queue123' }] }) // Check exists
                .mockResolvedValueOnce({ rows: [] }); // Update query
            await queueController.updateQueueItem(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Queue item updated successfully',
            });
        });
    });
});
//# sourceMappingURL=queueController.test.js.map