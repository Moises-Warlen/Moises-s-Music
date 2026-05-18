const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: String,
  email: { type: String, required: true, unique: true },
  nome: String,
  foto: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);