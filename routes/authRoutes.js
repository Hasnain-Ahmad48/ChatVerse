import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate, registerValidation, loginValidation } from '../middleware/validator.js';

const router = express.Router();

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;




