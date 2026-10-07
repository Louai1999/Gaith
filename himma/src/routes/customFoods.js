const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const foods = await prisma.customFood.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      success: true,
      foods: foods.map((f) => ({
        n: f.name,
        c: f.calories,
        p: f.protein,
        cb: f.carbs,
        f: f.fat,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, calories, protein, carbs, fat } = req.body;
    if (!name || calories == null) throw new AppError('أدخل اسم الصنف والسعرات.', 400);
    await prisma.customFood.create({
      data: {
        userId: req.user.id,
        name,
        calories: parseFloat(calories),
        protein: parseFloat(protein || 0),
        carbs: parseFloat(carbs || 0),
        fat: parseFloat(fat || 0),
      },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
