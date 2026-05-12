import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";

// ============================================
// URL DA API - DINÂMICA PARA PRODUÇÃO E DESENVOLVIMENTO
// ============================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function App() {
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState({});
  const [favoritos, setFavoritos] = useState([]);
  const [musicas, setMusicas] = useState([]);
  const [resultadosYoutube, setResultadosYoutube] = useState([]);
  const [novaPlaylist, setNovaPlaylist] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [abaAtual, setAbaAtual] = useState("local");

  const [musicaTocando, setMusicaTocando] = useState(null);
  const [videoYoutube, setVideoYoutube] = useState(null);

  const [modalPlaylist, setModalPlaylist] = useState(false);
  const [musicaSelecionada, setMusicaSelecionada] = useState(null);
  const [playlistSelecionada, setPlaylistSelecionada] = useState(null);

  const [filaReproducao, setFilaReproducao] = useState([]);
  const [indiceFila, setIndiceFila] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);

  // ============================================
  // MOBILE CHECK
  // ============================================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fechar sidebar quando mudar de mobile pra desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarAberta(false);
    }
  }, [isMobile]);

  const mostrarMsg = (texto) => {
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 3000);
  };

  // ============================================
  // CARREGAR USER
  // ============================================
  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          carregarPlaylists();
          carregarFavoritos();
          carregarMusicas();
        }
      });
  }, []);

  const carregarPlaylists = async () => {
    const res = await fetch(`${API_URL}/api/playlists`, {
      credentials: "include",
    });
    const data = await res.json();
    setPlaylists(data);
  };

  const carregarFavoritos = async () => {
    const res = await fetch(`${API_URL}/api/favoritos`, {
      credentials: "include",
    });
    const data = await res.json();
    setFavoritos(data);
  };

  const carregarMusicas = async () => {
    const res = await fetch(`${API_URL}/api/musicas`, {
      credentials: "include",
    });
    const data = await res.json();
    setMusicas(data.dados || []);
  };

  // ============================================
  // BUSCAR YOUTUBE
  // ============================================
  const buscarYoutube = async () => {
    if (!busca.trim()) return;

    setBuscando(true);
    setAbaAtual("youtube");

    try {
      const res = await fetch(
        `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}`
      );
      const data = await res.json();
      setResultadosYoutube(data.dados || []);
    } catch (err) {}

    setBuscando(false);
  };

  // ============================================
  // PLAYLISTS
  // ============================================
  const criarPlaylist = async () => {
    if (!novaPlaylist.trim()) return;

    await fetch(`${API_URL}/api/playlists/${novaPlaylist}`, {
      method: "POST",
      credentials: "include",
    });

    setNovaPlaylist("");
    carregarPlaylists();
    mostrarMsg(`✅ Playlist "${novaPlaylist}" criada!`);
  };

  const deletarPlaylist = async (nome) => {
    if (confirm(`Deletar "${nome}"?`)) {
      await fetch(`${API_URL}/api/playlists/${nome}`, {
        method: "DELETE",
        credentials: "include",
      });

      carregarPlaylists();
      mostrarMsg(`🗑️ Playlist "${nome}" deletada`);
    }
  };

  const adicionarAPlaylist = async (playlistNome, musicaId) => {
    await fetch(
      `${API_URL}/api/playlists/${playlistNome}/${musicaId}`,
      { method: "POST", credentials: "include" }
    );

    carregarPlaylists();
    setModalPlaylist(false);
    mostrarMsg(`📋 Adicionado à playlist "${playlistNome}"`);
  };

  const removerDaPlaylist = async (playlistNome, musicaId) => {
    await fetch(
      `${API_URL}/api/playlists/${playlistNome}/${musicaId}`,
      { method: "DELETE", credentials: "include" }
    );

    carregarPlaylists();
    mostrarMsg(`❌ Removido da playlist`);
  };

  // ============================================
  // FAVORITOS
  // ============================================
  const toggleFavorito = async (id) => {
    const ehFavorito = favoritos.includes(id);

    await fetch(`${API_URL}/api/favoritos/${id}`, {
      method: ehFavorito ? "DELETE" : "POST",
      credentials: "include",
    });

    carregarFavoritos();
    mostrarMsg(ehFavorito ? "💔 Removido dos favoritos" : "❤️ Adicionado aos favoritos");
  };

  const removerFavoritoDireto = async (id) => {
    await fetch(`${API_URL}/api/favoritos/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    carregarFavoritos();
    mostrarMsg("💔 Removido dos favoritos");
  };

  // ============================================
  // FUNÇÃO CENTRAL PARA TOCAR
  // ============================================
  const tocarMusica = (musica) => {
    if (!musica) return;

    setMusicaTocando(musica);

    // PARAR TUDO ANTES
    if (audioRef.current) audioRef.current.pause();
    if (youtubePlayerRef.current) youtubePlayerRef.current.stopVideo();

    if (musica.fonte === "youtube") {
      setVideoYoutube(musica.videoId);
    } else {
      setVideoYoutube(null);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = musica.url;
          audioRef.current.play().catch((e) => console.log(e));
        }
      }, 200);
    }
  };

  // ============================================
  // PRÓXIMA MÚSICA AUTOMÁTICA
  // ============================================
  const tocarProximaAutomatica = () => {
    if (filaReproducao.length === 0) {
      mostrarMsg("⚠️ Nenhuma fila ativa!");
      return;
    }

    setIndiceFila((prev) => {
      const proximoIndex = prev + 1;

      if (proximoIndex < filaReproducao.length) {
        const proxima = filaReproducao[proximoIndex];

        setMusicaTocando(proxima);

        if (audioRef.current) audioRef.current.pause();
        if (youtubePlayerRef.current) youtubePlayerRef.current.stopVideo();

        if (proxima.fonte === "youtube") {
          setVideoYoutube(proxima.videoId);
        } else {
          setVideoYoutube(null);

          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = proxima.url;
              audioRef.current.play().catch((e) => console.log(e));
            }
          }, 200);
        }

        mostrarMsg(`⏭️ ${proxima.titulo.substring(0, 30)}`);
        return proximoIndex;
      }

      setMusicaTocando(null);
      setVideoYoutube(null);
      setFilaReproducao([]);
      mostrarMsg("✅ Fim da playlist!");
      return 0;
    });
  };

  // ============================================
  // EVENTO AUTOMÁTICO MP3 ENDED
  // ============================================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const endedHandler = () => {
      tocarProximaAutomatica();
    };

    audio.addEventListener("ended", endedHandler);

    return () => {
      audio.removeEventListener("ended", endedHandler);
    };
  }, [filaReproducao]);

  // ============================================
  // TOCAR PLAYLIST
  // ============================================
  const tocarPlaylist = (playlistNome) => {
    const musicasIds = playlists[playlistNome] || [];

    if (musicasIds.length === 0) {
      mostrarMsg(`⚠️ Playlist "${playlistNome}" está vazia!`);
      return;
    }

    const todasMusicas = [...musicas, ...resultadosYoutube];

    const musicasParaTocar = musicasIds
      .map((id) => todasMusicas.find((m) => m.id === id))
      .filter((m) => m);

    if (musicasParaTocar.length === 0) {
      mostrarMsg("⚠️ Nenhuma música encontrada!");
      return;
    }

    setFilaReproducao(musicasParaTocar);
    setIndiceFila(0);

    tocarMusica(musicasParaTocar[0]);
    mostrarMsg(`▶️ Tocando playlist: ${playlistNome} (${musicasParaTocar.length} músicas)`);
  };

  // ============================================
  // TOCAR FAVORITOS
  // ============================================
  const tocarFavoritos = () => {
    if (favoritos.length === 0) {
      mostrarMsg("⚠️ Nenhum favorito para tocar!");
      return;
    }

    const todasMusicas = [...musicas, ...resultadosYoutube];

    const musicasFavoritas = favoritos
      .map((id) => todasMusicas.find((m) => m.id === id))
      .filter((m) => m);

    if (musicasFavoritas.length === 0) {
      mostrarMsg("⚠️ Nenhuma música favorita encontrada!");
      return;
    }

    setFilaReproducao(musicasFavoritas);
    setIndiceFila(0);

    tocarMusica(musicasFavoritas[0]);
    mostrarMsg(`⭐ Tocando favoritos (${musicasFavoritas.length} músicas)`);
  };

  // ============================================
  // LOGIN / LOGOUT
  // ============================================
  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/logout`, { credentials: "include" });
    setUser(null);
  };

  // ============================================
  // YOUTUBE EVENTS
  // ============================================
  const onYoutubeReady = (event) => {
    youtubePlayerRef.current = event.target;
    event.target.playVideo();
  };

  const onYoutubeStateChange = (event) => {
    if (event.data === 0) {
      tocarProximaAutomatica();
    }
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={{ color: "#1DB954", fontSize: "32px", marginBottom: "20px" }}>🎵 Meu Spotify</h1>
          <button onClick={login} style={styles.btnLogin}>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  const musicasParaExibir = abaAtual === "youtube" ? resultadosYoutube : musicas;

  return (
    <div style={styles.container}>
      {mensagem && <div style={styles.mensagem}>{mensagem}</div>}

      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>🎵 Meu Spotify</h1>

          <div style={styles.userArea}>
            {isMobile && (
              <button
                onClick={() => setSidebarAberta(!sidebarAberta)}
                style={styles.btnMenu}
              >
                ☰
              </button>
            )}

            <img src={user.foto} style={styles.avatar} alt="" />
            <span style={{ color: "white" }}>{user.nome.split(" ")[0]}</span>
            <button onClick={logout} style={styles.btnSair}>
              Sair
            </button>
          </div>
        </div>

        <div style={styles.buscaContainer}>
          <input
            type="text"
            placeholder="🔍 Buscar no YouTube..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarYoutube()}
            style={styles.buscaInput}
          />

          <button onClick={buscarYoutube} disabled={buscando} style={styles.btnBuscar}>
            {buscando ? "..." : "🎬"}
          </button>
        </div>
      </div>

      <div style={styles.abas}>
        <button
          onClick={() => setAbaAtual("local")}
          style={{
            ...styles.aba,
            background: abaAtual === "local" ? "#1DB954" : "#333",
          }}
        >
          📁 Minhas ({musicas.length})
        </button>

        <button
          onClick={() => setAbaAtual("youtube")}
          style={{
            ...styles.aba,
            background: abaAtual === "youtube" ? "#ff0000" : "#333",
          }}
        >
          🎬 YouTube ({resultadosYoutube.length})
        </button>
      </div>

      <div style={styles.mainContent}>
        {isMobile && sidebarAberta && (
          <div 
            style={styles.overlay} 
            onClick={() => setSidebarAberta(false)}
          />
        )}

        <div
          style={{
            ...styles.sidebar,
            ...(isMobile && {
              position: "fixed",
              left: sidebarAberta ? "0" : "-100%",
              top: 0,
              height: "100vh",
              zIndex: 1000,
              transition: "left 0.3s ease",
              borderRadius: 0,
              width: "280px",
            }),
          }}
        >
          <div style={styles.criarPlaylist}>
            <input
              type="text"
              placeholder="Nova playlist"
              value={novaPlaylist}
              onChange={(e) => setNovaPlaylist(e.target.value)}
              style={styles.inputPlaylist}
            />
            <button onClick={criarPlaylist} style={styles.btnCriar}>
              +
            </button>
          </div>

          <h3 style={styles.sectionTitle}>📀 Playlists</h3>

          {Object.keys(playlists).length === 0 && (
            <p style={{ color: "gray" }}>Crie sua primeira playlist!</p>
          )}

          {Object.keys(playlists).map((nome) => (
            <div key={nome} style={styles.playlistItem}>
              <div style={styles.playlistHeader}>
                <span
                  onClick={() =>
                    setPlaylistSelecionada(playlistSelecionada === nome ? null : nome)
                  }
                  style={styles.playlistNome}
                >
                  📀 {nome} ({playlists[nome]?.length || 0})
                </span>

                <div>
                  <button onClick={() => tocarPlaylist(nome)} style={styles.btnPlay}>
                    ▶️
                  </button>
                  <button onClick={() => deletarPlaylist(nome)} style={styles.btnDeletar}>
                    🗑️
                  </button>
                </div>
              </div>

              {playlistSelecionada === nome && (
                <div style={styles.playlistMusicas}>
                  {playlists[nome]?.map((musicaId) => {
                    const todas = [...musicas, ...resultadosYoutube];
                    const m = todas.find((x) => x.id === musicaId);

                    return m ? (
                      <div key={musicaId} style={styles.playlistMusicaItem}>
                        <span onClick={() => tocarMusica(m)}>
                          {m.titulo.substring(0, 25)}
                        </span>
                        <button onClick={() => removerDaPlaylist(nome, musicaId)}>❌</button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15 }}>
            <h3 style={styles.sectionTitle}>⭐ Favoritos</h3>
            <button onClick={tocarFavoritos} style={styles.btnPlay}>
              ▶️ Tocar
            </button>
          </div>

          {favoritos.map((id) => {
            const todas = [...musicas, ...resultadosYoutube];
            const m = todas.find((x) => x.id === id);

            return m ? (
              <div key={id} style={styles.favoritoItem}>
                <span onClick={() => tocarMusica(m)}>{m.titulo.substring(0, 30)}</span>
                <button onClick={() => removerFavoritoDireto(id)}>❌</button>
              </div>
            ) : null;
          })}

          {isMobile && sidebarAberta && (
            <button onClick={() => setSidebarAberta(false)} style={styles.btnFecharSidebar}>
              ✕ Fechar Menu
            </button>
          )}
        </div>

        <div style={styles.content}>
          <h3 style={styles.contentTitle}>
            {abaAtual === "youtube" ? "🎬 Resultados do YouTube" : "📁 Suas Músicas"}
          </h3>

          {musicasParaExibir.length === 0 && (
            <div style={styles.emptyState}>
              {abaAtual === "local"
                ? "📭 Nenhuma música encontrada"
                : "🎬 Digite algo e clique em 🎬 YouTube"}
            </div>
          )}

          <div style={styles.grid}>
            {musicasParaExibir.map((m) => (
              <div key={m.id} style={styles.card}>
                <img src={m.capa} alt="" style={styles.capa} />
                <h4 style={styles.cardTitulo}>{m.titulo.substring(0, 25)}</h4>
                <p style={styles.cardArtista}>{m.artista?.substring(0, 20) || "Artista"}</p>

                <div style={styles.cardBotoes}>
                  <button
                    onClick={() => tocarMusica(m)}
                    style={{
                      ...styles.btn,
                      background: m.fonte === "youtube" ? "#ff0000" : "#1DB954",
                    }}
                  >
                    {m.fonte === "youtube" ? "🎬" : "▶️"}
                  </button>

                  <button
                    onClick={() => toggleFavorito(m.id)}
                    style={{
                      ...styles.btn,
                      background: favoritos.includes(m.id) ? "#ff4444" : "#555",
                    }}
                  >
                    {favoritos.includes(m.id) ? "❤️" : "🤍"}
                  </button>

                  <button
                    onClick={() => {
                      setMusicaSelecionada(m);
                      setModalPlaylist(true);
                    }}
                    style={{ ...styles.btn, background: "#333" }}
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLAYER FIXO MP3 COM CONTROLS */}
      {musicaTocando && musicaTocando.fonte !== "youtube" && (
        <div style={styles.playerLocal}>
          <div>
            <h4 style={{ margin: 0 }}>{musicaTocando.titulo}</h4>
            {filaReproducao.length > 0 && (
              <p style={{ fontSize: 11, margin: 0 }}>
                🎵 {indiceFila + 1} de {filaReproducao.length}
              </p>
            )}
          </div>

          <div style={{ width: "55%" }}>
            <audio ref={audioRef} controls style={{ width: "100%" }} />
          </div>

          <div>
            <button onClick={tocarProximaAutomatica} style={styles.btnProxima}>
              ⏭️ Próxima
            </button>
          </div>
        </div>
      )}

      {/* PLAYER FIXO YOUTUBE */}
      {videoYoutube && (
        <div style={styles.playerYoutube}>
          <div style={styles.playerYoutubeHeader}>
            <span>🎬 YouTube</span>
            <button
              onClick={() => {
                setVideoYoutube(null);
                setMusicaTocando(null);
              }}
            >
              ✕
            </button>
          </div>

          <YouTube
            key={videoYoutube}
            videoId={videoYoutube}
            opts={{
              width: "100%",
              height: "200",
              playerVars: {
                autoplay: 1,
              },
            }}
            onReady={onYoutubeReady}
            onStateChange={onYoutubeStateChange}
          />

          <div style={{ padding: "10px" }}>
            <button onClick={tocarProximaAutomatica} style={styles.btnProxima}>
              ⏭️ Próxima
            </button>
          </div>
        </div>
      )}

      {/* MODAL PLAYLIST */}
      {modalPlaylist && musicaSelecionada && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Adicionar à playlist</h3>
            <p>{musicaSelecionada.titulo.substring(0, 40)}</p>

            {Object.keys(playlists).map((nome) => (
              <button
                key={nome}
                onClick={() => adicionarAPlaylist(nome, musicaSelecionada.id)}
                style={styles.modalBtn}
              >
                📀 {nome}
              </button>
            ))}

            <button onClick={() => setModalPlaylist(false)} style={styles.modalClose}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    paddingBottom: "120px",
  },
  mensagem: {
    position: "fixed",
    top: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1DB954",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    zIndex: 2000,
    fontSize: "13px",
  },
  loginContainer: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  loginCard: {
    background: "black",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
  },
  btnLogin: {
    background: "#1DB954",
    border: "none",
    padding: "12px 30px",
    borderRadius: "25px",
    color: "white",
    cursor: "pointer",
    marginTop: "20px",
    fontSize: "16px",
  },
  header: {
    background: "rgba(0,0,0,0.9)",
    padding: "12px 15px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  title: { color: "#1DB954", margin: 0, fontSize: "1.4rem" },
  userArea: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: { width: "35px", height: "35px", borderRadius: "50%" },
  btnSair: {
    background: "#ff4444",
    border: "none",
    padding: "5px 12px",
    borderRadius: "15px",
    color: "white",
    cursor: "pointer",
  },
  btnMenu: {
    background: "#333",
    border: "none",
    padding: "5px 12px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontSize: "18px",
  },
  buscaContainer: { display: "flex", gap: "8px" },
  buscaInput: {
    flex: 1,
    padding: "10px 15px",
    borderRadius: "25px",
    border: "none",
    fontSize: "14px",
  },
  btnBuscar: {
    background: "#ff0000",
    border: "none",
    padding: "10px 20px",
    borderRadius: "25px",
    color: "white",
    cursor: "pointer",
  },
  abas: { display: "flex", padding: "10px 12px 0 12px", gap: "8px" },
  aba: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "12px 12px 0 0",
    cursor: "pointer",
    color: "white",
    fontSize: "14px",
  },
  mainContent: { display: "flex", padding: "12px", gap: "12px", flexWrap: "wrap", position: "relative" },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 999,
  },
  sidebar: {
    background: "rgba(0,0,0,0.6)",
    borderRadius: "12px",
    padding: "15px",
    width: "280px",
    maxHeight: "calc(100vh - 180px)",
    overflowY: "auto",
  },
  sectionTitle: { color: "#1DB954", marginBottom: "10px", fontSize: "16px" },
  criarPlaylist: { display: "flex", gap: "8px", marginBottom: "15px" },
  inputPlaylist: { flex: 1, padding: "8px", borderRadius: "8px", border: "none" },
  btnCriar: {
    background: "#1DB954",
    border: "none",
    padding: "8px 15px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  playlistItem: { marginBottom: "8px" },
  playlistHeader: {
    background: "rgba(255,255,255,0.1)",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playlistNome: { cursor: "pointer", flex: 1, fontSize: "13px", color: "white" },
  btnPlay: {
    background: "#1DB954",
    border: "none",
    padding: "4px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "11px",
  },
  btnDeletar: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", marginLeft: "5px" },
  playlistMusicas: { paddingLeft: "12px", marginTop: "5px" },
  playlistMusicaItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px",
    fontSize: "11px",
    color: "gray",
    alignItems: "center",
  },
  favoritoItem: {
    background: "rgba(255,255,255,0.1)",
    padding: "8px",
    borderRadius: "8px",
    marginBottom: "5px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    color: "white",
  },
  content: { flex: 1, background: "rgba(0,0,0,0.6)", borderRadius: "12px", padding: "15px" },
  contentTitle: { color: "white", fontSize: "16px", marginBottom: "15px" },
  emptyState: { textAlign: "center", padding: "40px", color: "gray" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" },
  card: { background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", textAlign: "center" },
  capa: { width: "100%", borderRadius: "8px", marginBottom: "8px" },
  cardTitulo: { color: "white", fontSize: "11px", margin: "5px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardArtista: { color: "gray", fontSize: "9px", margin: "5px 0" },
  cardBotoes: { display: "flex", gap: "5px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" },
  btn: { border: "none", padding: "5px 10px", borderRadius: "15px", cursor: "pointer", fontSize: "11px", color: "white" },

  playerLocal: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "black",
    padding: "12px 15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #1DB954",
    zIndex: 2000,
    color: "white",
    gap: "15px",
    flexWrap: "wrap",
  },

  btnProxima: {
    background: "#1DB954",
    border: "none",
    padding: "8px 20px",
    borderRadius: "25px",
    cursor: "pointer",
    color: "white",
  },

  playerYoutube: {
    position: "fixed",
    bottom: "140px",
    right: "20px",
    width: "350px",
    background: "black",
    borderRadius: "10px",
    zIndex: 3000,
    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },

  playerYoutubeHeader: {
    padding: "8px",
    background: "#222",
    display: "flex",
    justifyContent: "space-between",
    color: "white",
  },

  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4000,
  },

  modalContent: {
    background: "#222",
    padding: "20px",
    borderRadius: "15px",
    width: "280px",
    color: "white",
  },

  modalBtn: {
    display: "block",
    width: "100%",
    background: "#1DB954",
    border: "none",
    padding: "10px",
    margin: "5px 0",
    borderRadius: "8px",
    cursor: "pointer",
    color: "white",
  },

  modalClose: {
    width: "100%",
    background: "#555",
    border: "none",
    padding: "10px",
    marginTop: "15px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "white",
  },

  btnFecharSidebar: {
    marginTop: "15px",
    background: "#ff4444",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    width: "100%",
  },
};

export default App;