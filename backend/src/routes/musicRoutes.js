const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");

const Music = require("../models/Music");
const Playlist = require("../models/Playlist");
const Favorite = require("../models/Favorite");

const router = express.Router();

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
const authMiddleware = (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
};

// ============================================
// CLOUDINARY CONFIG
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============================================
// UPLOAD CONFIG
// ============================================
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ============================================
// TEMP DIRS
// ============================================
const tempDir = path.join(__dirname, "../../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ============================================
// LISTAR MUSICAS
// ============================================
router.get("/musicas", authMiddleware, async (req, res) => {
  try {
    const musicas = await Music.find({ userEmail: req.user.email }).sort({ createdAt: -1 });

    res.json({
      dados: musicas.map((m) => ({
        id: m._id.toString(),
        titulo: m.titulo,
        artista: m.artista,
        url: m.url,
        capa: m.capa || "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music",
        fonte: m.fonte || "local",
        duracao: m.duracao,
        videoId: m.videoId
      }))
    });
  } catch (error) {
    console.error("Erro listar musicas:", error);
    res.json({ dados: [] });
  }
});

// ============================================
// UPLOAD MUSIC
// ============================================
router.post("/upload", authMiddleware, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const nome = req.file.originalname.toLowerCase();
    const allowedFormats = [".mp3", ".wav", ".ogg", ".m4a"];

    if (!allowedFormats.some(format => nome.endsWith(format))) {
      return res.status(400).json({ error: "Formato não suportado. Use MP3, WAV, OGG ou M4A" });
    }

    const titulo = req.body.titulo || req.file.originalname.replace(/\.[^/.]+$/, "");
    const artista = req.body.artista || "Artista Desconhecido";

    const resultado = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "moises_music",
          format: "mp3"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const nova = await Music.create({
      userEmail: req.user.email,
      titulo,
      artista,
      url: resultado.secure_url,
      cloudinaryId: resultado.public_id,
      capa: req.body.capa || "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music",
      fonte: "upload"
    });

    res.json({
      success: true,
      musica: {
        id: nova._id.toString(),
        titulo: nova.titulo,
        artista: nova.artista,
        url: nova.url,
        capa: nova.capa,
        fonte: "upload"
      }
    });
  } catch (err) {
    console.error("Erro upload:", err);
    res.status(500).json({ error: err.message || "Erro ao subir música" });
  }
});

// ============================================
// EDITAR MUSICA
// ============================================
router.put("/musicas/:id", authMiddleware, async (req, res) => {
  try {
    const { titulo, artista } = req.body;
    if (!titulo && !artista) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    const updateData = {};
    if (titulo) updateData.titulo = titulo;
    if (artista) updateData.artista = artista;

    const result = await Music.updateOne(
      { _id: req.params.id, userEmail: req.user.email },
      updateData
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Música não encontrada" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erro editar música:", error);
    res.status(500).json({ error: "Erro ao editar música" });
  }
});

// ============================================
// EXCLUIR MUSICA
// ============================================
router.delete("/musicas/:id", authMiddleware, async (req, res) => {
  try {
    const musica = await Music.findOne({
      _id: req.params.id,
      userEmail: req.user.email
    });

    if (!musica) {
      return res.status(404).json({ error: "Música não encontrada" });
    }

    if (musica.cloudinaryId) {
      await cloudinary.uploader.destroy(musica.cloudinaryId, { resource_type: "video" });
    }

    await Music.deleteOne({ _id: musica._id });

    await Playlist.updateMany(
      { userEmail: req.user.email },
      { $pull: { musicas: { id: musica._id.toString() } } }
    );

    await Favorite.updateOne(
      { userEmail: req.user.email },
      { $pull: { musicas: { id: musica._id.toString() } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Erro excluir música:", err);
    res.status(500).json({ error: "Erro ao excluir música" });
  }
});

// ============================================
// PLAYLISTS
// ============================================
router.get("/playlists", authMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userEmail: req.user.email });
    const obj = {};
    playlists.forEach((p) => {
      obj[p.nome] = p.musicas;
    });
    res.json(obj);
  } catch (error) {
    console.error("Erro listar playlists:", error);
    res.json({});
  }
});

router.post("/playlists/:nome", authMiddleware, async (req, res) => {
  try {
    const nome = req.params.nome;
    const existe = await Playlist.findOne({ userEmail: req.user.email, nome });

    if (!existe) {
      await Playlist.create({ userEmail: req.user.email, nome, musicas: [] });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erro criar playlist:", error);
    res.status(500).json({ error: "Erro ao criar playlist" });
  }
});

router.delete("/playlists/:nome", authMiddleware, async (req, res) => {
  try {
    await Playlist.deleteOne({ userEmail: req.user.email, nome: req.params.nome });
    res.json({ success: true });
  } catch (error) {
    console.error("Erro deletar playlist:", error);
    res.status(500).json({ error: "Erro ao deletar playlist" });
  }
});

router.post("/playlists/:nome/add", authMiddleware, async (req, res) => {
  try {
    const musica = req.body;
    if (!musica || !musica.id) {
      return res.status(400).json({ error: "Música inválida" });
    }

    await Playlist.updateOne(
      { userEmail: req.user.email, nome: req.params.nome },
      { $addToSet: { musicas: musica } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Erro adicionar à playlist:", error);
    res.status(500).json({ error: "Erro ao adicionar música" });
  }
});

router.post("/playlists/:nome/remove", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID obrigatório" });

    await Playlist.updateOne(
      { userEmail: req.user.email, nome: req.params.nome },
      { $pull: { musicas: { id } } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Erro remover da playlist:", error);
    res.status(500).json({ error: "Erro ao remover música" });
  }
});

// ============================================
// FAVORITOS
// ============================================
router.get("/favoritos", authMiddleware, async (req, res) => {
  try {
    let fav = await Favorite.findOne({ userEmail: req.user.email });
    if (!fav) {
      fav = await Favorite.create({ userEmail: req.user.email, musicas: [] });
    }
    res.json(fav.musicas);
  } catch (error) {
    console.error("Erro listar favoritos:", error);
    res.json([]);
  }
});

router.post("/favoritos/add", authMiddleware, async (req, res) => {
  try {
    const musica = req.body;
    if (!musica || !musica.id) {
      return res.status(400).json({ error: "Música inválida" });
    }

    await Favorite.updateOne(
      { userEmail: req.user.email },
      { $addToSet: { musicas: musica } },
      { upsert: true }
    );

    const fav = await Favorite.findOne({ userEmail: req.user.email });
    res.json(fav.musicas);
  } catch (error) {
    console.error("Erro adicionar favorito:", error);
    res.status(500).json({ error: "Erro ao adicionar favorito" });
  }
});

router.post("/favoritos/remove", authMiddleware, async (req, res) => {
  try {
    const musica = req.body;
    if (!musica || !musica.id) {
      return res.status(400).json({ error: "Música inválida" });
    }

    await Favorite.updateOne(
      { userEmail: req.user.email },
      { $pull: { musicas: { id: musica.id } } }
    );

    const fav = await Favorite.findOne({ userEmail: req.user.email });
    res.json(fav?.musicas || []);
  } catch (error) {
    console.error("Erro remover favorito:", error);
    res.status(500).json({ error: "Erro ao remover favorito" });
  }
});

// ============================================
// YOUTUBE SEARCH
// ============================================
router.get("/buscar-youtube", async (req, res) => {
  const query = req.query.q;
  const pageToken = req.query.pageToken || "";

  if (!query) {
    return res.json({ dados: [], nextPageToken: null });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    console.error("❌ YOUTUBE_API_KEY não configurada!");
    return res.json({ 
      dados: [], 
      nextPageToken: null,
      error: "API key não configurada" 
    });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(
      query + " music"
    )}&key=${process.env.YOUTUBE_API_KEY}&pageToken=${pageToken}`;

    console.log("🔍 Buscando YouTube:", query);
    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (dados.error) {
      console.error("❌ Erro YouTube API:", dados.error);
      return res.json({ 
        dados: [], 
        nextPageToken: null,
        error: dados.error.message 
      });
    }

    const musicas = dados.items.map((item) => ({
      id: `yt_${item.id.videoId}`,
      titulo: item.snippet.title,
      artista: item.snippet.channelTitle,
      videoId: item.id.videoId,
      capa: item.snippet.thumbnails.medium.url,
      fonte: "youtube"
    }));

    res.json({
      dados: musicas,
      nextPageToken: dados.nextPageToken || null
    });
  } catch (error) {
    console.error("❌ Erro na busca:", error);
    res.json({ dados: [], nextPageToken: null, error: error.message });
  }
});

// ============================================
// CONVERTER YOUTUBE -> MP3
// ============================================
router.post("/converter-youtube", authMiddleware, async (req, res) => {
  const { videoId, titulo } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "ID do vídeo é obrigatório" });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(url);

    const tituloMusica = titulo || info.videoDetails.title;
    const nomeArtista = info.videoDetails.author.name;
    const duracao = info.videoDetails.lengthSeconds;
    const capaUrl = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url ||
      info.videoDetails.thumbnails[0]?.url ||
      "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music";

    const nomeArquivo = `${Date.now()}_${videoId}.mp3`;
    const caminhoTemp = path.join(tempDir, nomeArquivo);

    const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
    const writeStream = fs.createWriteStream(caminhoTemp);
    stream.pipe(writeStream);

    writeStream.on("finish", async () => {
      try {
        const resultado = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              folder: "moises_music",
              public_id: `audio_${Date.now()}`,
              format: "mp3"
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          fs.createReadStream(caminhoTemp).pipe(uploadStream);
        });

        fs.unlinkSync(caminhoTemp);

        const novaMusica = await Music.create({
          userEmail: req.user.email,
          titulo: tituloMusica,
          artista: nomeArtista,
          url: resultado.secure_url,
          cloudinaryId: resultado.public_id,
          capa: capaUrl,
          duracao: duracao,
          fonte: "youtube",
          videoId: videoId
        });

        await Favorite.updateOne(
          { userEmail: req.user.email },
          {
            $addToSet: {
              musicas: {
                id: novaMusica._id.toString(),
                titulo: novaMusica.titulo,
                artista: novaMusica.artista,
                url: novaMusica.url,
                capa: novaMusica.capa,
                fonte: "local"
              }
            }
          },
          { upsert: true }
        );

        res.json({
          success: true,
          musica: {
            id: novaMusica._id.toString(),
            titulo: novaMusica.titulo,
            artista: novaMusica.artista,
            url: novaMusica.url,
            capa: novaMusica.capa,
            fonte: "local"
          },
          mensagem: "✅ Música convertida e adicionada aos favoritos!"
        });
      } catch (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
        res.status(500).json({ error: "Erro ao fazer upload do áudio" });
      }
    });

    writeStream.on("error", (error) => {
      console.error("❌ Erro ao baixar:", error);
      if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
      res.status(500).json({ error: "Erro ao baixar áudio" });
    });
  } catch (error) {
    console.error("❌ Erro na conversão:", error);
    res.status(500).json({ error: "Erro ao converter música" });
  }
});

module.exports = router;