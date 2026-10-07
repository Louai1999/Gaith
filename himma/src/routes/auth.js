const express = require('express');
const { registerUser, loginUser } = require('../services/authService');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, displayName, password } = req.body;
    const result = await registerUser({ username, displayName, password });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await loginUser({ username, password });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
