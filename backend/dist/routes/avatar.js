"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const avatarController_1 = require("../controllers/avatarController");
const router = (0, express_1.Router)();
// All avatar routes require authentication
router.use(authMiddleware_1.authMiddleware);
// Generate avatar video (with provided avatar image)
router.post('/generate', avatarController_1.generateAvatarVideo);
// Generate text-to-avatar video (AI-generated avatar from text)
router.post('/text-to-avatar', avatarController_1.generateTextToAvatar);
// Check generation status
router.get('/status/:requestId', avatarController_1.getAvatarStatus);
// Get generated video URL
router.get('/result/:requestId', avatarController_1.getAvatarResult);
exports.default = router;
//# sourceMappingURL=avatar.js.map