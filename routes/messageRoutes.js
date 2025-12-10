import express from 'express';
import { sendMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { validate, messageValidation } from '../middleware/validator.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', validate(messageValidation), sendMessage);

export default router;




