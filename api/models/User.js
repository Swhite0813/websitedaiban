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
  },
  verificationCode: {
    type: String,
    default: null
  },
  verificationCodeExpires: {
    type: Date,
    default: null
  }
});

// 验证码存储到MongoDB，支持多实例部署
userSchema.statics.storeVerificationCode = async function(email, code) {
  await this.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        verificationCode: code,
        verificationCodeExpires: new Date(Date.now() + 5 * 60 * 1000)
      }
    },
    { upsert: true, new: true }
  );
};

userSchema.statics.verifyCode = async function(email, code) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user || !user.verificationCode) return false;
  if (new Date() > user.verificationCodeExpires) {
    await this.updateOne({ email: email.toLowerCase() }, { $unset: { verificationCode: 1, verificationCodeExpires: 1 } });
    return false;
  }
  const isValid = user.verificationCode === code;
  if (isValid) {
    await this.updateOne({ email: email.toLowerCase() }, { $unset: { verificationCode: 1, verificationCodeExpires: 1 } });
  }
  return isValid;
};

module.exports = mongoose.model('User', userSchema);
