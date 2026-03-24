const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
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

// 验证码临时存储
const verificationCodes = new Map();

userSchema.statics.storeVerificationCode = function(email, code) {
  verificationCodes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
};

userSchema.statics.verifyCode = function(email, code) {
  const key = email.toLowerCase();
  const record = verificationCodes.get(key);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    verificationCodes.delete(key);
    return false;
  }
  const isValid = record.code === code;
  if (isValid) verificationCodes.delete(key);
  return isValid;
};

module.exports = mongoose.model('User', userSchema);
