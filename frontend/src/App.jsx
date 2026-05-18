
import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";

import {
  Home,
  Music,
  Heart,
  ListMusic,
  Upload,
  LogOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Search,
  Menu,
  X,
  Shuffle,
  Repeat,
  Download
} from "lucide-react";

const API_URL =
  window.location.hostname.includes("localhost")
    ? "http://localhost:3333"
    : "https://moises-s-music.onrender.com";

export default function App() {
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);

  const [user, setUser] = useState(null);

  const [musicas, setMusicas] = useState([]);
  const [favoritos, setFavoritos] = useState([]);

  const [musicaTocando, setMusicaTocando] =
    useState(null);

  const [fila, setFila] = useState([]);
  const [indiceFila, setIndiceFila] =
    useState(0);

  const [tocando, setTocando] =
    useState(false);

  const [videoYoutube, setVideoYoutube] =
    useState(null);

  const [busca, setBusca] = useState("");
  const [resultadosYoutube, setResultadosYoutube] =
    useState([]);

  const [menuAberto, setMenuAberto] =
    useState(false);

  const [toast, setToast] = useState("");

  const [shuffle, setShuffle] =
    useState(false);

  const [repeat, setRepeat] =
    useState(false);

  const [trendingMusics, setTrendingMusics] =
    useState([]);

  const [trendingArtists, setTrendingArtists] =
    useState([]);

  const showToast = (msg) => {
    setToast(msg);

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/me`,
        {
          credentials: "include"
        }
      );

      const data = await res.json();

      if (data.user) {
        setUser(data.user);

        carregarTudo();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const carregarTudo = async () => {
    carregarMusicas();
    carregarFavoritos();
    carregarTrendingMusics();
    carregarTrendingArtists();
  };

  const carregarMusicas = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/musicas`,
        {
          credentials: "include"
        }
      );

      const data = await res.json();

      setMusicas(data.dados || []);
    } catch {
      setMusicas([]);
    }
  };

  const carregarFavoritos = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/favoritos`,
        {
          credentials: "include"
        }
      );

      const data = await res.json();

      setFavoritos(data || []);
    } catch {
      setFavoritos([]);
    }
  };

  const carregarTrendingMusics = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/trending-music`
      );

      const data = await res.json();

      setTrendingMusics(data.dados || []);
    } catch {
      setTrendingMusics([]);
    }
  };

  const carregarTrendingArtists =
    async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/trending-artists`
        );

        const data = await res.json();

        setTrendingArtists(data.dados || []);
      } catch {
        setTrendingArtists([]);
      }
    };

  const tocarMusica = (
    musica,
    lista = []
  ) => {
    setMusicaTocando(musica);

    if (lista.length) {
      setFila(lista);

      const idx = lista.findIndex(
        (m) => m.id === musica.id
      );

      setIndiceFila(idx);
    }

    if (musica.fonte === "youtube") {
      setVideoYoutube(musica.videoId);
      setTocando(true);
      return;
    }

    setVideoYoutube(null);

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = musica.url;

        audioRef.current.play();

        setTocando(true);
      }
    }, 200);
  };

  const togglePlayPause = () => {
    if (!musicaTocando) return;

    if (
      musicaTocando.fonte === "youtube"
    ) {
      if (tocando) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }

      setTocando(!tocando);

      return;
    }

    if (tocando) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setTocando(!tocando);
  };

  const tocarProxima = () => {
    if (!fila.length) return;

    let prox;

    if (shuffle) {
      prox = Math.floor(
        Math.random() * fila.length
      );
    } else {
      prox = indiceFila + 1;
    }

    if (prox >= fila.length) {
      if (repeat) {
        prox = 0;
      } else {
        return;
      }
    }

    setIndiceFila(prox);

    tocarMusica(fila[prox], fila);
  };

  const tocarAnterior = () => {
    if (!fila.length) return;

    let ant = indiceFila - 1;

    if (ant < 0) ant = 0;

    setIndiceFila(ant);

    tocarMusica(fila[ant], fila);
  };

  const buscarYoutube = async () => {
    if (!busca.trim()) return;

    try {
      const res = await fetch(
        `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(
          busca
        )}`
      );

      const data = await res.json();

      setResultadosYoutube(
        data.dados || []
      );
    } catch {
      setResultadosYoutube([]);
    }
  };

  const toggleFavorito = async (
    musica
  ) => {
    const existe = favoritos.some(
      (m) => m.id === musica.id
    );

    try {
      await fetch(
        `${API_URL}/api/favoritos/${
          existe ? "remove" : "add"
        }`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(musica)
        }
      );

      carregarFavoritos();

      showToast(
        existe
          ? "💔 Removido dos favoritos"
          : "❤️ Adicionado aos favoritos"
      );
    } catch {
      showToast("Erro");
    }
  };

  const login = () => {
    window.location.href =
      `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(
      `${API_URL}/api/logout`,
      {
        credentials: "include"
      }
    );

    setUser(null);
  };

  if (!user) {
    return (
      <div style={styles.login}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>
            Moises Music
          </h1>

          <p style={styles.sub}>
            Sua música. Seu estilo.
          </p>

          <button
            style={styles.loginBtn}
            onClick={login}
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}

      <div
        style={{
          ...styles.sidebar,
          left: menuAberto ? 0 : -260
        }}
      >
        <h2 style={styles.logoSmall}>
          Moises Music
        </h2>

        <button style={styles.menuBtn}>
          <Home size={18} />
          Home
        </button>

        <button style={styles.menuBtn}>
          <Music size={18} />
          Músicas
        </button>

        <button style={styles.menuBtn}>
          <Heart size={18} />
          Favoritos
        </button>

        <button style={styles.menuBtn}>
          <ListMusic size={18} />
          Playlists
        </button>

        <button style={styles.uploadBtn}>
          <Upload size={18} />
          Upload
        </button>

        <button
          style={styles.logoutBtn}
          onClick={logout}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.topbar}>
          <button
            style={styles.mobileBtn}
            onClick={() =>
              setMenuAberto(!menuAberto)
            }
          >
            {menuAberto ? <X /> : <Menu />}
          </button>

          <div style={styles.searchBox}>
            <Search
              size={18}
              color="#1DB954"
            />

            <input
              style={styles.searchInput}
              placeholder="Buscar músicas..."
              value={busca}
              onChange={(e) =>
                setBusca(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                buscarYoutube()
              }
            />

            <button
              style={styles.searchBtn}
              onClick={buscarYoutube}
            >
              Buscar
            </button>
          </div>

          <img
            src={user.foto}
            alt=""
            style={styles.avatar}
          />
        </div>

        <h1 style={styles.bigTitle}>
          Boa noite 👋
        </h1>

        <h2 style={styles.sectionTitle}>
          🔥 Músicas em alta
        </h2>

        <div style={styles.grid}>
          {trendingMusics.map((m) => (
            <div
              key={m.id}
              style={styles.card}
            >
              <img
                src={m.capa}
                alt=""
                style={styles.cardImg}
              />

              <p style={styles.cardTitle}>
                {m.titulo}
              </p>

              <p style={styles.cardArtist}>
                {m.artista}
              </p>

              <div
                style={styles.cardActions}
              >
                <button
                  style={styles.iconBtn}
                  onClick={() =>
                    tocarMusica(
                      m,
                      trendingMusics
                    )
                  }
                >
                  <Play size={18} />
                </button>

                <button
                  style={styles.iconBtn}
                  onClick={() =>
                    toggleFavorito(m)
                  }
                >
                  <Heart size={18} />
                </button>

                <button
                  style={styles.downloadBtn}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 style={styles.sectionTitle}>
          🎤 Artistas em alta
        </h2>

        <div style={styles.artistGrid}>
          {trendingArtists.map((a) => (
            <div
              key={a.id}
              style={styles.artistCard}
            >
              <img
                src={a.foto}
                alt=""
                style={styles.artistImg}
              />

              <p style={styles.artistName}>
                {a.nome}
              </p>
            </div>
          ))}
        </div>

        {resultadosYoutube.length >
          0 && (
          <>
            <h2
              style={
                styles.sectionTitle
              }
            >
              🎬 Resultados
            </h2>

            <div style={styles.grid}>
              {resultadosYoutube.map(
                (m) => (
                  <div
                    key={m.id}
                    style={styles.card}
                  >
                    <img
                      src={m.capa}
                      alt=""
                      style={
                        styles.cardImg
                      }
                    />

                    <p
                      style={
                        styles.cardTitle
                      }
                    >
                      {m.titulo}
                    </p>

                    <div
                      style={
                        styles.cardActions
                      }
                    >
                      <button
                        style={
                          styles.iconBtn
                        }
                        onClick={() =>
                          tocarMusica(
                            m,
                            resultadosYoutube
                          )
                        }
                      >
                        <Play size={18} />
                      </button>

                      <button
                        style={
                          styles.iconBtn
                        }
                        onClick={() =>
                          toggleFavorito(
                            m
                          )
                        }
                      >
                        <Heart size={18} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {musicaTocando && (
        <div style={styles.player}>
          <div style={styles.playerLeft}>
            <img
              src={musicaTocando.capa}
              alt=""
              style={styles.playerImg}
            />

            <div>
              <p
                style={
                  styles.playerTitle
                }
              >
                {
                  musicaTocando.titulo
                }
              </p>

              <p
                style={
                  styles.playerArtist
                }
              >
                {
                  musicaTocando.artista
                }
              </p>
            </div>
          </div>

          <div style={styles.controls}>
            <button
              style={
                styles.playerBtn
              }
              onClick={
                tocarAnterior
              }
            >
              <SkipBack />
            </button>

            <button
              style={styles.playBtn}
              onClick={
                togglePlayPause
              }
            >
              {tocando ? (
                <Pause />
              ) : (
                <Play />
              )}
            </button>

            <button
              style={
                styles.playerBtn
              }
              onClick={
                tocarProxima
              }
            >
              <SkipForward />
            </button>

            <button
              style={
                styles.playerBtn
              }
              onClick={() =>
                setShuffle(
                  !shuffle
                )
              }
            >
              <Shuffle />
            </button>

            <button
              style={
                styles.playerBtn
              }
              onClick={() =>
                setRepeat(
                  !repeat
                )
              }
            >
              <Repeat />
            </button>
          </div>

          <audio
            ref={audioRef}
            onEnded={tocarProxima}
          />
        </div>
      )}

      {videoYoutube && (
        <YouTube
          videoId={videoYoutube}
          opts={{
            width: "1",
            height: "1",
            playerVars: {
              autoplay: 1
            }
          }}
          onReady={(e) => {
            youtubePlayerRef.current =
              e.target;
          }}
        />
      )}
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#121212",
    color: "white",
    overflow: "hidden"
  },

  login: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#000,#1DB954)"
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
    color: "#1DB954"
  },

  sub: {
    color: "#aaa",
    marginTop: 10
  },

  loginBtn: {
    marginTop: 25,
    width: "100%",
    padding: 15,
    borderRadius: 50,
    border: "none",
    background: "#1DB954",
    fontWeight: "bold",
    cursor: "pointer"
  },

  sidebar: {
    width: 260,
    background: "#000",
    padding: 20,
    position: "fixed",
    top: 0,
    bottom: 0,
    transition: ".3s",
    zIndex: 999
  },

  logoSmall: {
    color: "#1DB954"
  },

  menuBtn: {
    width: "100%",
    background: "transparent",
    border: "none",
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    cursor: "pointer",
    borderRadius: 12,
    marginBottom: 8
  },

  uploadBtn: {
    width: "100%",
    background: "#1DB954",
    border: "none",
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    cursor: "pointer",
    fontWeight: "bold"
  },

  logoutBtn: {
    width: "100%",
    background: "#222",
    border: "none",
    color: "white",
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    cursor: "pointer"
  },

  content: {
    flex: 1,
    marginLeft: 260,
    padding: 20,
    overflowY: "auto",
    paddingBottom: 120
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15
  },

  mobileBtn: {
    background: "#1DB954",
    border: "none",
    padding: 10,
    borderRadius: 10,
    cursor: "pointer"
  },

  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#1e1e1e",
    padding: "10px 15px",
    borderRadius: 50
  },

  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "white"
  },

  searchBtn: {
    background: "#1DB954",
    border: "none",
    padding: "8px 15px",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: "bold"
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%"
  },

  bigTitle: {
    fontSize: 38,
    fontWeight: "bold",
    marginTop: 30
  },

  sectionTitle: {
    marginTop: 35,
    marginBottom: 20,
    fontSize: 24
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(180px,1fr))",
    gap: 20
  },

  card: {
    background: "#181818",
    padding: 15,
    borderRadius: 20,
    transition: ".2s"
  },

  cardImg: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    borderRadius: 14
  },

  cardTitle: {
    fontWeight: "bold",
    marginTop: 10
  },

  cardArtist: {
    color: "#aaa",
    fontSize: 14
  },

  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12
  },

  iconBtn: {
    background: "#1DB954",
    border: "none",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer"
  },

  downloadBtn: {
    background: "#8e44ad",
    border: "none",
    padding: 10,
    borderRadius: 12,
    color: "white",
    cursor: "pointer"
  },

  artistGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(180px,1fr))",
    gap: 20
  },

  artistCard: {
    background: "#181818",
    padding: 20,
    borderRadius: 20,
    textAlign: "center"
  },

  artistImg: {
    width: 140,
    height: 140,
    borderRadius: "50%",
    objectFit: "cover"
  },

  artistName: {
    marginTop: 15,
    fontWeight: "bold"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 90,
    background: "#111",
    borderTop: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    zIndex: 999
  },

  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },

  playerImg: {
    width: 55,
    height: 55,
    borderRadius: 12
  },

  playerTitle: {
    margin: 0,
    fontWeight: "bold"
  },

  playerArtist: {
    margin: 0,
    color: "#aaa",
    fontSize: 13
  },

  controls: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },

  playBtn: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    border: "none",
    background: "#1DB954",
    cursor: "pointer"
  },

  playerBtn: {
    background: "#222",
    border: "none",
    color: "white",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer"
  },

  toast: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1DB954",
    padding: "12px 20px",
    borderRadius: 30,
    color: "#000",
    fontWeight: "bold",
    zIndex: 999999
  }
};

