const mongoose = require("mongoose");

const FavoriteSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true, index: true },
  musicas: { type: Array, default: [] }
});

module.exports = mongoose.model("Favorite", FavoriteSchema);