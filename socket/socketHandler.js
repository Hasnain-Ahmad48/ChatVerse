import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

/**
 * Socket.io Handler
 * Manages all real-time socket events
 * Handles: messaging, typing indicators, online/offline status, read receipts
 */

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

/**
 * Initialize socket connection
 * Sets up all socket event handlers
 */
export const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`User connected: ${userId} (socket: ${socketId})`);

    // Store user connection
    activeUsers.set(userId, socketId);
    userSockets.set(socketId, userId);

    // Update user online status
    User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    }).catch(console.error);

    // Emit online status to all connected clients
    socket.broadcast.emit('user-online', { userId });

    /**
     * Join user's personal room for direct notifications
     */
    socket.join(`user:${userId}`);

    /**
     * Handle: Send Message
     * Event: 'send-message'
     * Emits: 'new-message' to receiver, 'message-sent' to sender
     */
    socket.on('send-message', async (data) => {
      try {
        const { chatId, receiverId, text, mediaURL, mediaType, clientId } = data;

        // Create message in database
        const message = await Message.create({
          chatId,
          senderId: userId,
          receiverId,
          text: text || '',
          mediaURL: mediaURL || '',
          mediaType: mediaType || '',
          status: 'sent',
        });

        // Populate sender info
        await message.populate('senderId', 'name avatar');
        // Attach clientId (for optimistic UI dedup on client)
        const messageObj = {
          ...message.toObject(),
          ...(clientId ? { clientId } : {}),
        };

        // Update chat's last message
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // Emit to receiver if online (and not the sender)
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId && receiverId !== userId) {
          // Mark as delivered immediately if receiver is online
          message.status = 'delivered';
          await message.save();

          io.to(receiverSocketId).emit('new-message', {
            message: messageObj,
          });
        }

        // Emit confirmation to sender (always, to replace optimistic message)
        socket.emit('message-sent', {
          message: messageObj,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', {
          error: 'Failed to send message',
        });
      }
    });

    /**
     * Handle: Typing Indicator
     * Event: 'typing'
     * Emits: 'user-typing' to receiver
     */
    socket.on('typing', async (data) => {
      try {
        const { chatId, receiverId } = data;
        const receiverSocketId = activeUsers.get(receiverId);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('user-typing', {
            chatId,
            userId,
            isTyping: true,
          });
        }
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    /**
     * Handle: Stop Typing
     * Event: 'stop-typing'
     * Emits: 'user-typing' with isTyping: false to receiver
     */
    socket.on('stop-typing', async (data) => {
      try {
        const { chatId, receiverId } = data;
        const receiverSocketId = activeUsers.get(receiverId);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('user-typing', {
            chatId,
            userId,
            isTyping: false,
          });
        }
      } catch (error) {
        console.error('Error handling stop typing:', error);
      }
    });

    /**
     * Handle: Mark Messages as Read
     * Event: 'mark-read'
     * Updates message status and notifies sender
     */
    socket.on('mark-read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        // Update messages
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            receiverId: userId,
            status: { $in: ['sent', 'delivered'] },
          },
          {
            $set: {
              status: 'read',
              readAt: new Date(),
            },
          }
        );

        // Get chat to find other participant
        const chat = await Chat.findById(chatId);
        if (chat) {
          const otherParticipant = chat.participants.find(
            (p) => p.toString() !== userId
          );

          if (otherParticipant) {
            const senderSocketId = activeUsers.get(
              otherParticipant.toString()
            );
            if (senderSocketId) {
              io.to(senderSocketId).emit('messages-read', {
                chatId,
                messageIds,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    /**
     * Handle: Disconnect
     * Cleanup and update offline status
     */
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId} (socket: ${socketId})`);

      // Remove from active users
      activeUsers.delete(userId);
      userSockets.delete(socketId);

      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      }).catch(console.error);

      // Emit offline status to all connected clients
      socket.broadcast.emit('user-offline', { userId });
    });
  });

  return io;
};

