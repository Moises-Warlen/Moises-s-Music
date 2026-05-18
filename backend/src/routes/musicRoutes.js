const express = require("express");

const {
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
} = require("../controllers/musicController");

const router = express.Router();

// ============================================
// AUTH MIDDLEWARE
// ============================================
function auth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ============================================
// MUSICAS
// ============================================
router.get("/musicas", auth, listarMusicas);
router.post("/upload", auth, upload.single("musica"), uploadMusica);
router.put("/musicas/:id", auth, editarMusica);
router.delete("/musicas/:id", auth, excluirMusica);

// ============================================
// PLAYLISTS
// ============================================
router.get("/playlists", auth, listarPlaylists);
router.post("/playlists/:nome", auth, criarPlaylist);
router.delete("/playlists/:nome", auth, deletarPlaylist);
router.post("/playlists/:nome/add", auth, adicionarMusicaPlaylist);
router.post("/playlists/:nome/remove", auth, removerMusicaPlaylist);

// ============================================
// FAVORITOS
// ============================================
router.get("/favoritos", auth, listarFavoritos);
router.post("/favoritos/add", auth, addFavorito);
router.post("/favoritos/remove", auth, removeFavorito);

// ============================================
// YOUTUBE
// ============================================
router.get("/buscar-youtube", buscarYoutube);
router.get("/top-youtube", topYoutube);

// ============================================
// CONVERTER YOUTUBE
// ============================================
router.post("/baixar-audio", auth, baixarAudio);
router.get("/status-conversao/:id", auth, statusConversao);

module.exports = router;