const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid login credentials');
    }
    
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  res.json(req.user);
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['profile'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get potential matches
router.get('/matches/potential', auth, async (req, res) => {
  try {
    const { preferences } = req.user.profile;
    const query = {
      _id: { $ne: req.user._id },
      _id: { $nin: [...req.user.likes, ...req.user.dislikes] },
      'profile.gender': { $in: preferences.gender },
      'profile.location': {
        $near: {
          $geometry: req.user.profile.location,
          $maxDistance: preferences.distance * 1000 // Convert to meters
        }
      }
    };

    const potentialMatches = await User.find(query).limit(20);
    res.json(potentialMatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like a user
router.post('/like/:userId', auth, async (req, res) => {
  try {
    const likedUser = await User.findById(req.params.userId);
    if (!likedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user.likes.push(likedUser._id);
    await req.user.save();

    // Check if it's a match
    if (likedUser.likes.includes(req.user._id)) {
      req.user.matches.push(likedUser._id);
      likedUser.matches.push(req.user._id);
      await Promise.all([req.user.save(), likedUser.save()]);
      return res.json({ match: true, user: likedUser });
    }

    res.json({ match: false });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dislike a user
router.post('/dislike/:userId', auth, async (req, res) => {
  try {
    const dislikedUser = await User.findById(req.params.userId);
    if (!dislikedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user.dislikes.push(dislikedUser._id);
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;