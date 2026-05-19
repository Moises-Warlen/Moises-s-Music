import { useState, useEffect, useRef } from 'react'

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

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

  useEffect(() => {
    carregarUsuario();
    carregarTopYoutube();
  }, []);

  const carregarUsuario = async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        carregarTrendings();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const carregarTrendings = async () => {
    try {
      const [musicRes, artistRes] = await Promise.all([
        fetch(`${API_URL}/api/trending-music`),
        fetch(`${API_URL}/api/trending-artists`)
      ]);
      const musicData = await musicRes.json();
      const artistData = await artistRes.json();
      setTrendingMusics(musicData.dados || []);
      setTrendingArtists(artistData.dados || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const carregarTopYoutube = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();
      setTopYoutube(data.dados || []);
    } catch (error) {
      console.error("Erro top YouTube:", error);
      setTopYoutube([]);
    }
    setCarregando(false);
  };

  const buscarYoutube = async () => {
    if (!busca.trim()) return;
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}`);
      const data = await res.json();
      setResultadosBusca(data.dados || []);
    } catch (error) {
      console.error("Erro busca:", error);
    }
    setCarregando(false);
  };

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/logout`, { credentials: "include" });
    setUser(null);
  };

  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>Moises Music</h1>
          <p style={styles.sub}>Sua música. Seu estilo.</p>
          <button style={styles.loginBtn} onClick={login}>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={{ ...styles.sidebar, left: menuAberto ? 0 : -280 }}>
        <h2 style={styles.logoSmall}>Moises Music</h2>
        <button style={styles.menuBtn} onClick={() => { setAbaAtual("home"); setMenuAberto(false); }}>
          🏠 Home
        </button>
        <button style={styles.menuBtn} onClick={() => { setAbaAtual("minhas"); setMenuAberto(false); }}>
          🎵 Minhas músicas
        </button>
        <button style={styles.menuBtn} onClick={() => { setAbaAtual("favoritos"); setMenuAberto(false); }}>
          ❤️ Favoritos
        </button>
        <button style={styles.menuBtn} onClick={() => { setAbaAtual("playlists"); setMenuAberto(false); }}>
          📋 Playlists
        </button>
        <button style={styles.menuBtn} onClick={() => { setAbaAtual("top10"); setMenuAberto(false); }}>
          🔥 Top 10
        </button>
        <button style={styles.uploadBtn}>
          📤 Upload
        </button>
        <div style={styles.userInfoSidebar}>
          <span>{user.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div style={styles.content}>
        {/* Topbar */}
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
            <button style={styles.searchBtn} onClick={buscarYoutube} disabled={carregando}>
              {carregando ? "..." : "Buscar"}
            </button>
          </div>
          <img src={user.foto} alt="" style={styles.avatar} />
        </div>

        {/* Resultados da Busca */}
        {resultadosBusca.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔍 Resultados: "{busca}"</h2>
            <div style={styles.youtubeGrid}>
              {resultadosBusca.map((m, idx) => (
                <div key={m.id} style={styles.youtubeCard}>
                  <span style={styles.rank}>{idx + 1}</span>
                  <img src={m.capa} alt="" style={styles.youtubeImg} />
                  <div style={styles.youtubeInfo}>
                    <p style={styles.youtubeTitle}>{m.titulo}</p>
                    <p style={styles.youtubeArtist}>{m.artista}</p>
                  </div>
                  <button style={styles.playBtn}>▶</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 do Momento */}
        {abaAtual === "home" && topYoutube.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔥 Top 10 do Momento</h2>
            <p style={styles.subTitle}>Mais tocadas agora no YouTube</p>
            <div style={styles.youtubeGrid}>
              {topYoutube.map((m, idx) => (
                <div key={m.id} style={styles.youtubeCard}>
                  <span style={styles.rank}>{idx + 1}</span>
                  <img src={m.capa} alt="" style={styles.youtubeImg} />
                  <div style={styles.youtubeInfo}>
                    <p style={styles.youtubeTitle}>{m.titulo}</p>
                    <p style={styles.youtubeArtist}>{m.artista}</p>
                    {m.views && <p style={styles.views}>👁️ {parseInt(m.views).toLocaleString()}</p>}
                  </div>
                  <button style={styles.playBtn}>▶</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Músicas em alta */}
        {abaAtual === "home" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🎵 Músicas em alta</h2>
            <div style={styles.grid}>
              {trendingMusics.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>
                  <p style={styles.cardArtist}>{m.artista}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artistas em alta */}
        {abaAtual === "home" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🎤 Artistas em alta</h2>
            <div style={styles.artistGrid}>
              {trendingArtists.map((a) => (
                <div key={a.id} style={styles.artistCard}>
                  <img src={a.foto} alt="" style={styles.artistImg} />
                  <p style={styles.artistName}>{a.nome}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {carregando && (
          <div style={styles.loading}>
            <p>Carregando...</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#121212",
    color: "white"
  },
  loginContainer: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #000, #1DB954)"
  },
  loginCard: {
    background: "#111",
    padding: 40,
    borderRadius: 25,
    width: 350,
    textAlign: "center"
  },
  logo: {
    fontSize: 42,
    color: "#1DB954",
    marginBottom: 10
  },
  sub: {
    color: "#aaa",
    marginBottom: 30
  },
  loginBtn: {
    background: "#1DB954",
    border: "none",
    padding: "12px 30px",
    borderRadius: 25,
    fontSize: 16,
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
  logoSmall: {
    color: "#1DB954",
    marginBottom: 30,
    fontSize: 22
  },
  menuBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    cursor: "pointer",
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 16,
    width: "100%"
  },
  uploadBtn: {
    background: "#1DB954",
    border: "none",
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    cursor: "pointer",
    fontWeight: "bold",
    width: "100%"
  },
  logoutBtn: {
    background: "#333",
    border: "none",
    color: "white",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer",
    width: "100%",
    marginTop: 10
  },
  userInfoSidebar: {
    marginTop: "auto",
    paddingTop: 20,
    borderTop: "1px solid #333",
    fontSize: 12,
    color: "#aaa"
  },
  content: {
    flex: 1,
    marginLeft: 280,
    padding: 20,
    overflowY: "auto",
    paddingBottom: 30
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 30
  },
  mobileBtn: {
    background: "#1DB954",
    border: "none",
    padding: 10,
    borderRadius: 10,
    cursor: "pointer",
    display: "none",
    fontSize: 20
  },
  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#1e1e1e",
    padding: "8px 15px",
    borderRadius: 50,
    maxWidth: 500
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "white",
    fontSize: 14,
    padding: "8px 0"
  },
  searchBtn: {
    background: "#1DB954",
    border: "none",
    padding: "6px 20px",
    borderRadius: 50,
    cursor: "pointer",
    fontWeight: "bold"
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover"
  },
  section: {
    marginBottom: 50
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 10,
    color: "#fff"
  },
  subTitle: {
    color: "#aaa",
    marginBottom: 20,
    fontSize: 14
  },
  youtubeGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  youtubeCard: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    background: "#1e1e1e",
    padding: "10px 15px",
    borderRadius: 12,
    cursor: "pointer",
    transition: "0.2s"
  },
  rank: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1DB954",
    width: 50,
    textAlign: "center"
  },
  youtubeImg: {
    width: 70,
    height: 70,
    borderRadius: 8,
    objectFit: "cover"
  },
  youtubeInfo: {
    flex: 1
  },
  youtubeTitle: {
    fontWeight: "bold",
    marginBottom: 5
  },
  youtubeArtist: {
    color: "#aaa",
    fontSize: 13
  },
  views: {
    color: "#666",
    fontSize: 11,
    marginTop: 3
  },
  playBtn: {
    background: "#1DB954",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 18
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 20
  },
  card: {
    background: "#181818",
    padding: 15,
    borderRadius: 12,
    cursor: "pointer",
    transition: "0.2s"
  },
  cardImg: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 10
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 5
  },
  cardArtist: {
    color: "#aaa",
    fontSize: 12
  },
  artistGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 20
  },
  artistCard: {
    background: "#181818",
    padding: 20,
    borderRadius: 12,
    textAlign: "center"
  },
  artistImg: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 10
  },
  artistName: {
    fontWeight: "bold"
  },
  loading: {
    textAlign: "center",
    padding: 40,
    color: "#aaa"
  }
};

// Media query para mobile
const mobileStyles = `
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .mobile-btn { display: block !important; }
  .content { margin-left: 0 !important; padding: 15px !important; }
  .search-box { max-width: none !important; width: 100% !important; }
  .rank { width: 35px !important; font-size: 18px !important; }
  .youtube-img { width: 50px !important; height: 50px !important; }
  .youtube-title { font-size: 12px !important; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important; gap: 12px !important; }
  .artist-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; }
  .artist-img { width: 70px !important; height: 70px !important; }
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);

export default App;