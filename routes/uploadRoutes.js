import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }
  if (err) {
    // Handle fileFilter errors and other multer-related errors
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }
  next();
};

// Wrap multer middleware to catch errors
const uploadMiddleware = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

router.post('/image', uploadMiddleware, uploadImage);

export default router;




