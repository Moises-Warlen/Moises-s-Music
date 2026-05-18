const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  nome: { type: String, required: true },
  musicas: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Índice composto para evitar playlists duplicadas
PlaylistSchema.index({ userEmail: 1, nome: 1 }, { unique: true });

module.exports = mongoose.model("Playlist", PlaylistSchema);