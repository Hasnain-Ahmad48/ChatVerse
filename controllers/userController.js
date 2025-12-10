import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

/**
 * @desc    Search users
 * @route   GET /api/users/search?q=searchterm
 * @access  Private
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: { users: [] },
      });
    }

    // Search users by name or email (excluding current user)
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name email avatar isOnline lastSeen')
      .limit(20);

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user list with last message preview
 * @route   GET /api/users/chats
 * @access  Private
 */
export const getUserChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Find all chats where current user is a participant
    const chats = await Chat.find({
      participants: currentUserId,
    })
      .populate('participants', 'name email avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format response to include other user info and last message
    const formattedChats = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );

      return {
        _id: chat._id,
        user: {
          _id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          avatar: otherUser.avatar,
          isOnline: otherUser.isOnline,
          lastSeen: otherUser.lastSeen,
        },
        lastMessage: chat.lastMessage
          ? {
              _id: chat.lastMessage._id,
              text: chat.lastMessage.text,
              mediaURL: chat.lastMessage.mediaURL,
              senderId: chat.lastMessage.senderId,
              status: chat.lastMessage.status,
              createdAt: chat.lastMessage.createdAt,
            }
          : null,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: 0, // Can be calculated separately if needed
      };
    });

    res.json({
      success: true,
      data: { chats: formattedChats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:userId
 * @access  Private
 */
export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'name email avatar isOnline lastSeen'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('name email avatar isOnline lastSeen');

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};




