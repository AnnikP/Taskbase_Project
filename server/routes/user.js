const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const List    = require('../models/List');
const Task    = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

// GET /api/user/profile
// Returns: userId, username, phone, email, totalLists, totalTasks
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const [totalLists, totalTasks] = await Promise.all([
      List.countDocuments({ owner: user._id }),
      Task.countDocuments({ owner: user._id })
    ]);

    return res.json({
      userId:     user._id,
      username:   user.username,
      email:      user.email,
      phone:      user.phone || '—',
      totalLists,
      totalTasks
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Server error fetching profile.' });
  }
});

// PATCH /api/user/profile  — update phone / email
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const allowed = {};
    if (req.body.phone !== undefined)  allowed.phone = req.body.phone;
    if (req.body.email !== undefined)  allowed.email = req.body.email;

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: allowed },
      { new: true, runValidators: true }
    ).select('-password');

    return res.json({ message: 'Profile updated.', user });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

module.exports = router;