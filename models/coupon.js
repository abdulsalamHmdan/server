const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  from: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // تأكد أن اسم موديل المستخدم هو 'User'
    default: null,
  },
  ExchangeDate: {
    type: String,
    default: null,
  },
  status: {
    type: Number,
    default: 0,
    enum: [0, 1], // 0: جديد، 1: مصروف
  },
});

// منع تكرار الكود لنفس الجهة
couponSchema.index({ code: 1, from: 1 }, { unique: true });

module.exports = mongoose.model("Coupon", couponSchema);
