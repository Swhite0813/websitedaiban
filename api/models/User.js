const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nickname: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

// 验证码临时存储（生产环境建议使用Redis）
const verificationCodes = new Map();

userSchema.statics.storeVerificationCode = function(phone, code) {
  verificationCodes.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟过期
  });
};

userSchema.statics.verifyCode = function(phone, code) {
  const record = verificationCodes.get(phone);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    verificationCodes.delete(phone);
    return false;
  }
  const isValid = record.code === code;
  if (isValid) {
    verificationCodes.delete(phone);
  }
  return isValid;
};

module.exports = mongoose.model('User', userSchema);
