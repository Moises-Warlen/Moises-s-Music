const mongoose = require("mongoose");

const FavoriteSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },

    musicas: [
      {
        id: String,
        titulo: String,
        artista: String,
        url: String,
        capa: String,
        fonte: String,
        videoId: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Favorite || mongoose.model("Favorite", FavoriteSchema);