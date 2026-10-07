const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./lib/logger');
const prisma = require('./lib/prisma');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const foodLogRoutes = require('./routes/foodLogs');
const waterLogRoutes = require('./routes/waterLogs');
const weightRoutes = require('./routes/weights');
const customFoodRoutes = require('./routes/customFoods');
const coachRoutes = require('./routes/coach');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const historyRoutes = require('./routes/history');

const app = express();

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    hsts: config.nodeEnv === 'production',
  })
);

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'طلبات كثيرة، حاول لاحقاً.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'محاولات دخول كثيرة، انتظر قليلاً.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/food-logs', foodLogRoutes);
app.use('/api/water-logs', waterLogRoutes);
app.use('/api/weights', weightRoutes);
app.use('/api/custom-foods', customFoodRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/settings/water-reminder', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/history', historyRoutes);

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, { index: 'index.html' }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      logger.info(`هِمّة server running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    logger.error({ message: 'Failed to start server', error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();

module.exports = app;
