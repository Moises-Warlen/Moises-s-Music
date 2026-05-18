const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema({
  userEmail: String,
  nome: String,
  musicas: Array
});

module.exports = mongoose.model("Playlist", PlaylistSchema);