import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

function App() {
  const audioRef = useRef(null);
  const [user, setUser] = useState(null);
  const [trendingMusics, setTrendingMusics] = useState([]);
  const [trendingArtists, setTrendingArtists] = useState([]);
  const [topYoutube, setTopYoutube] = useState([]);
  const [busca, setBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [musicaTocando, setMusicaTocando] = useState(null);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(false);

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
      console.error("Erro ao carregar trendings:", error);
    }
  };

  const carregarTopYoutube = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();
      console.log("Top YouTube:", data);
      setTopYoutube(data.dados || []);
    } catch (error) {
      console.error("Erro ao carregar top YouTube:", error);
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
      console.error("Erro na busca:", error);
    }
    setCarregando(false);
  };

  const tocarMusica = (musica) => {
    setMusicaTocando(musica);
    if (musica.fonte === "youtube") {
      // Abrir YouTube em nova aba (solução simples)
      window.open(`https://www.youtube.com/watch?v=${musica.videoId}`, "_blank");
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = musica.url;
      audioRef.current.play();
      setTocando(true);
    }
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
      <div className="login-container">
        <div className="login-card">
          <h1>Moises Music</h1>
          <p>Sua música. Seu estilo.</p>
          <button onClick={login}>Entrar com Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Moises Music</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar no YouTube..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarYoutube()}
          />
          <button onClick={buscarYoutube} disabled={carregando}>
            {carregando ? "..." : "Buscar"}
          </button>
        </div>
        <div className="user-info">
          <span>{user.nome?.split(" ")[0]}</span>
          <img src={user.foto} alt="Profile" />
          <button onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="main">
        {/* Top 10 YouTube - Seção principal */}
        <section className="section">
          <h2>🎬 Top 10 YouTube Music - Brasil</h2>
          {carregando && <p>Carregando...</p>}
          <div className="youtube-grid">
            {topYoutube.map((musica, index) => (
              <div key={musica.id} className="youtube-card" onClick={() => tocarMusica(musica)}>
                <div className="rank">{index + 1}</div>
                <img src={musica.capa} alt={musica.titulo} />
                <div className="info">
                  <p className="title">{musica.titulo.substring(0, 35)}</p>
                  <p className="artist">{musica.artista.substring(0, 25)}</p>
                  {musica.views && <p className="views">👁️ {parseInt(musica.views).toLocaleString()}</p>}
                </div>
                <button className="play-btn">▶</button>
              </div>
            ))}
            {topYoutube.length === 0 && !carregando && (
              <p className="empty">Nenhum vídeo encontrado. Tente novamente mais tarde.</p>
            )}
          </div>
        </section>

        {/* Resultados da busca */}
        {resultadosBusca.length > 0 && (
          <section className="section">
            <h2>🔍 Resultados da busca: "{busca}"</h2>
            <div className="youtube-grid">
              {resultadosBusca.map((musica) => (
                <div key={musica.id} className="youtube-card" onClick={() => tocarMusica(musica)}>
                  <img src={musica.capa} alt={musica.titulo} />
                  <div className="info">
                    <p className="title">{musica.titulo.substring(0, 35)}</p>
                    <p className="artist">{musica.artista.substring(0, 25)}</p>
                  </div>
                  <button className="play-btn">▶</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Músicas em alta */}
        <section className="section">
          <h2>🔥 Músicas em alta</h2>
          <div className="grid">
            {trendingMusics.map((musica) => (
              <div key={musica.id} className="card" onClick={() => tocarMusica(musica)}>
                <img src={musica.capa} alt={musica.titulo} />
                <p className="title">{musica.titulo}</p>
                <p className="artist">{musica.artista}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Artistas em alta */}
        <section className="section">
          <h2>🎤 Artistas em alta</h2>
          <div className="artist-grid">
            {trendingArtists.map((artista) => (
              <div key={artista.id} className="artist-card">
                <img src={artista.foto} alt={artista.nome} />
                <p>{artista.nome}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Player */}
      {musicaTocando && musicaTocando.fonte !== "youtube" && (
        <div className="player">
          <div className="player-info">
            <img src={musicaTocando.capa} alt="" />
            <div>
              <p>{musicaTocando.titulo}</p>
              <p>{musicaTocando.artista}</p>
            </div>
          </div>
          <div className="player-controls">
            <button onClick={() => setTocando(!tocando)}>
              {tocando ? "⏸" : "▶"}
            </button>
          </div>
          <audio ref={audioRef} />
        </div>
      )}
    </div>
  );
}

export default App;