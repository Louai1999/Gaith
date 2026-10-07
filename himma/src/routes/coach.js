const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const messages = await prisma.coachMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });
    res.json({
      success: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
