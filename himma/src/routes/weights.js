const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const weights = await prisma.weightEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { logDate: 'asc' },
    });
    res.json({
      success: true,
      weights: weights.map((w) => ({ date: w.logDate, weight: w.weight })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { date, weight } = req.body;
    if (!date || weight == null) throw new AppError('أدخل وزن وتاريخ صحيحين.', 400);
    const w = parseFloat(weight);
    await prisma.weightEntry.upsert({
      where: { userId_logDate: { userId: req.user.id, logDate: date } },
      create: { userId: req.user.id, logDate: date, weight: w },
      update: { weight: w },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
