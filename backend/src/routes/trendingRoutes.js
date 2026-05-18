const express = require("express");
const router = express.Router();

// =======================================
// TRENDING MUSIC
// =======================================
router.get("/trending-music", async (req, res) => {
  try {
    res.json({
      success: true,
      dados: [
        {
          id: "1",
          titulo: "Blinding Lights",
          artista: "The Weeknd",
          capa: "https://i.scdn.co/image/ab67616d0000b2730f6c6f7f8e8f2c2b6d9d4f6a",
          fonte: "youtube",
          videoId: "4NRXx6U8ABQ"
        },
        {
          id: "2",
          titulo: "As It Was",
          artista: "Harry Styles",
          capa: "https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14",
          fonte: "youtube",
          videoId: "H5v3kku4y6Q"
        },
        {
          id: "3",
          titulo: "Levitating",
          artista: "Dua Lipa",
          capa: "https://i.scdn.co/image/ab67616d0000b273d4daf28d55fe4197ede848be",
          fonte: "youtube",
          videoId: "TUVcZfQe-Kw"
        },
        {
          id: "4",
          titulo: "Starboy",
          artista: "The Weeknd",
          capa: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452",
          fonte: "youtube",
          videoId: "34Na4j8AVgA"
        },
        {
          id: "5",
          titulo: "Shape of You",
          artista: "Ed Sheeran",
          capa: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
          fonte: "youtube",
          videoId: "JGwWNGJdvx8"
        }
      ]
    });
  } catch (err) {
    console.error("Erro trending-music:", err);
    res.json({ success: false, dados: [] });
  }
});

// =======================================
// TRENDING ARTISTS
// =======================================
router.get("/trending-artists", async (req, res) => {
  try {
    res.json({
      success: true,
      dados: [
        {
          id: "1",
          nome: "The Weeknd",
          foto: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb"
        },
        {
          id: "2",
          nome: "Dua Lipa",
          foto: "https://i.scdn.co/image/ab6761610000e5eb54f8f9d9d2c7f4f58b6e0f4f"
        },
        {
          id: "3",
          nome: "Drake",
          foto: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9"
        },
        {
          id: "4",
          nome: "Harry Styles",
          foto: "https://i.scdn.co/image/ab6761610000e5eb03c9d27b88d8d0b2a4d38f18"
        },
        {
          id: "5",
          nome: "Ed Sheeran",
          foto: "https://i.scdn.co/image/ab6761610000e5eb6a4b0f5f1b5b5c5d5e5f5g5h"
        }
      ]
    });
  } catch (err) {
    console.error("Erro trending-artists:", err);
    res.json({ success: false, dados: [] });
  }
});

module.exports = router;