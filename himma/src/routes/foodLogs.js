const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

function toClient(entry) {
  return {
    id: entry.id,
    meal: entry.meal,
    name: entry.name,
    grams: entry.grams,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
  };
}

router.get('/:date', async (req, res, next) => {
  try {
    const entries = await prisma.foodLogEntry.findMany({
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
    const { date, meal, name, grams, calories, protein, carbs, fat } = req.body;
    if (!date || !meal || !name) {
      throw new AppError('بيانات الوجبة ناقصة.', 400);
    }
    const entry = await prisma.foodLogEntry.create({
      data: {
        userId: req.user.id,
        logDate: date,
        meal,
        name,
        grams: parseFloat(grams),
        calories: parseInt(calories, 10),
        protein: parseFloat(protein || 0),
        carbs: parseFloat(carbs || 0),
        fat: parseFloat(fat || 0),
      },
    });
    res.status(201).json({ success: true, entry: toClient(entry) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.foodLogEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) throw new AppError('السجل غير موجود.', 404);
    await prisma.foodLogEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
