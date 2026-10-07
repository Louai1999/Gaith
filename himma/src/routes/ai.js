const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { estimateMeal, coachReply } = require('../services/aiService');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.post('/estimate-meal', async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description?.trim()) {
      throw new AppError('اكتب وصف الوجبة أولاً.', 400);
    }
    const parsed = await estimateMeal(description.trim());
    res.json({ success: true, data: parsed });
  } catch (err) {
    if (err instanceof SyntaxError) {
      next(new AppError('تعذّر تحليل رد الذكاء الاصطناعي، حاول مرة أخرى.', 502));
    } else {
      next(err);
    }
  }
});

router.post('/coach', async (req, res, next) => {
  try {
    const { message, contextLines } = req.body;
    if (!message?.trim()) {
      throw new AppError('اكتب رسالتك أولاً.', 400);
    }

    await prisma.coachMessage.create({
      data: { userId: req.user.id, role: 'user', content: message.trim() },
    });

    const history = await prisma.coachMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    const reply = await coachReply({
      contextLines: contextLines || [],
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    await prisma.coachMessage.create({
      data: { userId: req.user.id, role: 'assistant', content: reply },
    });

    res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
