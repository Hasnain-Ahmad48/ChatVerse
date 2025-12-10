import mongoose from 'mongoose';

/**
 * Message Model
 * Stores individual messages in a chat
 * Includes text, media, status, and timestamps
 */
const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    mediaURL: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['', 'image', 'video', 'file'],
      default: '',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

/**
 * Instance method to mark message as delivered
 */
messageSchema.methods.markAsDelivered = function () {
  if (this.status === 'sent') {
    this.status = 'delivered';
  }
  return this.save();
};

/**
 * Instance method to mark message as read
 */
messageSchema.methods.markAsRead = function () {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

export default Message;




