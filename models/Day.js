const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // سيخزن التاريخ كـ "1", "2", ... "30"
  img: String,
  text: String,
  boxGoal: Number,
  payGoal: Number,
  goals: [{
    goal: String,
    label: String
  }]
});

module.exports = mongoose.model('Day', daySchema);