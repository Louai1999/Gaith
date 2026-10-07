const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.waterReminderSettings.findUnique({
      where: { userId: req.user.id },
    });
    res.json({
      success: true,
      settings: settings
        ? { enabled: settings.enabled, interval: settings.interval }
        : { enabled: false, interval: 2 },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { enabled, interval } = req.body;
    const settings = await prisma.waterReminderSettings.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        enabled: !!enabled,
        interval: parseInt(interval, 10) || 2,
      },
      update: {
        enabled: !!enabled,
        interval: parseInt(interval, 10) || 2,
      },
    });
    res.json({
      success: true,
      settings: { enabled: settings.enabled, interval: settings.interval },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
