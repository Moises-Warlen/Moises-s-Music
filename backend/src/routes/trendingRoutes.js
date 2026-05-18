const express = require("express");
const axios = require("axios");

const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ===============================
// TOP 7 MUSICAS EM ALTA (BRASIL)
// ===============================
router.get("/trending-music", async (req, res) => {
  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,statistics",
        chart: "mostPopular",
        regionCode: "BR",
        maxResults: 15,
        videoCategoryId: "10", // MUSIC
        key: YOUTUBE_API_KEY
      }
    });

    const dados = (response.data.items || []).slice(0, 7).map((video) => ({
      id: video.id,
      titulo: video.snippet.title,
      artista: video.snippet.channelTitle,
      capa: video.snippet.thumbnails.high.url,
      videoId: video.id,
      fonte: "youtube"
    }));

    res.json({ success: true, dados });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Erro ao buscar músicas em alta",
      details: err.message
    });
  }
});

// ===============================
// TOP 7 ARTISTAS POPULARES (BRASIL)
// baseado em videos em alta
// ===============================
router.get("/trending-artists", async (req, res) => {
  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet",
        chart: "mostPopular",
        regionCode: "BR",
        maxResults: 30,
        videoCategoryId: "10",
        key: YOUTUBE_API_KEY
      }
    });

    const items = response.data.items || [];

    // contar canais mais repetidos
    const contador = {};

    for (const v of items) {
      const channelId = v.snippet.channelId;
      const channelTitle = v.snippet.channelTitle;
      const thumb = v.snippet.thumbnails.high.url;

      if (!contador[channelId]) {
        contador[channelId] = {
          id: channelId,
          nome: channelTitle,
          foto: thumb,
          total: 0
        };
      }

      contador[channelId].total += 1;
    }

    const artistas = Object.values(contador)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map((a) => ({
        id: a.id,
        nome: a.nome,
        foto: a.foto
      }));

    res.json({ success: true, dados: artistas });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Erro ao buscar artistas populares",
      details: err.message
    });
  }
});

module.exports = router;