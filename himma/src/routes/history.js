const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/days', async (req, res, next) => {
  try {
    const grouped = await prisma.foodLogEntry.groupBy({
      by: ['logDate'],
      where: { userId: req.user.id },
      _count: { id: true },
      _sum: { calories: true },
      orderBy: { logDate: 'desc' },
    });

    const days = await Promise.all(
      grouped.map(async (g) => {
        const water = await prisma.waterLogEntry.aggregate({
          where: { userId: req.user.id, logDate: g.logDate },
          _sum: { ml: true },
        });
        return {
          date: g.logDate,
          itemCount: g._count.id,
          totalCalories: g._sum.calories || 0,
          waterMl: water._sum.ml || 0,
        };
      })
    );

    res.json({ success: true, days });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
