const mongoose = require("mongoose");

const MusicSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  titulo: { type: String, required: true },
  artista: { type: String, default: "Moises Music" },
  url: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  capa: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Music", MusicSchema);