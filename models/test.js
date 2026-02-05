// // models/Exam.js
// const mongoose = require("mongoose");

// const examSchema = new mongoose.Schema(
//   {
//     payment: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "payment",
//       required: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "user",
//       required: true,
//     },
//     type: { type: String},
//     stat: { type: String, default: "new",enum: ["new", "inprogress", "done"] },
//     hidden: {
//       type: Boolean,
//       default: false,
//     },
//     result: {
//       type: Object,
//       default: null,
//     },
//     short: {
//       type: Object,
//       default: null,
//     },
//     rate: {
//       type: Object,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("exam", examSchema);
