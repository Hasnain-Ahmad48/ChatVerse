import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';

/**
 * Cloudinary Configuration
 * Sets up Cloudinary for image uploads
 * Configures multer for handling file uploads
 */

// Function to configure Cloudinary (lazy initialization)
let isConfigured = false;

const configureCloudinary = () => {
  if (isConfigured) return;
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    isConfigured = true;
  }
};

// Get environment variables (will be read when function is called, not at module load)
const getCloudinaryConfig = () => {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
};

// Memory storage for multer (we'll upload to Cloudinary after)
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * Upload buffer to Cloudinary
 * Helper function to upload file buffer to Cloudinary
 */
export const uploadToCloudinary = (buffer, folder = 'chat-app') => {
  return new Promise((resolve, reject) => {
    // Configure Cloudinary if not already configured
    configureCloudinary();
    
    // Get current configuration
    const config = getCloudinaryConfig();
    
    // Verify Cloudinary is configured
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'));
    }

    if (!buffer || buffer.length === 0) {
      return reject(new Error('Empty buffer provided for upload'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Handle stream errors
    uploadStream.on('error', (error) => {
      console.error('Upload stream error:', error);
      reject(error);
    });

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

export default cloudinary;

