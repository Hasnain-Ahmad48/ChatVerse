import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Upload image to Cloudinary
 * @route   POST /api/upload/image
 * @access  Private
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing:', {
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      });
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.',
      });
    }

    // Upload buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    if (!result || !result.secure_url) {
      console.error('Cloudinary upload failed: Invalid response', result);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Cloudinary. The upload completed but no URL was returned.',
      });
    }

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload image. Please check your Cloudinary configuration.';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.http_code) {
      errorMessage = `Cloudinary API error (${error.http_code}): ${error.message || 'Unknown error'}`;
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

