import { useEffect, useRef, useState, useCallback } from "react";
import YouTube from "react-youtube";
import {
  Home,
  Music,
  Heart,
  ListMusic,
  LogOut,
  Upload,
  Trash2,
  Pencil,
  Play,
  Pause,
  Search,
  Plus,
  SkipForward,
  SkipBack,
  Menu,
  X,
  Flame,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  XCircle,
  ExternalLink
} from "lucide-react";

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

export default function App() {
  const [user, setUser] = useState(null);
  const [musicas, setMusicas] = useState([]);
  const [playlists, setPlaylists] = useState({});
  const [favoritos, setFavoritos] = useState([]);
  const [aba, setAba] = useState("home");
  const [musicaTocando, setMusicaTocando] = useState(null);
  const [fila, setFila] = useState([]);
  const [indiceFila, setIndiceFila] = useState(0);
  const [videoYoutube, setVideoYoutube] = useState(null);
  const youtubePlayerRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [mensagem, setMensagem] = useState("");
  const [modalUpload, setModalUpload] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState(null);
  const [tituloUpload, setTituloUpload] = useState("");
  const [subindo, setSubindo] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(false);
  const [confirmTexto, setConfirmTexto] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [editarMusicaId, setEditarMusicaId] = useState(null);
  const [editarTitulo, setEditarTitulo] = useState("");
  const [busca, setBusca] = useState("");
  const [resultadosYoutube, setResultadosYoutube] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [topYoutube, setTopYoutube] = useState([]);
  const [trendingMusics, setTrendingMusics] = useState([]);
  const [trendingArtists, setTrendingArtists] = useState([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [volume, setVolume] = useState(70);
  const [loading, setLoading] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none");
  const [shuffleMode, setShuffleMode] = useState(false);
  const [destaqueBusca, setDestaqueBusca] = useState(false);
  
  // Modal states
  const [modalPlaylist, setModalPlaylist] = useState(false);
  const [novaPlaylistNome, setNovaPlaylistNome] = useState("");
  const [modalAddToPlaylist, setModalAddToPlaylist] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [modalRemoveFromPlaylist, setModalRemoveFromPlaylist] = useState(false);
  const [removePlaylistName, setRemovePlaylistName] = useState("");
  const [removeMusicId, setRemoveMusicId] = useState("");

  const mostrarMsg = useCallback((txt) => {
    setMensagem(txt);
    setTimeout(() => setMensagem(""), 3000);
  }, []);

  // Mobile detect
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMenuAberto(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Setup audio events
  useEffect(() => {
    const audio = audioRef.current;
    
    const onEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        tocarProxima();
      }
    };
    
    const onTimeUpdate = () => {
      if (audio.currentTime) {
        setTempoAtual(audio.currentTime);
      }
    };
    
    const onLoadedMetadata = () => {
      setDuracao(audio.duration);
      setTempoAtual(0);
    };
    
    const onPlay = () => setTocando(true);
    const onPause = () => setTocando(false);
    const onError = (e) => {
      console.error("Erro no audio:", e);
      mostrarMsg("Erro ao reproduzir música");
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    
    audio.volume = volume / 100;

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [repeatMode, mostrarMsg]);

  // Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Carregar dados do usuário
  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          carregarTudo();
        }
      });
  }, []);

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/logout`, { credentials: "include" });
    setUser(null);
    setMusicaTocando(null);
    setVideoYoutube(null);
    setFila([]);
    setIndiceFila(0);
    audioRef.current.pause();
    audioRef.current.src = "";
  };

  const carregarTudo = async () => {
    await Promise.all([
      carregarMusicas(),
      carregarPlaylists(),
      carregarFavoritos(),
      carregarTopYoutube(),
      carregarTrendings()
    ]);
  };

  const carregarMusicas = async () => {
    const res = await fetch(`${API_URL}/api/musicas`, { credentials: "include" });
    const data = await res.json();
    setMusicas(data.dados || []);
  };

  const carregarPlaylists = async () => {
    const res = await fetch(`${API_URL}/api/playlists`, { credentials: "include" });
    const data = await res.json();
    setPlaylists(data || {});
  };

  const carregarFavoritos = async () => {
    const res = await fetch(`${API_URL}/api/favoritos`, { credentials: "include" });
    const data = await res.json();
    setFavoritos(data || []);
  };

  const carregarTopYoutube = async () => {
    const res = await fetch(`${API_URL}/api/top-youtube`);
    const data = await res.json();
    setTopYoutube(data.dados || []);
  };

  const carregarTrendings = async () => {
    try {
      const [musicRes, artistRes] = await Promise.all([
        fetch(`${API_URL}/api/trending-music?region=BR`),
        fetch(`${API_URL}/api/trending-artists?region=BR`)
      ]);
      const musicData = await musicRes.json();
      const artistData = await artistRes.json();
      if (musicData.success) setTrendingMusics(musicData.dados || []);
      if (artistData.success) setTrendingArtists(artistData.dados || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir artista no YouTube
  const abrirArtistaYoutube = (artistaNome) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(artistaNome)}`;
    window.open(searchUrl, "_blank");
  };

  // Player functions
  const tocarMusica = async (musica, listaAtual = null) => {
    if (!musica) return;
    setLoading(true);

    let lista = listaAtual;
    if (!lista && shuffleMode && fila.length > 0) {
      lista = [...fila];
    } else if (!lista) {
      lista = [musica];
    }

    if (lista && Array.isArray(lista)) {
      setFila(lista);
      const idx = lista.findIndex((x) => x.id === musica.id);
      setIndiceFila(idx >= 0 ? idx : 0);
    }

    setMusicaTocando(musica);
    setTempoAtual(0);
    setDuracao(0);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.stopVideo();
    }
    setVideoYoutube(null);

    if (musica.fonte !== "youtube" && musica.url) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = musica.url;
        audioRef.current.load();
        
        audioRef.current.oncanplay = async () => {
          try {
            await audioRef.current.play();
            setTocando(true);
            setLoading(false);
          } catch (err) {
            console.error("Erro ao dar play:", err);
            mostrarMsg("Erro ao reproduzir música");
            setLoading(false);
          }
        };
        
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            mostrarMsg("Erro de conexão com o servidor");
          }
        }, 5000);
        
      } catch (error) {
        console.error("Erro ao tocar:", error);
        mostrarMsg("Erro ao reproduzir música");
        setLoading(false);
      }
    } 
    else if (musica.videoId) {
      setVideoYoutube(musica.videoId);
      setTocando(true);
      setLoading(false);
    } else {
      mostrarMsg("URL da música não encontrada");
      setLoading(false);
    }
  };

  const tocarFila = (lista) => {
    if (!lista || lista.length === 0) {
      mostrarMsg("Nenhuma música na lista");
      return;
    }
    let novaFila = shuffleMode ? [...lista].sort(() => Math.random() - 0.5) : [...lista];
    setFila(novaFila);
    setIndiceFila(0);
    tocarMusica(novaFila[0], novaFila);
  };

  const tocarProxima = () => {
    if (!fila.length) return;
    
    let prox = indiceFila + 1;
    if (prox >= fila.length) {
      if (repeatMode === "all") {
        prox = 0;
      } else {
        mostrarMsg("🎵 Fim da fila!");
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

  const togglePlayPause = () => {
    if (!musicaTocando) return;

    if (musicaTocando.fonte === "youtube") {
      if (!youtubePlayerRef.current) return;
      if (tocando) {
        youtubePlayerRef.current.pauseVideo();
        setTocando(false);
      } else {
        youtubePlayerRef.current.playVideo();
        setTocando(true);
      }
    } else {
      if (tocando) {
        audioRef.current.pause();
        setTocando(false);
      } else {
        audioRef.current.play().catch(e => {
          console.error(e);
          mostrarMsg("Erro ao continuar reprodução");
        });
        setTocando(true);
      }
    }
  };

  const toggleRepeat = () => {
    const modes = ["none", "one", "all"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
    mostrarMsg(`Repetição: ${modes[nextIndex] === "none" ? "desativada" : modes[nextIndex] === "one" ? "uma música" : "todas"}`);
  };

  const toggleShuffle = () => {
    setShuffleMode(!shuffleMode);
    mostrarMsg(shuffleMode ? "Aleatório desativado" : "Aleatório ativado");
  };

  const onYoutubeReady = (event) => {
    youtubePlayerRef.current = event.target;
    event.target.playVideo();
    setTocando(true);
  };

  const onYoutubeStateChange = (event) => {
    if (event.data === 0) tocarProxima();
    if (event.data === 1) setTocando(true);
    if (event.data === 2) setTocando(false);
  };

  const formatarTempo = (segundos) => {
    if (!segundos || isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleProgressChange = (e) => {
    const novoTempo = Number(e.target.value);
    if (musicaTocando?.fonte !== "youtube" && audioRef.current) {
      audioRef.current.currentTime = novoTempo;
      setTempoAtual(novoTempo);
    }
  };

  // Favoritos
  const estaNosFavoritos = (id) => favoritos.some((m) => m.id === id);

  const toggleFavorito = async (musica) => {
    const eh = estaNosFavoritos(musica.id);
    await fetch(`${API_URL}/api/favoritos/${eh ? "remove" : "add"}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musica)
    });
    carregarFavoritos();
    mostrarMsg(eh ? "💔 Removido dos favoritos" : "❤️ Adicionado aos favoritos");
  };

  // Playlists
  const criarPlaylist = async () => {
    if (!novaPlaylistNome.trim()) {
      mostrarMsg("Digite um nome para a playlist");
      return;
    }
    await fetch(`${API_URL}/api/playlists/${novaPlaylistNome}`, {
      method: "POST",
      credentials: "include"
    });
    carregarPlaylists();
    mostrarMsg(`📀 Playlist "${novaPlaylistNome}" criada`);
    setModalPlaylist(false);
    setNovaPlaylistNome("");
  };

  const adicionarNaPlaylist = async () => {
    if (!selectedPlaylist || !selectedMusic) return;
    await fetch(`${API_URL}/api/playlists/${selectedPlaylist}/add`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedMusic)
    });
    carregarPlaylists();
    mostrarMsg(`✅ Adicionado à playlist "${selectedPlaylist}"`);
    setModalAddToPlaylist(false);
    setSelectedMusic(null);
    setSelectedPlaylist("");
  };

  const removerDaPlaylist = async () => {
    await fetch(`${API_URL}/api/playlists/${removePlaylistName}/remove`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: removeMusicId })
    });
    carregarPlaylists();
    mostrarMsg("🗑️ Removido da playlist");
    setModalRemoveFromPlaylist(false);
  };

  const deletarPlaylist = (nome) => {
    setConfirmTexto(`Deseja excluir a playlist "${nome}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/playlists/${nome}`, {
        method: "DELETE",
        credentials: "include"
      });
      carregarPlaylists();
      mostrarMsg("🗑️ Playlist excluída");
    });
    setModalConfirm(true);
  };

  const abrirAddToPlaylist = (musica) => {
    setSelectedMusic(musica);
    setSelectedPlaylist("");
    setModalAddToPlaylist(true);
  };

  const abrirRemoveFromPlaylist = (playlistNome, musicaId) => {
    setRemovePlaylistName(playlistNome);
    setRemoveMusicId(musicaId);
    setModalRemoveFromPlaylist(true);
  };

  // Upload
  const enviarUpload = async () => {
    if (!arquivoUpload) return;
    setSubindo(true);
    const formData = new FormData();
    formData.append("musica", arquivoUpload);
    formData.append("titulo", tituloUpload);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const data = await res.json();
    if (data.success) {
      mostrarMsg("✅ Música enviada com sucesso!");
      setArquivoUpload(null);
      setTituloUpload("");
      setModalUpload(false);
      carregarMusicas();
    } else {
      mostrarMsg("❌ " + (data.error || "Erro no upload"));
    }
    setSubindo(false);
  };

  // Excluir música
  const excluirMusica = (id, titulo) => {
    setConfirmTexto(`Excluir "${titulo}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/musicas/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      carregarTudo();
      mostrarMsg("🗑️ Música excluída");
    });
    setModalConfirm(true);
  };

  // Editar música
  const abrirEditar = (id, titulo) => {
    setEditarMusicaId(id);
    setEditarTitulo(titulo);
    setModalEditar(true);
  };

  const salvarEdicao = async () => {
    await fetch(`${API_URL}/api/musicas/${editarMusicaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ titulo: editarTitulo })
    });
    setModalEditar(false);
    carregarMusicas();
    mostrarMsg("✏️ Música editada");
  };

  // YouTube search
  const buscarYoutube = async (mais = false) => {
    if (!busca.trim()) return;
    setBuscando(true);
    setDestaqueBusca(true);
    
    const token = mais ? nextPageToken : "";
    const res = await fetch(
      `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}&pageToken=${token}`
    );
    const data = await res.json();
    
    if (!mais) setResultadosYoutube(data.dados || []);
    else setResultadosYoutube((prev) => [...prev, ...(data.dados || [])]);
    
    setNextPageToken(data.nextPageToken || null);
    setBuscando(false);
    setBusca("");
    
    setTimeout(() => setDestaqueBusca(false), 3000);
  };

  // Login screen
  if (!user) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ fontSize: 48, margin: 0, color: "#1DB954" }}>🎵 Moises Music</h1>
          <p style={{ color: "#aaa", marginTop: 16, fontSize: 16 }}>
            Sua música, suas playlists, seu estilo.
          </p>
          <button onClick={login} style={styles.btnGreen}>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={styles.app}>
      {mensagem && <div style={styles.toast}>{mensagem}</div>}
      {loading && <div style={styles.loading}>🎵 Carregando música...</div>}

      {/* Mobile Menu Button */}
      {isMobile && (
        <button style={styles.mobileMenuBtn} onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {menuAberto && isMobile && <div style={styles.overlay} onClick={() => setMenuAberto(false)} />}

      {/* Sidebar */}
      <div style={{ ...styles.sidebar, transform: isMobile && !menuAberto ? "translateX(-100%)" : "translateX(0)" }}>
        <h2 style={styles.logo}>Moises Music</h2>

        <button style={{ ...styles.navItem, ...(aba === "home" && styles.navItemActive) }} onClick={() => { setAba("home"); setMenuAberto(false); carregarTudo(); }}>
          <Home size={20} /> Home
        </button>

        <button style={{ ...styles.navItem, ...(aba === "musicas" && styles.navItemActive) }} onClick={() => { setAba("musicas"); setMenuAberto(false); carregarMusicas(); }}>
          <Music size={20} /> Minhas músicas
        </button>

        <button style={{ ...styles.navItem, ...(aba === "favoritos" && styles.navItemActive) }} onClick={() => { setAba("favoritos"); setMenuAberto(false); carregarFavoritos(); }}>
          <Heart size={20} /> Favoritos
        </button>

        <button style={{ ...styles.navItem, ...(aba === "playlists" && styles.navItemActive) }} onClick={() => { setAba("playlists"); setMenuAberto(false); carregarPlaylists(); }}>
          <ListMusic size={20} /> Playlists
        </button>

        <button style={{ ...styles.navItem, ...(aba === "topYoutube" && styles.navItemActive) }} onClick={() => { setAba("topYoutube"); setMenuAberto(false); carregarTopYoutube(); }}>
          <Flame size={20} /> Top YouTube
        </button>

        <button style={styles.uploadBtn} onClick={() => setModalUpload(true)}>
          <Upload size={18} /> Upload
        </button>

        <div style={styles.userInfo}>
          <img src={user.foto || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${encodeURIComponent(user.nome)}`} alt="" style={styles.avatar} />
          <div>
            <p style={styles.userName}>{user.nome}</p>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ ...styles.content, paddingBottom: musicaTocando ? 120 : 20 }}>
        {/* Top Bar */}
        <div style={styles.topbar}>
          <div style={styles.searchContainer}>
            <Search size={18} color="#b3b3b3" />
            <input
              style={styles.searchInput}
              placeholder="Buscar música no YouTube..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarYoutube(false)}
            />
            <button style={styles.searchBtn} onClick={() => buscarYoutube(false)}>
              Buscar
            </button>
          </div>
        </div>

        {/* Home */}
        {aba === "home" && (
          <>
            <h1 style={styles.title}>Bem-vindo ao Moises Music 🎧</h1>

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🔥 Músicas em alta</h2>
              <button style={styles.playAllBtn} onClick={() => tocarFila(trendingMusics)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            <div style={styles.grid}>
              {trendingMusics.slice(0, 10).map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImage} />
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, trendingMusics)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                      <Plus size={16} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>✨ Artistas em alta</h2>
            </div>
            <div style={styles.artistsGrid}>
              {trendingArtists.slice(0, 8).map((a) => (
                <div key={a.id} style={styles.artistCard} onClick={() => abrirArtistaYoutube(a.nome)}>
                  <img 
                    src={a.foto || `https://ui-avatars.com/api/?background=1DB954&color=fff&size=100&name=${encodeURIComponent(a.nome)}`} 
                    alt={a.nome} 
                    style={styles.artistImage}
                  />
                  <p style={styles.artistName}>{a.nome}</p>
                  <button style={styles.artistExternalBtn} onClick={(e) => {
                    e.stopPropagation();
                    abrirArtistaYoutube(a.nome);
                  }}>
                    <ExternalLink size={14} color="#1DB954" />
                  </button>
                </div>
              ))}
            </div>

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🎵 Suas músicas</h2>
              <button style={styles.playAllBtn} onClick={() => tocarFila(musicas)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            <div style={styles.grid}>
              {musicas.slice(0, 8).map((m) => (
                <div key={m.id} style={styles.card}>
                  <div style={styles.cardIcon}>🎵</div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                      <Plus size={16} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Top YouTube */}
        {aba === "topYoutube" && (
          <>
            <h1 style={styles.title}>🔥 Top YouTube Brasil</h1>
            <button style={styles.playAllBtn} onClick={() => tocarFila(topYoutube)}>
              <Play size={14} /> Tocar todas
            </button>
            <div style={styles.grid}>
              {topYoutube.map((m, idx) => (
                <div key={m.id} style={styles.card}>
                  <div style={styles.rankBadge}>#{idx + 1}</div>
                  <img src={m.capa} alt="" style={styles.cardImage} />
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, topYoutube)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                      <Plus size={16} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Minhas Músicas */}
        {aba === "musicas" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>🎵 Minhas músicas</h1>
              <button style={styles.playAllBtn} onClick={() => tocarFila(musicas)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            <div style={styles.grid}>
              {musicas.map((m) => (
                <div key={m.id} style={styles.card}>
                  <div style={styles.cardIcon}>🎵</div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirEditar(m.id, m.titulo)}>
                      <Pencil size={16} color="white" />
                    </button>
                    <button style={styles.iconBtnDanger} onClick={() => excluirMusica(m.id, m.titulo)}>
                      <Trash2 size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                      <Plus size={16} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Favoritos */}
        {aba === "favoritos" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>❤️ Músicas favoritas</h1>
              <button style={styles.playAllBtn} onClick={() => tocarFila(favoritos)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            {favoritos.length === 0 ? (
              <p style={styles.emptyMsg}>Nenhuma música favorita ainda. Adicione suas músicas favoritas!</p>
            ) : (
              <div style={styles.grid}>
                {favoritos.map((m) => (
                  <div key={m.id} style={styles.card}>
                    {m.fonte === "youtube" && m.capa ? (
                      <img src={m.capa} alt="" style={styles.cardImage} />
                    ) : (
                      <div style={styles.cardIcon}>🎵</div>
                    )}
                    <div style={styles.cardInfo}>
                      <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                      <p style={styles.cardArtist}>{m.artista}</p>
                    </div>
                    <div style={styles.cardActions}>
                      <button style={styles.iconBtn} onClick={() => tocarMusica(m, favoritos)}>
                        <Play size={16} color="white" />
                      </button>
                      <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                        <Heart size={16} fill="#1DB954" color="#1DB954" />
                      </button>
                      <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                        <Plus size={16} color="white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Playlists */}
        {aba === "playlists" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>📀 Suas playlists</h1>
              <button style={styles.createPlaylistBtn} onClick={() => setModalPlaylist(true)}>
                + Criar playlist
              </button>
            </div>
            {Object.keys(playlists).length === 0 && <p style={styles.emptyMsg}>Nenhuma playlist criada ainda.</p>}
            {Object.keys(playlists).map((nome) => (
              <div key={nome} style={styles.playlistBox}>
                <div style={styles.playlistHeader}>
                  <h3 style={styles.playlistTitle}>{nome}</h3>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={styles.playAllBtn} onClick={() => tocarFila(playlists[nome] || [])}>
                      <Play size={14} /> Tocar tudo
                    </button>
                    <button style={styles.deletePlaylistBtn} onClick={() => deletarPlaylist(nome)}>
                      Excluir playlist
                    </button>
                  </div>
                </div>
                <div style={styles.playlistSongs}>
                  {(playlists[nome] || []).map((m) => (
                    <div key={m.id} style={styles.playlistSong}>
                      <div style={styles.playlistSongIcon}>🎵</div>
                      <div style={styles.playlistSongInfo}>
                        <p style={styles.playlistSongTitle}>{m.titulo}</p>
                        <p style={styles.playlistSongArtist}>{m.artista}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={styles.iconBtn} onClick={() => tocarMusica(m, playlists[nome])}>
                          <Play size={14} color="white" />
                        </button>
                        <button style={styles.iconBtnDanger} onClick={() => abrirRemoveFromPlaylist(nome, m.id)}>
                          <Trash2 size={14} color="white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* YouTube Results */}
        {resultadosYoutube.length > 0 && (
          <>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🎬 Resultados da busca</h2>
              <button style={styles.clearResultsBtn} onClick={() => setResultadosYoutube([])}>
                Limpar resultados
              </button>
            </div>
            <div style={destaqueBusca ? styles.gridHighlight : styles.grid}>
              {resultadosYoutube.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImage} />
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, resultadosYoutube)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    <button style={styles.iconBtn} onClick={() => abrirAddToPlaylist(m)}>
                      <Plus size={16} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {nextPageToken && (
              <button style={styles.loadMoreBtn} onClick={() => buscarYoutube(true)} disabled={buscando}>
                {buscando ? "Carregando..." : "Carregar mais resultados"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Player */}
      {musicaTocando && (
        <div style={styles.player}>
          <div style={styles.playerLeft}>
            {musicaTocando.fonte === "youtube" && musicaTocando.capa ? (
              <img src={musicaTocando.capa} alt="" style={styles.playerImage} />
            ) : (
              <div style={styles.playerIcon}>🎵</div>
            )}
            <div>
              <p style={styles.playerTitle}>{musicaTocando.titulo}</p>
              <p style={styles.playerArtist}>{musicaTocando.artista}</p>
            </div>
            <button style={styles.playerIconBtn} onClick={() => toggleFavorito(musicaTocando)}>
              <Heart size={18} fill={estaNosFavoritos(musicaTocando.id) ? "#1DB954" : "none"} color={estaNosFavoritos(musicaTocando.id) ? "#1DB954" : "white"} />
            </button>
          </div>

          <div style={styles.playerCenter}>
            <div style={styles.playerControls}>
              <button style={styles.playerControlBtn} onClick={tocarAnterior}>
                <SkipBack size={20} color="white" />
              </button>
              <button style={styles.playPauseBtn} onClick={togglePlayPause}>
                {tocando ? <Pause size={24} color="black" /> : <Play size={24} color="black" />}
              </button>
              <button style={styles.playerControlBtn} onClick={tocarProxima}>
                <SkipForward size={20} color="white" />
              </button>
              <button style={{ ...styles.playerControlBtn, color: repeatMode !== "none" ? "#1DB954" : "white" }} onClick={toggleRepeat}>
                <Repeat size={18} />
              </button>
              <button style={{ ...styles.playerControlBtn, color: shuffleMode ? "#1DB954" : "white" }} onClick={toggleShuffle}>
                <Shuffle size={18} />
              </button>
            </div>
            
            <div style={styles.progressArea}>
              <span style={styles.time}>{formatarTempo(tempoAtual)}</span>
              <input
                type="range"
                min="0"
                max={duracao || 100}
                value={tempoAtual || 0}
                onChange={handleProgressChange}
                style={styles.progress}
                disabled={musicaTocando.fonte === "youtube"}
              />
              <span style={styles.time}>{formatarTempo(duracao)}</span>
            </div>
          </div>

          <div style={styles.playerRight}>
            <button style={styles.playerIconBtn} onClick={() => setVolume(volume === 0 ? 70 : 0)}>
              {volume === 0 ? <VolumeX size={18} color="white" /> : <Volume2 size={18} color="white" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={styles.volumeSlider}
            />
          </div>
        </div>
      )}

      {/* Hidden YouTube Player */}
      {videoYoutube && (
        <div style={styles.youtubeHidden}>
          <YouTube
            videoId={videoYoutube}
            opts={{ width: "1", height: "1", playerVars: { autoplay: 1, controls: 0, modestbranding: 1 } }}
            onReady={onYoutubeReady}
            onStateChange={onYoutubeStateChange}
          />
        </div>
      )}

      {/* Modais */}
      {modalPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Criar nova playlist</h2>
              <button style={styles.modalClose} onClick={() => setModalPlaylist(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <input
              style={styles.modalInput}
              placeholder="Nome da playlist"
              value={novaPlaylistNome}
              onChange={(e) => setNovaPlaylistNome(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && criarPlaylist()}
              autoFocus
            />
            <div style={styles.modalButtons}>
              <button style={styles.btnGreenSmall} onClick={criarPlaylist}>Criar</button>
              <button style={styles.btnRedSmall} onClick={() => setModalPlaylist(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalAddToPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Adicionar à playlist</h2>
              <button style={styles.modalClose} onClick={() => setModalAddToPlaylist(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <p style={{ marginBottom: 10, color: "white" }}>Música: <strong style={{ color: "#1DB954" }}>{selectedMusic?.titulo}</strong></p>
            <select style={styles.modalSelect} value={selectedPlaylist} onChange={(e) => setSelectedPlaylist(e.target.value)}>
              <option value="">Selecione uma playlist</option>
              {Object.keys(playlists).map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
            <div style={styles.modalButtons}>
              <button style={styles.btnGreenSmall} onClick={adicionarNaPlaylist} disabled={!selectedPlaylist}>Adicionar</button>
              <button style={styles.btnRedSmall} onClick={() => setModalAddToPlaylist(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalRemoveFromPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Remover da playlist</h2>
              <button style={styles.modalClose} onClick={() => setModalRemoveFromPlaylist(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <p style={{ color: "white" }}>Tem certeza que deseja remover esta música da playlist?</p>
            <div style={styles.modalButtons}>
              <button style={styles.btnRedSmall} onClick={removerDaPlaylist}>Remover</button>
              <button style={styles.btnGreenSmall} onClick={() => setModalRemoveFromPlaylist(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalUpload && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Upload de música</h2>
              <button style={styles.modalClose} onClick={() => setModalUpload(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <input type="file" accept=".mp3,.wav,.ogg" onChange={(e) => setArquivoUpload(e.target.files[0])} style={{ color: "white" }} />
            <input style={styles.modalInput} placeholder="Nome da música (opcional)" value={tituloUpload} onChange={(e) => setTituloUpload(e.target.value)} />
            <div style={styles.modalButtons}>
              <button style={styles.btnGreenSmall} onClick={enviarUpload} disabled={subindo}>{subindo ? "Enviando..." : "Enviar"}</button>
              <button style={styles.btnRedSmall} onClick={() => setModalUpload(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3 style={{ color: "white" }}>{confirmTexto}</h3>
            <div style={styles.modalButtons}>
              <button style={styles.btnGreenSmall} onClick={() => { confirmAction(); setModalConfirm(false); }}>Sim</button>
              <button style={styles.btnRedSmall} onClick={() => setModalConfirm(false)}>Não</button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Editar música</h2>
              <button style={styles.modalClose} onClick={() => setModalEditar(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <input style={styles.modalInput} value={editarTitulo} onChange={(e) => setEditarTitulo(e.target.value)} />
            <div style={styles.modalButtons}>
              <button style={styles.btnGreenSmall} onClick={salvarEdicao}>Salvar</button>
              <button style={styles.btnRedSmall} onClick={() => setModalEditar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#121212",
    fontFamily: "'Circular Std', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  loading: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(0,0,0,0.9)",
    color: "#1DB954",
    padding: "12px 24px",
    borderRadius: 50,
    zIndex: 10000,
    fontSize: 14,
    fontWeight: 500
  },
  toast: {
    position: "fixed",
    bottom: 100,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1DB954",
    color: "black",
    padding: "10px 20px",
    borderRadius: 50,
    zIndex: 10000,
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 998,
    backdropFilter: "blur(4px)"
  },
  mobileMenuBtn: {
    position: "fixed",
    top: 16,
    left: 16,
    zIndex: 1000,
    background: "#1DB954",
    border: "none",
    width: 44,
    height: 44,
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
  },
  sidebar: {
    width: 260,
    background: "#000000",
    padding: "24px 12px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    transition: "transform 0.3s ease",
    gap: 8
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1DB954",
    marginBottom: 24,
    padding: "0 12px",
    letterSpacing: "-0.5px"
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px",
    borderRadius: 8,
    color: "#b3b3b3",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    width: "100%",
    background: "transparent",
    border: "none",
    textAlign: "left"
  },
  navItemActive: {
    background: "#282828",
    color: "#ffffff"
  },
  uploadBtn: {
    background: "#1DB954",
    border: "none",
    color: "black",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    marginTop: 16,
    width: "100%"
  },
  userInfo: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #282828",
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover"
  },
  userName: {
    fontSize: 12,
    fontWeight: 500,
    color: "white",
    margin: 0
  },
  userEmail: {
    fontSize: 10,
    color: "#b3b3b3",
    margin: 0
  },
  logoutBtn: {
    background: "transparent",
    border: "none",
    color: "#b3b3b3",
    cursor: "pointer",
    marginLeft: "auto",
    padding: 4
  },
  content: {
    flex: 1,
    marginLeft: 260,
    padding: "20px 32px",
    overflowY: "auto",
    minHeight: "100vh"
  },
  topbar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 32
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#242424",
    padding: "8px 16px",
    borderRadius: 500,
    width: 300
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "white",
    flex: 1,
    outline: "none",
    fontSize: 14
  },
  searchBtn: {
    background: "#1DB954",
    border: "none",
    padding: "6px 16px",
    borderRadius: 500,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer"
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "white",
    marginBottom: 24
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "white",
    margin: 0
  },
  playAllBtn: {
    background: "rgba(29,185,84,0.2)",
    border: "1px solid #1DB954",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#1DB954",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  clearResultsBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid #b3b3b3",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#b3b3b3",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12
  },
  gridHighlight: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
    animation: "pulse 0.5s ease"
  },
  card: {
    background: "#181818",
    padding: "12px 16px",
    borderRadius: 8,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    position: "relative",
    ":hover": {
      background: "#282828"
    }
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    objectFit: "cover"
  },
  cardIcon: {
    fontSize: 32,
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1DB954",
    borderRadius: 8,
    color: "black"
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0
  },
  cardArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    margin: "4px 0 0 0"
  },
  cardActions: {
    display: "flex",
    gap: 8
  },
  iconBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    padding: 8,
    borderRadius: 50,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  iconBtnDanger: {
    background: "rgba(255,68,68,0.2)",
    border: "none",
    padding: 8,
    borderRadius: 50,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  artistsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 16
  },
  artistCard: {
    background: "#181818",
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
    transition: "all 0.2s",
    cursor: "pointer",
    position: "relative",
    ":hover": {
      background: "#282828"
    }
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 12,
    border: "2px solid #1DB954"
  },
  artistName: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: "0 0 8px 0"
  },
  artistExternalBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    background: "#1DB954",
    color: "black",
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "bold",
    zIndex: 1
  },
  playlistBox: {
    background: "#181818",
    borderRadius: 8,
    marginTop: 20,
    overflow: "hidden"
  },
  playlistHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "#242424",
    borderBottom: "1px solid #282828"
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "white",
    margin: 0
  },
  deletePlaylistBtn: {
    background: "rgba(255,68,68,0.2)",
    border: "none",
    padding: "6px 12px",
    borderRadius: 20,
    color: "#ff4444",
    fontSize: 12,
    cursor: "pointer"
  },
  playlistSongs: {
    padding: 8
  },
  playlistSong: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s"
  },
  playlistSongIcon: {
    fontSize: 24,
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1DB954",
    borderRadius: 6,
    color: "black"
  },
  playlistSongInfo: {
    flex: 1
  },
  playlistSongTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0
  },
  playlistSongArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    margin: 0
  },
  createPlaylistBtn: {
    background: "#1DB954",
    border: "none",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  emptyMsg: {
    color: "#b3b3b3",
    textAlign: "center",
    padding: "60px 20px",
    fontSize: 14
  },
  loadMoreBtn: {
    background: "transparent",
    border: "1px solid #282828",
    padding: "10px 24px",
    borderRadius: 500,
    color: "white",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 20,
    width: "100%"
  },
  player: {
    position: "fixed",
    bottom: 0,
    right: 0,
    left: 260,
    background: "#181818",
    borderTop: "1px solid #282828",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
    height: 90,
    boxShadow: "0 -4px 12px rgba(0,0,0,0.5)"
  },
  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "30%"
  },
  playerImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: "cover"
  },
  playerIcon: {
    fontSize: 40,
    width: 56,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1DB954",
    borderRadius: 8,
    color: "black"
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0
  },
  playerArtist: {
    fontSize: 11,
    color: "#b3b3b3",
    margin: 0
  },
  playerCenter: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8
  },
  playerControls: {
    display: "flex",
    alignItems: "center",
    gap: 20
  },
  playerControlBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 8,
    borderRadius: "50%",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  playPauseBtn: {
    background: "white",
    border: "none",
    width: 48,
    height: 48,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s"
  },
  progressArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 400
  },
  progress: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: "#535353",
    cursor: "pointer"
  },
  time: {
    fontSize: 11,
    color: "#b3b3b3",
    minWidth: 40
  },
  playerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "20%",
    justifyContent: "flex-end"
  },
  playerIconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  volumeSlider: {
    width: 100,
    height: 4,
    borderRadius: 2,
    background: "#535353",
    cursor: "pointer"
  },
  youtubeHidden: {
    position: "fixed",
    bottom: 0,
    right: 0,
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000
  },
  modalBox: {
    background: "#181818",
    padding: 24,
    borderRadius: 12,
    width: 400,
    maxWidth: "90%"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  modalClose: {
    background: "transparent",
    border: "none",
    cursor: "pointer"
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    background: "#242424",
    border: "1px solid #282828",
    borderRadius: 8,
    color: "white",
    margin: "12px 0",
    outline: "none"
  },
  modalSelect: {
    width: "100%",
    padding: "10px 12px",
    background: "#242424",
    border: "1px solid #282828",
    borderRadius: 8,
    color: "white",
    margin: "12px 0",
    outline: "none"
  },
  modalButtons: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 16
  },
  btnGreenSmall: {
    background: "#1DB954",
    border: "none",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer"
  },
  btnRedSmall: {
    background: "#ff4444",
    border: "none",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    color: "white"
  },
  btnGreen: {
    background: "#1DB954",
    border: "none",
    padding: "12px 32px",
    borderRadius: 500,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 24
  },
  loginBg: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #000000 0%, #1DB954 100%)"
  },
  loginCard: {
    background: "#000000",
    padding: 48,
    borderRadius: 16,
    textAlign: "center",
    width: 400,
    maxWidth: "90%"
  }
};

// Adicionar animação CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.01); background: rgba(29,185,84,0.1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(styleSheet);