const express = require('express');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all chats for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    }).populate('participants', 'profile.name profile.photos');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific chat by ID
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    }).populate('participants', 'profile.name profile.photos');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new chat
router.post('/', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [req.user._id, participantId] }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    const chat = new Chat({
      participants: [req.user._id, participantId]
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send a message in a chat
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    }).populate('participants', 'profile.name profile.photos');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = {
      sender: req.user._id,
      content: req.body.content
    };

    chat.messages.push(message);
    chat.lastMessage = message._id;
    await chat.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    const messageData = {
      chatId: chat._id,
      message: {
        ...message.toObject(),
        sender: {
          _id: req.user._id,
          profile: {
            name: req.user.profile.name,
            photos: req.user.profile.photos
          }
        }
      }
    };
    
    // Emit to all participants in the chat
    chat.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('newMessage', messageData);
    });

    res.status(201).json(messageData.message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark messages as read
router.patch('/:chatId/read', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Mark all unread messages as read
    chat.messages.forEach(message => {
      if (message.sender.toString() !== req.user._id.toString() && !message.read) {
        message.read = true;
      }
    });

    await chat.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;