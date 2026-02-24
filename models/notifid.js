const mongoose = require("mongoose");

const notifidSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
});

module.exports = mongoose.model("notifid", notifidSchema);
