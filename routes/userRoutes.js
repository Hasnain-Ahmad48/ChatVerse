import express from 'express';
import {
  searchUsers,
  getUserChats,
  getUserById,
  updateProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/chats', getUserChats);
router.get('/:userId', getUserById);
router.put('/profile', updateProfile);

export default router;




