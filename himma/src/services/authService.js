const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');

async function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcryptRounds);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function registerUser({ username, displayName, password }) {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) {
    throw new AppError('أدخل اسم مستخدم وكلمة مرور.', 400);
  }
  if (password.length < 6) {
    throw new AppError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 400);
  }
  const existing = await prisma.user.findUnique({ where: { username: normalized } });
  if (existing) {
    throw new AppError('اسم المستخدم موجود مسبقاً.', 409);
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username: normalized,
      displayName: displayName.trim() || normalized,
      passwordHash,
    },
    select: { id: true, username: true, displayName: true },
  });
  const token = signToken(user.id);
  return { user, token };
}

async function loginUser({ username, password }) {
  const normalized = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username: normalized } });
  if (!user) {
    throw new AppError('ما فيه حساب بهذا الاسم.', 401);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError('كلمة المرور غير صحيحة.', 401);
  }
  const token = signToken(user.id);
  return {
    user: { id: user.id, username: user.username, displayName: user.displayName },
    token,
  };
}

module.exports = {
  registerUser,
  loginUser,
  signToken,
};
