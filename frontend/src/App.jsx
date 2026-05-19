import { useState, useEffect, useRef } from "react";

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

const DEFAULT_AVATAR = (nome = "Artista") =>
  `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${encodeURIComponent(
    nome
  )}`;

function App() {
  const [user, setUser] = useState(null);

  const [topYoutube, setTopYoutube] = useState([]);
  const [trendingMusics, setTrendingMusics] = useState([]);
  const [trendingArtists, setTrendingArtists] = useState([]);

  const [busca, setBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);

  const [carregando, setCarregando] = useState(false);

  const [abaAtual, setAbaAtual] = useState("home");
  const [menuAberto, setMenuAberto] = useState(false);

  const [userMusics, setUserMusics] = useState([]);
  
  // Player state
  const [musicaAtual, setMusicaAtual] = useState(null);
  const audioRef = useRef(null);

  // ============================================
  // PLAYER FUNCTIONS
  // ============================================
  
  const playMusic = (musica) => {
    if (musica.videoId) {
      window.open(`https://www.youtube.com/watch?v=${musica.videoId}`, "_blank");
      return;
    }
    
    if (musica.url && audioRef.current) {
      if (musicaAtual?.id === musica.id) {
        audioRef.current.play();
      } else {
        audioRef.current.src = musica.url;
        audioRef.current.play();
        setMusicaAtual(musica);
      }
    }
  };

  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setMusicaAtual(null);
    }
  };

  // ============================================
  // INIT
  // ============================================

  useEffect(() => {
    carregarUsuario();
    carregarMusicasBackend();
  }, []);

  // ============================================
  // USER MUSIC BACKEND
  // ============================================

  const carregarMusicasBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/api/musicas`, {
        credentials: "include"
      });
      const data = await res.json();
      
      if (data.dados && data.dados.length > 0) {
        setUserMusics(data.dados.slice(0, 5));
        localStorage.setItem("user_musics", JSON.stringify(data.dados.slice(0, 5)));
      } else {
        carregarUserMusicsFromLocal();
      }
    } catch (error) {
      console.error("Erro ao carregar músicas:", error);
      carregarUserMusicsFromLocal();
    }
  };

  const carregarUserMusicsFromLocal = () => {
    const saved = localStorage.getItem("user_musics");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserMusics(parsed.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removerMusicaUsuario = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/musicas/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (res.ok) {
        const novasMusicas = userMusics.filter((m) => m.id !== id);
        setUserMusics(novasMusicas);
        localStorage.setItem("user_musics", JSON.stringify(novasMusicas));
      }
    } catch (error) {
      console.error("Erro ao remover música:", error);
    }
  };

  // ============================================
  // UPLOAD
  // ============================================

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Por favor, selecione um arquivo de áudio (MP3, WAV, OGG)");
      event.target.value = "";
      return;
    }

    setCarregando(true);

    const formData = new FormData();
    formData.append("musica", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        await carregarMusicasBackend();
        alert(`✅ Upload realizado: ${data.musica.titulo}`);
      } else {
        alert("Erro no upload: " + (data.error || "Tente novamente"));
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload. Verifique sua conexão.");
    } finally {
      setCarregando(false);
      event.target.value = "";
    }
  };

  // ============================================
  // API
  // ============================================

  const carregarUsuario = async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        credentials: "include"
      });

      const data = await res.json();

      if (data.user) {
        setUser(data.user);
        carregarTrendings();
        carregarTopYoutube();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const carregarTrendings = async () => {
    try {
      const [musicRes, artistRes] = await Promise.all([
        fetch(`${API_URL}/api/trending-music?region=BR`),
        fetch(`${API_URL}/api/trending-artists?region=BR`)
      ]);

      const musicData = await musicRes.json();
      const artistData = await artistRes.json();

      if (musicData.success) {
        setTrendingMusics(musicData.dados || []);
      } else {
        setTrendingMusics([]);
      }

      if (artistData.success) {
        setTrendingArtists(artistData.dados || []);
      } else {
        setTrendingArtists([]);
      }
    } catch (error) {
      console.error(error);
      setTrendingMusics([]);
      setTrendingArtists([]);
    }
  };

  const carregarTopYoutube = async () => {
    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();

      setTopYoutube(
        Array.isArray(data?.dados) ? data.dados.slice(0, 10) : []
      );
    } catch (error) {
      console.error(error);
      setTopYoutube([]);
    }
  };

  const buscarYoutube = async () => {
    if (!busca.trim()) return;

    setCarregando(true);

    try {
      const res = await fetch(
        `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}`
      );

      const data = await res.json();

      setResultadosBusca(Array.isArray(data?.dados) ? data.dados : []);
    } catch (error) {
      console.error(error);
      setResultadosBusca([]);
    }

    setCarregando(false);
  };

  // ============================================
  // AUTH
  // ============================================

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        credentials: "include"
      });

      setUser(null);
      stopMusic();
    } catch (error) {
      console.error(error);
    }
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================

  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>🎵 Moises Music</h1>
          <p style={styles.sub}>Sua música. Seu estilo.</p>
          <button style={styles.loginBtn} onClick={login}>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // APP
  // ============================================

  return (
    <div style={styles.app}>
      {/* AUDIO PLAYER ELEMENT */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* SIDEBAR */}
      <div style={{ ...styles.sidebar, left: menuAberto ? 0 : -280 }}>
        <h2 style={styles.logoSmall}>🎵 Moises Music</h2>

        <button
          style={styles.menuBtn}
          onClick={() => {
            setAbaAtual("home");
            setMenuAberto(false);
          }}
        >
          🏠 Home
        </button>

        <button style={styles.menuBtn}>🎵 Minhas músicas</button>
        <button style={styles.menuBtn}>❤️ Favoritos</button>
        <button style={styles.menuBtn}>📋 Playlists</button>
        <button style={styles.menuBtn}>🔥 Top 10</button>

        <div style={styles.uploadAreaSidebar}>
          <label style={styles.uploadBtn} htmlFor="sidebarUpload">
            📤 Upload música
          </label>
          <input
            id="sidebarUpload"
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </div>

        <div style={styles.userInfoSidebar}>
          <span>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <button style={styles.mobileBtn} onClick={() => setMenuAberto(!menuAberto)}>
            ☰
          </button>

          <div style={styles.searchBox}>
            <input
              style={styles.searchInput}
              placeholder="Buscar música no YouTube..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarYoutube()}
            />
            <button style={styles.searchBtn} onClick={buscarYoutube}>
              {carregando ? "..." : "Buscar"}
            </button>
          </div>

          <img
            src={user?.foto || DEFAULT_AVATAR(user?.nome)}
            alt=""
            style={styles.avatar}
            onError={(e) => {
              e.target.src = DEFAULT_AVATAR(user?.nome);
            }}
          />
        </div>

        {/* RESULTADOS DA BUSCA */}
        {resultadosBusca.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔍 Resultados: "{busca}"</h2>
            <div style={styles.youtubeGrid}>
              {resultadosBusca.map((m, idx) => (
                <div key={m.id || idx} style={styles.youtubeCard}>
                  <span style={styles.rank}>{idx + 1}</span>
                  <img
                    src={m.capa || DEFAULT_AVATAR(m.titulo)}
                    alt=""
                    style={styles.youtubeImg}
                    onError={(e) => {
                      e.target.src = DEFAULT_AVATAR(m.titulo);
                    }}
                  />
                  <div style={styles.youtubeInfo}>
                    <p style={styles.youtubeTitle}>{m.titulo}</p>
                    <p style={styles.youtubeArtist}>{m.artista}</p>
                  </div>
                  <button style={styles.playBtn} onClick={() => playMusic(m)}>
                    ▶
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOME */}
        {abaAtual === "home" && (
          <>
            {/* TOP MUSICAS - TRENDING */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🎵 Músicas em Tendência</h2>
                <span style={styles.sectionBadge}>🔥 Atualizado</span>
              </div>
              <div style={styles.topMusicsGrid}>
                {trendingMusics.slice(0, 5).map((m, idx) => (
                  <div key={m.id || idx} style={styles.topMusicCard}>
                    <div style={styles.topMusicRank}>#{m.rank || idx + 1}</div>
                    <img src={m.capa} alt="" style={styles.topMusicImg} />
                    <div style={styles.topMusicInfo}>
                      <p style={styles.topMusicTitle}>{m.titulo}</p>
                      <p style={styles.topMusicArtist}>{m.artista}</p>
                      <small style={{ color: "#888" }}>👁️ {m.views} views</small>
                    </div>
                    <button style={styles.playSmallBtn} onClick={() => playMusic(m)}>
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ARTISTAS EM ALTA */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>✨ Artistas em Alta</h2>
                <span style={styles.sectionBadge}>🎤 Trending</span>
              </div>
              <div style={styles.sevenArtistsGrid}>
                {trendingArtists.length === 0 ? (
                  <div style={styles.emptyMusics}>Carregando artistas...</div>
                ) : (
                  trendingArtists.slice(0, 7).map((artista) => (
                    <div key={artista.id} style={styles.artistCardHome}>
                      <div style={styles.artistRankBadge}>{artista.rank}</div>
                      <img
                        src={artista.foto || DEFAULT_AVATAR(artista.nome)}
                        alt=""
                        style={styles.artistImgHome}
                        onError={(e) => {
                          e.target.src = DEFAULT_AVATAR(artista.nome);
                        }}
                      />
                      <p style={styles.artistNameHome}>{artista.nome}</p>
                      <p style={styles.artistGenreHome}>👁️ {artista.viewsFormatado} views</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP YOUTUBE */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🔥 Top YouTube</h2>
                <span style={styles.sectionBadge}>Mais vistos</span>
              </div>
              <div style={styles.topMusicsGrid}>
                {topYoutube.slice(0, 5).map((m, idx) => (
                  <div key={m.id || idx} style={styles.topMusicCard}>
                    <div style={styles.topMusicRank}>#{idx + 1}</div>
                    <img src={m.capa} alt="" style={styles.topMusicImg} />
                    <div style={styles.topMusicInfo}>
                      <p style={styles.topMusicTitle}>{m.titulo}</p>
                      <p style={styles.topMusicArtist}>{m.artista}</p>
                    </div>
                    <button style={styles.playSmallBtn} onClick={() => playMusic(m)}>
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SUAS MUSICAS */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>📂 Suas músicas</h2>
                <span style={styles.sectionBadge}>Máx 5</span>
              </div>

              <div style={styles.userMusicsList}>
                {userMusics.length === 0 ? (
                  <div style={styles.emptyMusics}>
                    <span>🎧</span>
                    <p>Nenhuma música adicionada</p>
                    <small>Faça upload de uma música!</small>
                  </div>
                ) : (
                  userMusics.map((musica) => (
                    <div key={musica.id} style={styles.userMusicCard}>
                      <div style={styles.userMusicIcon}>🎵</div>
                      <div style={styles.userMusicInfo}>
                        <p style={styles.userMusicTitle}>{musica.titulo}</p>
                        <p style={styles.userMusicArtist}>{musica.artista}</p>
                      </div>
                      <button style={styles.playSmallBtn} onClick={() => playMusic(musica)}>
                        ▶
                      </button>
                      <button
                        style={styles.removeMusicBtn}
                        onClick={() => removerMusicaUsuario(musica.id)}
                      >
                        ✖
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* PLAYER BAR */}
      {musicaAtual && (
        <div style={styles.playerBar}>
          <div style={styles.playerInfo}>
            <span>🎵 {musicaAtual.titulo}</span>
            <span style={styles.playerArtist}>{musicaAtual.artista}</span>
          </div>
          <audio ref={audioRef} controls autoPlay style={styles.audioPlayer} />
          <button onClick={stopMusic} style={styles.closePlayer}>
            ✖
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#121212",
    color: "#fff",
    fontFamily: "Arial"
  },
  loginContainer: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#000,#1DB954)"
  },
  loginCard: {
    background: "#111",
    padding: 40,
    borderRadius: 24,
    width: 350,
    textAlign: "center"
  },
  logo: { fontSize: 42, color: "#1DB954" },
  sub: { color: "#aaa", marginBottom: 30 },
  loginBtn: {
    background: "#1DB954",
    border: "none",
    padding: "14px 30px",
    borderRadius: 30,
    fontWeight: "bold",
    cursor: "pointer"
  },
  sidebar: {
    width: 280,
    background: "#000",
    padding: 20,
    position: "fixed",
    top: 0,
    bottom: 0,
    transition: "0.3s",
    zIndex: 999,
    display: "flex",
    flexDirection: "column"
  },
  logoSmall: { color: "#1DB954", marginBottom: 30 },
  menuBtn: {
    background: "#111",
    border: "none",
    color: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    cursor: "pointer",
    textAlign: "left"
  },
  uploadAreaSidebar: { marginTop: 20 },
  uploadBtn: {
    background: "#1DB954",
    padding: 12,
    borderRadius: 12,
    display: "block",
    textAlign: "center",
    cursor: "pointer",
    fontWeight: "bold"
  },
  userInfoSidebar: {
    marginTop: "auto",
    borderTop: "1px solid #333",
    paddingTop: 20,
    color: "#aaa"
  },
  logoutBtn: {
    width: "100%",
    marginTop: 10,
    background: "#222",
    border: "none",
    color: "#fff",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer"
  },
  content: { flex: 1, marginLeft: 280, padding: 20 },
  topbar: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginBottom: 30
  },
  mobileBtn: { display: "none" },
  searchBox: {
    flex: 1,
    display: "flex",
    gap: 10,
    background: "#1e1e1e",
    padding: 10,
    borderRadius: 50
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#fff"
  },
  searchBtn: {
    background: "#1DB954",
    border: "none",
    borderRadius: 30,
    padding: "8px 20px",
    cursor: "pointer"
  },
  avatar: { width: 42, height: 42, borderRadius: "50%", objectFit: "cover" },
  section: { marginBottom: 50 },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20
  },
  sectionTitle: { fontSize: 28 },
  sectionBadge: { color: "#1DB954" },
  topMusicsGrid: { display: "flex", flexDirection: "column", gap: 12 },
  topMusicCard: {
    background: "#1e1e1e",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 15
  },
  topMusicRank: { color: "#1DB954", fontWeight: "bold" },
  topMusicImg: { width: 60, height: 60, borderRadius: 10, objectFit: "cover" },
  topMusicInfo: { flex: 1 },
  topMusicTitle: { fontWeight: "bold" },
  topMusicArtist: { color: "#aaa" },
  playSmallBtn: {
    background: "#1DB954",
    border: "none",
    width: 36,
    height: 36,
    borderRadius: "50%",
    cursor: "pointer"
  },
  sevenArtistsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
    gap: 20
  },
  artistCardHome: {
    background: "#181818",
    borderRadius: 18,
    padding: 20,
    textAlign: "center",
    position: "relative"
  },
  artistRankBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    background: "#1DB954",
    color: "#000",
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold"
  },
  artistImgHome: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 12,
    border: "3px solid #1DB954"
  },
  artistNameHome: { fontWeight: "bold" },
  artistGenreHome: { color: "#aaa", fontSize: 12 },
  userMusicsList: { display: "flex", flexDirection: "column", gap: 12 },
  userMusicCard: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    background: "#1a1a1a",
    padding: 15,
    borderRadius: 14
  },
  userMusicIcon: { fontSize: 28 },
  userMusicInfo: { flex: 1 },
  userMusicTitle: { fontWeight: "bold" },
  userMusicArtist: { color: "#aaa", fontSize: 12 },
  removeMusicBtn: {
    background: "transparent",
    border: "none",
    color: "#ff6b6b",
    cursor: "pointer",
    fontSize: 18
  },
  emptyMusics: {
    background: "#1a1a1a",
    padding: 40,
    borderRadius: 18,
    textAlign: "center",
    color: "#888"
  },
  youtubeGrid: { display: "flex", flexDirection: "column", gap: 12 },
  youtubeCard: {
    background: "#1e1e1e",
    padding: 14,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    gap: 15
  },
  youtubeImg: { width: 70, height: 70, borderRadius: 10, objectFit: "cover" },
  youtubeInfo: { flex: 1 },
  youtubeTitle: { fontWeight: "bold" },
  youtubeArtist: { color: "#aaa" },
  playBtn: {
    background: "#1DB954",
    border: "none",
    width: 42,
    height: 42,
    borderRadius: "50%",
    cursor: "pointer"
  },
  rank: { color: "#1DB954", fontWeight: "bold", minWidth: 20 },
  playerBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#282828",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1000
  },
  playerInfo: { display: "flex", flexDirection: "column", minWidth: 200 },
  playerArtist: { fontSize: 12, color: "#aaa" },
  audioPlayer: { flex: 1, maxWidth: 400, margin: "0 20px" },
  closePlayer: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 18
  }
};

export default App;