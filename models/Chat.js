import mongoose from 'mongoose';

/**
 * Chat Model
 * Represents a 1-to-1 conversation between two users
 * Stores participants and metadata
 */
const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

/**
 * Static method to find or create a chat between two users
 * Ensures only one chat exists between any two users
 */
chatSchema.statics.findOrCreateChat = async function (user1Id, user2Id) {
  let chat = await this.findOne({
    participants: { $all: [user1Id, user2Id] },
  }).populate('participants', 'name email avatar isOnline lastSeen');

  if (!chat) {
    chat = await this.create({
      participants: [user1Id, user2Id],
    });
    chat = await this.findById(chat._id).populate(
      'participants',
      'name email avatar isOnline lastSeen'
    );
  }

  return chat;
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;




