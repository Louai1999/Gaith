const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('يجب تسجيل الدخول أولاً.', 401);
    }
    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new AppError('انتهت صلاحية الجلسة، سجّل دخولك مرة أخرى.', 401);
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, displayName: true },
    });
    if (!user) {
      throw new AppError('الحساب غير موجود.', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
