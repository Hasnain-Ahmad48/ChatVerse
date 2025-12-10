import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { chatId, receiverId, text, mediaURL, mediaType } = req.body;
    const senderId = req.user._id;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === senderId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send message in this chat',
      });
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId,
      receiverId,
      text: text || '',
      mediaURL: mediaURL || '',
      mediaType: mediaType || '',
      status: 'sent',
    });

    // Populate sender info
    await message.populate('senderId', 'name avatar');

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};




