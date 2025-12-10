import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * @desc    Get or create a chat with a user
 * @route   GET /api/chats/:userId
 * @access  Private
 */
export const getOrCreateChat = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    if (currentUserId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself',
      });
    }

    // Check if other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(currentUserId, userId);

    res.json({
      success: true,
      data: { chat },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get messages for a chat with pagination
 * @route   GET /api/chats/:chatId/messages?page=1&limit=20
 * @access  Private
 */
export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify user is participant in chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat',
      });
    }

    // Get messages (latest first, then reverse for display)
    const messages = await Message.find({ chatId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();

    // Get total count for pagination
    const total = await Message.countDocuments({ chatId });

    res.json({
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chats/:chatId/messages/read
 * @access  Private
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        chatId,
        receiverId: currentUserId,
        status: { $in: ['sent', 'delivered'] },
      },
      {
        $set: {
          status: 'read',
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};




