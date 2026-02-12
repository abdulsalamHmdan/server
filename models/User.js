const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true},
  reff: { type: String, required: true, unique: true },
  mgm3: { type: String },
  phone:{ type: String, required: true, unique: true },
});

module.exports = mongoose.model('User', UserSchema);