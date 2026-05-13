const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  foto: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);