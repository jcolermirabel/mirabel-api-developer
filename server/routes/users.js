const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

// Get all users (admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find({}, '-password').populate('roles');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID (user can get their own info, or admin can get any)
router.get('/:id', async (req, res) => {
  try {
    if (req.user.userId !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await User.findById(req.params.id, '-password').populate('roles');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { email, password, firstName, lastName, roles } = req.body;
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      roles
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user (user can update their own info, or admin can update any)
router.put('/:id', async (req, res) => {
  try {
    if (req.user.userId !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { email, firstName, lastName, roles, isActive } = req.body;
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.roles = roles || user.roles;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router; 