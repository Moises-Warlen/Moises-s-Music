const mongoose = require("mongoose");

const MusicSchema = new mongoose.Schema({
  userEmail: String,
  titulo: String,
  artista: String,
  url: String,
  cloudinaryId: String,
  capa: String,
  duracao: Number,
  fonte: { type: String, default: "local" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Music", MusicSchema);