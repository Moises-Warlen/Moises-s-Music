require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const multer = require("multer");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

const User = require("./src/models/User");
const Music = require("./src/models/Music");
const Playlist = require("./src/models/Playlist");
const Favorite = require("./src/models/Favorite");

const app = express();

// ============================================
// URLS (AUTO DETECT)
// ============================================
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://moises-music.netlify.app"
    : "http://localhost:5173");

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://moises-s-music.onrender.com"
    : `http://localhost:${process.env.PORT || 3333}`);

// ============================================
// TRUST PROXY (Render precisa disso)
// ============================================
app.set("trust proxy", 1);

// ============================================
// CLOUDINARY CONFIG
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============================================
// MONGO CONNECT
// ============================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

// ============================================
// CORS
// ============================================
app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "https://moises-music.netlify.app"
    ],
    credentials: true
  })
);

app.use(express.json());

// ============================================
// SESSION (Render + Netlify)
// ============================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ============================================
// AUTH MIDDLEWARE
// ============================================
function auth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ============================================
// GOOGLE STRATEGY
// ============================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            nome: profile.displayName,
            foto: profile.photos?.[0]?.value
          });
        }

        done(null, {
          email: user.email,
          nome: user.nome,
          foto: user.foto
        });
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ============================================
// AUTH ROUTES
// ============================================
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: FRONTEND_URL }),
  (req, res) => {
    res.redirect(FRONTEND_URL);
  }
);

app.get("/api/me", (req, res) => {
  res.json({ user: req.user || null });
});

app.get("/api/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
      });

      res.json({ ok: true });
    });
  });
});

// ============================================
// LISTAR MUSICAS (CORRIGIDO)
// ============================================
app.get("/api/musicas", auth, async (req, res) => {
  try {
    const musicas = await Music.find({ userEmail: req.user.email }).sort({ createdAt: -1 });

    res.json({
      dados: musicas.map((m) => ({
        id: m._id.toString(),
        titulo: m.titulo,
        artista: m.artista,
        url: m.url,
        capa: m.capa || `https://ui-avatars.com/api/?background=1DB954&color=fff&size=200&name=${encodeURIComponent(m.titulo || "Moises Music")}`,
        fonte: "local"
      }))
    });
  } catch {
    res.json({ dados: [] });
  }
});

// ============================================
// UPLOAD CLOUDINARY (CORRIGIDO)
// ============================================
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upload", auth, upload.single("musica"), async (req, res) => {
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
      capa: `https://ui-avatars.com/api/?background=1DB954&color=fff&size=200&name=${encodeURIComponent(titulo || "Moises Music")}`
    });

    res.json({
      success: true,
      musica: {
        id: nova._id.toString(),
        titulo: nova.titulo,
        artista: nova.artista,
        url: nova.url,
        capa: nova.capa,
        fonte: "local"
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
app.put("/api/musicas/:id", auth, async (req, res) => {
  try {
    const { titulo } = req.body;
    if (!titulo) return res.status(400).json({ error: "Título obrigatório" });

    await Music.updateOne({ _id: req.params.id, userEmail: req.user.email }, { titulo });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao editar música" });
  }
});

// ============================================
// EXCLUIR MUSICA
// ============================================
app.delete("/api/musicas/:id", auth, async (req, res) => {
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
});

// ============================================
// PLAYLISTS
// ============================================
app.get("/api/playlists", auth, async (req, res) => {
  const playlists = await Playlist.find({ userEmail: req.user.email });

  const obj = {};
  playlists.forEach((p) => {
    obj[p.nome] = p.musicas;
  });

  res.json(obj);
});

app.post("/api/playlists/:nome", auth, async (req, res) => {
  const nome = req.params.nome;

  const existe = await Playlist.findOne({ userEmail: req.user.email, nome });

  if (!existe) {
    await Playlist.create({ userEmail: req.user.email, nome, musicas: [] });
  }

  res.json({ success: true });
});

app.delete("/api/playlists/:nome", auth, async (req, res) => {
  await Playlist.deleteOne({ userEmail: req.user.email, nome: req.params.nome });
  res.json({ success: true });
});

app.post("/api/playlists/:nome/add", auth, async (req, res) => {
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
});

app.post("/api/playlists/:nome/remove", auth, async (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  await Playlist.updateOne(
    { userEmail: req.user.email, nome: req.params.nome },
    { $pull: { musicas: { id } } }
  );

  res.json({ success: true });
});

// ============================================
// FAVORITOS
// ============================================
app.get("/api/favoritos", auth, async (req, res) => {
  let fav = await Favorite.findOne({ userEmail: req.user.email });

  if (!fav) {
    fav = await Favorite.create({ userEmail: req.user.email, musicas: [] });
  }

  res.json(fav.musicas);
});

app.post("/api/favoritos/add", auth, async (req, res) => {
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
});

app.post("/api/favoritos/remove", auth, async (req, res) => {
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
});

// ============================================
// YOUTUBE SEARCH
// ============================================
app.get("/api/buscar-youtube", async (req, res) => {
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
  } catch (err) {
    res.json({ dados: [], nextPageToken: null });
  }
});

// ============================================
// TRENDING MUSICS (REAL - YouTube API)
// ============================================

// Rota para músicas em tendência
app.get("/api/trending-music", async (req, res) => {
  const regionCode = req.query.region || "BR";
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&videoCategoryId=10&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("Erro YouTube API:", data.error);
      return res.json({ dados: [] });
    }
    
    const musicas = data.items.map((video, index) => ({
      id: video.id,
      titulo: video.snippet.title,
      artista: video.snippet.channelTitle,
      videoId: video.id,
      capa: video.snippet.thumbnails.medium.url,
      views: video.statistics?.viewCount || "N/A",
      likes: video.statistics?.likeCount || "N/A",
      rank: index + 1,
      fonte: "youtube_trending"
    }));
    
    res.json({ 
      success: true,
      dados: musicas,
      regiao: regionCode
    });
    
  } catch (error) {
    console.error("Erro ao buscar trending:", error);
    res.status(500).json({ error: "Erro ao buscar músicas em tendência" });
  }
});

// Rota para artistas em tendência
app.get("/api/trending-artists", async (req, res) => {
  const regionCode = req.query.region || "BR";
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&videoCategoryId=10&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.json({ dados: [] });
    }
    
    const artistasMap = new Map();
    
    for (const video of data.items) {
      const channelId = video.snippet.channelId;
      const channelTitle = video.snippet.channelTitle;
      const views = parseInt(video.statistics?.viewCount || 0);
      
      if (artistasMap.has(channelId)) {
        const existing = artistasMap.get(channelId);
        existing.totalViews += views;
        existing.videosCount++;
      } else {
        artistasMap.set(channelId, {
          id: channelId,
          nome: channelTitle,
          foto: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
          totalViews: views,
          videosCount: 1
        });
      }
    }
    
    const artistas = Array.from(artistasMap.values())
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10)
      .map((artista, index) => ({
        ...artista,
        rank: index + 1,
        viewsFormatado: formatarNumero(artista.totalViews)
      }));
    
    res.json({ 
      success: true,
      dados: artistas,
      regiao: regionCode
    });
    
  } catch (error) {
    console.error("Erro ao buscar artistas trending:", error);
    res.status(500).json({ error: "Erro ao buscar artistas em tendência" });
  }
});

// Rota para top YouTube
app.get("/api/top-youtube", async (req, res) => {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=BR&maxResults=25&key=${process.env.YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.json({ dados: [] });
    }
    
    const videos = data.items.map((video) => ({
      id: video.id,
      titulo: video.snippet.title,
      artista: video.snippet.channelTitle,
      videoId: video.id,
      capa: video.snippet.thumbnails.medium.url,
      views: video.statistics?.viewCount || "0",
      fonte: "youtube_top"
    }));
    
    res.json({ dados: videos });
    
  } catch (error) {
    console.error("Erro ao buscar top YouTube:", error);
    res.json({ dados: [] });
  }
});

// Função auxiliar para formatar números
function formatarNumero(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Moises Music Backend rodando na porta ${PORT}`);
});