const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

function toClient(entry) {
  return { id: entry.id, ml: entry.ml, time: entry.timeLabel };
}

router.get('/:date', async (req, res, next) => {
  try {
    const entries = await prisma.waterLogEntry.findMany({
      where: { userId: req.user.id, logDate: req.params.date },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, entries: entries.map(toClient) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { date, ml, time } = req.body;
    if (!date || !ml) throw new AppError('بيانات الماء ناقصة.', 400);
    const entry = await prisma.waterLogEntry.create({
      data: {
        userId: req.user.id,
        logDate: date,
        ml: parseInt(ml, 10),
        timeLabel: time || '',
      },
    });
    res.status(201).json({ success: true, entry: toClient(entry) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.waterLogEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) throw new AppError('السجل غير موجود.', 404);
    await prisma.waterLogEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
