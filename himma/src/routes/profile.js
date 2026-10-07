const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { gender, age, height, weight, activity, goal, targetWeight } = req.body;
    if (!age || !height || !weight) {
      throw new AppError('من فضلك عبّي العمر والطول والوزن.', 400);
    }
    const data = {
      gender,
      age: parseFloat(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      activity: parseFloat(activity),
      goal,
      targetWeight: targetWeight != null && targetWeight !== '' ? parseFloat(targetWeight) : null,
    };
    const profile = await prisma.profile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...data },
      update: data,
    });
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
