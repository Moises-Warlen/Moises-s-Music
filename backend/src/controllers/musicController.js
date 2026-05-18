const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");

const Music = require("../models/Music");
const Playlist = require("../models/Playlist");
const Favorite = require("../models/Favorite");

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
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// TEMP DIRS
// ============================================
const tempDir = path.join(__dirname, "../../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ============================================
// LISTAR MUSICAS
// ============================================
async function listarMusicas(req, res) {
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
        duracao: m.duracao
      }))
    });
  } catch {
    res.json({ dados: [] });
  }
}

// ============================================
// UPLOAD MUSIC
// ============================================
async function uploadMusica(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const nome = req.file.originalname.toLowerCase();

    if (!nome.endsWith(".mp3") && !nome.endsWith(".wav") && !nome.endsWith(".ogg")) {
      return res.status(400).json({ error: "Apenas MP3, WAV ou OGG permitido" });
    }

    const titulo = req.body.titulo || req.file.originalname.replace(/\.[^/.]+$/, "");

    const resultado = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "moises_music"
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
      artista: "Moises Music",
      url: resultado.secure_url,
      cloudinaryId: resultado.public_id,
      capa: "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music",
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
}

// ============================================
// EDITAR MUSICA
// ============================================
async function editarMusica(req, res) {
  try {
    const { titulo } = req.body;
    if (!titulo) return res.status(400).json({ error: "Título obrigatório" });

    await Music.updateOne({ _id: req.params.id, userEmail: req.user.email }, { titulo });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao editar música" });
  }
}

// ============================================
// EXCLUIR MUSICA
// ============================================
async function excluirMusica(req, res) {
  try {
    const musica = await Music.findOne({
      _id: req.params.id,
      userEmail: req.user.email
    });

    if (!musica) return res.status(404).json({ error: "Música não encontrada" });

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
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir música" });
  }
}

// ============================================
// PLAYLISTS
// ============================================
async function listarPlaylists(req, res) {
  const playlists = await Playlist.find({ userEmail: req.user.email });

  const obj = {};
  playlists.forEach((p) => {
    obj[p.nome] = p.musicas;
  });

  res.json(obj);
}

async function criarPlaylist(req, res) {
  const nome = req.params.nome;

  const existe = await Playlist.findOne({ userEmail: req.user.email, nome });

  if (!existe) {
    await Playlist.create({ userEmail: req.user.email, nome, musicas: [] });
  }

  res.json({ success: true });
}

async function deletarPlaylist(req, res) {
  await Playlist.deleteOne({ userEmail: req.user.email, nome: req.params.nome });
  res.json({ success: true });
}

async function adicionarMusicaPlaylist(req, res) {
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
}

async function removerMusicaPlaylist(req, res) {
  const { id } = req.body;

  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  await Playlist.updateOne(
    { userEmail: req.user.email, nome: req.params.nome },
    { $pull: { musicas: { id } } }
  );

  res.json({ success: true });
}

// ============================================
// FAVORITOS
// ============================================
async function listarFavoritos(req, res) {
  let fav = await Favorite.findOne({ userEmail: req.user.email });

  if (!fav) {
    fav = await Favorite.create({ userEmail: req.user.email, musicas: [] });
  }

  res.json(fav.musicas);
}

async function addFavorito(req, res) {
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
}

async function removeFavorito(req, res) {
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
}

// ============================================
// YOUTUBE SEARCH
// ============================================
async function buscarYoutube(req, res) {
  const query = req.query.q;
  const pageToken = req.query.pageToken || "";

  if (!query) return res.json({ dados: [], nextPageToken: null });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&q=${encodeURIComponent(
      query + " music"
    )}&key=${process.env.YOUTUBE_API_KEY}&pageToken=${pageToken}`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (dados.error) {
      console.error("Erro YouTube:", dados.error);
      return res.json({ dados: [], nextPageToken: null });
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
  } catch {
    res.json({ dados: [], nextPageToken: null });
  }
}

// ============================================
// TOP YOUTUBE
// ============================================
async function topYoutube(req, res) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=BR&videoCategoryId=10&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (dados.error) {
      console.error("Erro TOP YouTube:", dados.error);
      return res.json({ dados: [] });
    }

    const musicas = dados.items.map((item) => ({
      id: `yt_${item.id}`,
      titulo: item.snippet.title,
      artista: item.snippet.channelTitle,
      videoId: item.id,
      capa: item.snippet.thumbnails.medium.url,
      views: item.statistics?.viewCount || "0",
      fonte: "youtube"
    }));

    res.json({ dados: musicas });
  } catch {
    res.json({ dados: [] });
  }
}

// ============================================
// CONVERTER YOUTUBE -> MP3
// ============================================
async function baixarAudio(req, res) {
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

    const capaUrl =
      info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url ||
      info.videoDetails.thumbnails[0]?.url ||
      "https://via.placeholder.com/200/1DB954/FFFFFF?text=Moises+Music";

    const nomeArquivo = `${Date.now()}_${videoId}.mp3`;
    const caminhoTemp = path.join(tempDir, nomeArquivo);

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio"
    });

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
          fonte: "converted"
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
          mensagem: "Música convertida e adicionada aos favoritos!"
        });
      } catch (uploadError) {
        console.error("Erro no upload:", uploadError);
        if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
        res.status(500).json({ error: "Erro ao fazer upload do áudio" });
      }
    });

    writeStream.on("error", (error) => {
      console.error("Erro ao baixar:", error);
      res.status(500).json({ error: "Erro ao baixar áudio" });
    });
  } catch (error) {
    console.error("Erro na conversão:", error);
    res.status(500).json({ error: "Erro ao converter música" });
  }
}

async function statusConversao(req, res) {
  const musica = await Music.findOne({ _id: req.params.id, userEmail: req.user.email });
  res.json({ existe: !!musica, musica });
}

module.exports = {
  upload,
  listarMusicas,
  uploadMusica,
  editarMusica,
  excluirMusica,
  listarPlaylists,
  criarPlaylist,
  deletarPlaylist,
  adicionarMusicaPlaylist,
  removerMusicaPlaylist,
  listarFavoritos,
  addFavorito,
  removeFavorito,
  buscarYoutube,
  topYoutube,
  baixarAudio,
  statusConversao
};