const mongoose = require("mongoose");

const FavoriteSchema = new mongoose.Schema({
  userEmail: String,
  musicas: Array
});

module.exports = mongoose.model("Favorite", FavoriteSchema);