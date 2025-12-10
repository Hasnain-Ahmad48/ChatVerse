import express from 'express';
import {
  getOrCreateChat,
  getMessages,
  markMessagesAsRead,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/:userId', getOrCreateChat);
router.get('/:chatId/messages', getMessages);
router.put('/:chatId/messages/read', markMessagesAsRead);

export default router;




