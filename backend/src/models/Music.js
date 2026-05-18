const mongoose = require("mongoose");

const MusicSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  titulo: { type: String, required: true },
  artista: { type: String, required: true },
  url: { type: String, required: true },
  cloudinaryId: { type: String },
  capa: { type: String, default: "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music" },
  duracao: { type: Number, default: 0 },
  fonte: { type: String, default: "local" },
  videoId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Music", MusicSchema);