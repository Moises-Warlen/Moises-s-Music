import { useState, useEffect, useRef } from "react";
import { Play, Pause, Heart, Home, Music, ListMusic, LogOut, Upload, Trash2, Plus, Search, Menu, X, Flame } from "lucide-react";

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

const DEFAULT_AVATAR = (nome = "Artista") =>
  `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${encodeURIComponent(nome)}`;

function App() {
  const [user, setUser] = useState(null);
  const [musicas, setMusicas] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [playlists, setPlaylists] = useState({});

  const [topYoutube, setTopYoutube] = useState([]);
  const [trendingMusics, setTrendingMusics] = useState([]);
  const [trendingArtists, setTrendingArtists] = useState([]);

  const [aba, setAba] = useState("home");
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [busca, setBusca] = useState("");
  const [resultadosYoutube, setResultadosYoutube] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const [musicaTocando, setMusicaTocando] = useState(null);
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [carregandoAudio, setCarregandoAudio] = useState(false);
  const audioRef = useRef(null);

  const [modalUpload, setModalUpload] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [modalConfirm, setModalConfirm] = useState(false);
  const [confirmTexto, setConfirmTexto] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const mostrarMsg = (txt) => {
    setMensagem(txt);
    setTimeout(() => setMensagem(""), 3000);
  };

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMenuAberto(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await Promise.all([
          carregarMusicas(),
          carregarFavoritos(),
          carregarPlaylists(),
          carregarTopYoutube(),
          carregarTrendings()
        ]);
        mostrarMsg(`🎉 Bem-vindo, ${data.user.nome.split(" ")[0]}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const carregarMusicas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/musicas`, { credentials: "include" });
      const data = await res.json();
      setMusicas(data.dados || []);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarFavoritos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/favoritos`, { credentials: "include" });
      const data = await res.json();
      setFavoritos(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/api/playlists`, { credentials: "include" });
      const data = await res.json();
      setPlaylists(data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const carregarTopYoutube = async () => {
    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();
      setTopYoutube(Array.isArray(data?.dados) ? data.dados.slice(0, 10) : []);
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
      if (musicData.success) setTrendingMusics(musicData.dados || []);
      if (artistData.success) setTrendingArtists(artistData.dados || []);
    } catch (err) {
      console.error(err);
    }
  };

  // PLAYER - Toca YouTube e músicas locais
  const tocarMusica = (musica) => {
    if (!musica) return;

    let url = null;

    // Música do YouTube
    if (musica.videoId) {
      url = `${API_URL}/api/youtube-audio?videoId=${musica.videoId}`;
    }
    // Música local (upload)
    else if (musica.url) {
      url = musica.url;
    }

    if (!url) {
      mostrarMsg("❌ Não foi possível carregar a música");
      return;
    }

    // Se for a mesma música, apenas play/pause
    if (musicaTocando?.id === musica.id) {
      if (tocando) {
        audioRef.current?.pause();
        setTocando(false);
      } else {
        audioRef.current?.play();
        setTocando(true);
      }
      return;
    }

    // Tocar nova música
    setCarregandoAudio(true);
    
    if (audioRef.current) {
      // Para o áudio atual
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Carrega a nova música
      audioRef.current.src = url;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setMusicaTocando(musica);
          setTocando(true);
          setCarregandoAudio(false);
        }).catch(err => {
          console.error("Erro ao tocar:", err);
          setCarregandoAudio(false);
          mostrarMsg("❌ Erro ao carregar a música");
        });
      }
    }
  };

  const togglePlayPause = () => {
    if (!musicaTocando) return;
    if (tocando) {
      audioRef.current?.pause();
      setTocando(false);
    } else {
      audioRef.current?.play();
      setTocando(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setTempoAtual(audio.currentTime);
    const onLoaded = () => {
      setDuracao(audio.duration || 0);
      setCarregandoAudio(false);
    };
    const onEnded = () => {
      setMusicaTocando(null);
      setTocando(false);
      setTempoAtual(0);
    };
    const onError = (e) => {
      console.error("Erro no áudio:", e);
      setCarregandoAudio(false);
      mostrarMsg("❌ Erro ao carregar a música");
    };
    const onWaiting = () => setCarregandoAudio(true);
    const onPlaying = () => setCarregandoAudio(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [musicaTocando]);

  const estaNosFavoritos = (id) => favoritos.some((m) => m.id === id);

  const toggleFavorito = async (musica) => {
    const ehFav = estaNosFavoritos(musica.id);
    await fetch(`${API_URL}/api/favoritos/${ehFav ? "remove" : "add"}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musica)
    });
    await carregarFavoritos();
    mostrarMsg(ehFav ? "💔 Removido dos favoritos" : "❤️ Adicionado aos favoritos");
  };

  const criarPlaylist = async () => {
    const nome = prompt("Nome da playlist:");
    if (!nome) return;
    await fetch(`${API_URL}/api/playlists/${nome}`, { method: "POST", credentials: "include" });
    await carregarPlaylists();
    mostrarMsg(`📀 Playlist "${nome}" criada`);
  };

  const adicionarNaPlaylist = async (playlistNome, musica) => {
    await fetch(`${API_URL}/api/playlists/${playlistNome}/add`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musica)
    });
    await carregarPlaylists();
    mostrarMsg(`✅ Adicionado em "${playlistNome}"`);
  };

  const removerDaPlaylist = async (playlistNome, musicaId) => {
    await fetch(`${API_URL}/api/playlists/${playlistNome}/remove`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: musicaId })
    });
    await carregarPlaylists();
    mostrarMsg(`🗑️ Removido da playlist`);
  };

  const deletarPlaylist = (nome) => {
    setConfirmTexto(`Excluir a playlist "${nome}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/playlists/${nome}`, { method: "DELETE", credentials: "include" });
      await carregarPlaylists();
      mostrarMsg(`🗑️ Playlist "${nome}" excluída`);
    });
    setModalConfirm(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Selecione um arquivo de áudio (MP3, WAV, OGG)");
      event.target.value = "";
      return;
    }

    setSubindo(true);
    const formData = new FormData();
    formData.append("musica", file);
    const titulo = prompt("Nome da música (opcional):");
    if (titulo) formData.append("titulo", titulo);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        mostrarMsg(`✅ Upload: ${data.musica.titulo}`);
        await carregarMusicas();
        setModalUpload(false);
      } else {
        mostrarMsg("Erro no upload: " + (data.error || "Tente novamente"));
      }
    } catch (error) {
      mostrarMsg("Erro ao fazer upload");
    } finally {
      setSubindo(false);
      event.target.value = "";
    }
  };

  const excluirMusica = (id, titulo) => {
    setConfirmTexto(`Excluir "${titulo}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/musicas/${id}`, { method: "DELETE", credentials: "include" });
      await carregarMusicas();
      await carregarFavoritos();
      mostrarMsg(`🗑️ Música excluída`);
    });
    setModalConfirm(true);
  };

  const buscarYoutube = async (mais = false) => {
    if (!busca.trim()) return;
    
    setBuscando(true);
    if (!mais) {
      setResultadosYoutube([]);
      setNextPageToken(null);
    }
    
    const token = mais ? nextPageToken : "";
    
    try {
      const res = await fetch(`${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}&pageToken=${token}`);
      const data = await res.json();
      
      if (!mais) {
        setResultadosYoutube(data.dados || []);
      } else {
        setResultadosYoutube((prev) => [...prev, ...(data.dados || [])]);
      }
      setNextPageToken(data.nextPageToken || null);
      mostrarMsg(`🔍 ${data.dados?.length || 0} resultados para "${busca}"`);
    } catch (error) {
      console.error(error);
      mostrarMsg("❌ Erro na busca");
    } finally {
      setBuscando(false);
    }
  };

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/logout`, { credentials: "include" });
    setUser(null);
    setMusicaTocando(null);
    setTocando(false);
  };

  const formatarTempo = (segundos) => {
    if (!segundos || isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const formatarViews = (views) => {
    if (!views || views === "N/A") return "0";
    const num = typeof views === "string" ? parseInt(views) : views;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (!user) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>🎵 Moises Music</h1>
          <p style={styles.sub}>Sua música, suas playlists, seu estilo.</p>
          <button onClick={login} style={styles.btnGreen}>Entrar com Google</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {mensagem && <div style={styles.toast}>{mensagem}</div>}

      {isMobile && (
        <button style={styles.mobileMenuBtn} onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      {menuAberto && isMobile && <div style={styles.overlay} onClick={() => setMenuAberto(false)} />}

      <div style={{ ...styles.sidebar, transform: isMobile ? (menuAberto ? "translateX(0)" : "translateX(-260px)") : "translateX(0)" }}>
        <h2 style={styles.logoSmall}>Moises Music</h2>

        <button style={styles.menuBtn} onClick={() => { setAba("home"); setMenuAberto(false); }}><Home size={18} /> Home</button>
        <button style={styles.menuBtn} onClick={() => { setAba("musicas"); setMenuAberto(false); }}><Music size={18} /> Minhas músicas</button>
        <button style={styles.menuBtn} onClick={() => { setAba("favoritos"); setMenuAberto(false); }}><Heart size={18} /> Favoritos</button>
        <button style={styles.menuBtn} onClick={() => { setAba("playlists"); setMenuAberto(false); }}><ListMusic size={18} /> Playlists</button>
        <button style={styles.menuBtn} onClick={() => { setAba("topYoutube"); setMenuAberto(false); }}><Flame size={18} /> Top YouTube</button>

        <button style={styles.menuBtnGreen} onClick={() => { setModalUpload(true); setMenuAberto(false); }}><Upload size={18} /> Upload</button>

        <div style={styles.userInfoSidebar}>
          <p style={{ fontSize: 12, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
          <button style={styles.logoutBtn} onClick={logout}><LogOut size={18} /> Sair</button>
        </div>
      </div>

      <div style={{ ...styles.content, marginLeft: isMobile ? 0 : 260, paddingBottom: musicaTocando ? 80 : 20 }}>
        
        <div style={styles.topbar}>
          {aba === "home" && (
            <div style={styles.searchBox}>
              <Search size={18} color="#aaa" />
              <input 
                style={styles.searchInput} 
                placeholder="Buscar música no YouTube..." 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && buscarYoutube(false)} 
              />
              <button style={styles.searchBtn} onClick={() => buscarYoutube(false)} disabled={buscando}>
                {buscando ? "..." : "Buscar"}
              </button>
            </div>
          )}
          <div style={styles.userInfo}>
            <img src={user?.foto || DEFAULT_AVATAR(user?.nome)} alt="" style={styles.avatar} />
            <span style={{ fontWeight: "bold", display: isMobile ? "none" : "inline" }}>{user.nome.split(" ")[0]}</span>
          </div>
        </div>

        {aba === "home" && resultadosYoutube.length > 0 && (
          <div style={styles.resultsSection}>
            <h2 style={styles.sectionTitle}>🎬 Resultados do YouTube: "{busca}"</h2>
            <div style={styles.gridSmall}>
              {resultadosYoutube.map((m, idx) => (
                <div key={m.id || idx} style={styles.cardSmall}>
                  <img src={m.capa} alt="" style={styles.cardImgSmall} />
                  <p style={styles.cardTitleSmall}>{m.titulo.substring(0, 25)}</p>
                  <p style={{ fontSize: 10, color: "#888" }}>{m.artista.substring(0, 20)}</p>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m)}><Play size={14} /></button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}><Heart size={14} color={estaNosFavoritos(m.id) ? "#000" : "#fff"} /></button>
                    <button style={styles.iconBtn} onClick={() => { const nome = prompt("Playlist:"); if (nome) adicionarNaPlaylist(nome, m); }}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            {nextPageToken && (
              <button style={styles.btnGreenSmall} onClick={() => buscarYoutube(true)} disabled={buscando}>
                {buscando ? "Carregando..." : "Carregar mais"}
              </button>
            )}
          </div>
        )}

        {aba === "home" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🎵 Músicas em Tendência</h2>
                <span style={styles.sectionBadge}>🔥 Atualizado</span>
              </div>
              {trendingMusics.slice(0, 5).map((m, idx) => (
                <div key={m.id || idx} style={styles.listItem}>
                  <span style={styles.listRank}>#{m.rank || idx + 1}</span>
                  <img src={m.capa || DEFAULT_AVATAR(m.titulo)} alt="" style={styles.listImg} />
                  <div style={styles.listInfo}>
                    <div style={styles.listTitle}>{m.titulo}</div>
                    <div style={styles.listArtist}>{m.artista}</div>
                    <small style={{ color: "#888", fontSize: 10 }}>👁️ {formatarViews(m.views)} views</small>
                  </div>
                  <button style={styles.playSmallBtn} onClick={() => tocarMusica(m)}>▶</button>
                </div>
              ))}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>✨ Artistas em Alta</h2>
                <span style={styles.sectionBadge}>🎤 Trending</span>
              </div>
              <div style={styles.artistsGrid}>
                {trendingArtists.slice(0, 6).map((a) => (
                  <div key={a.id} style={styles.artistCard}>
                    <div style={styles.artistRankBadge}>{a.rank}</div>
                    <img src={a.foto || DEFAULT_AVATAR(a.nome)} alt="" style={styles.artistImg} />
                    <div style={styles.artistName}>{a.nome}</div>
                    <div style={styles.artistViews}>{a.viewsFormatado || formatarViews(a.totalViews)} views</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {aba === "topYoutube" && (
          <div style={styles.section}>
            <h1 style={styles.title}>🔥 Top YouTube</h1>
            <p style={{ color: "#aaa", marginBottom: 20 }}>As músicas mais vistas do momento no YouTube</p>
            {topYoutube.map((m, idx) => (
              <div key={m.id || idx} style={styles.listItem}>
                <span style={styles.listRank}>#{idx + 1}</span>
                <img src={m.capa || DEFAULT_AVATAR(m.titulo)} alt="" style={styles.listImg} />
                <div style={styles.listInfo}>
                  <div style={styles.listTitle}>{m.titulo}</div>
                  <div style={styles.listArtist}>{m.artista}</div>
                </div>
                <button style={styles.playSmallBtn} onClick={() => tocarMusica(m)}>▶</button>
              </div>
            ))}
          </div>
        )}

        {aba === "musicas" && (
          <div style={styles.section}>
            <h1 style={styles.title}>🎵 Minhas músicas</h1>
            <div style={styles.grid}>
              {musicas.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m)}><Play size={14} /></button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}><Heart size={14} color={estaNosFavoritos(m.id) ? "#000" : "#fff"} /></button>
                    <button style={styles.iconBtnDanger} onClick={() => excluirMusica(m.id, m.titulo)}><Trash2 size={14} /></button>
                    <button style={styles.iconBtn} onClick={() => { const nome = prompt("Playlist:"); if (nome) adicionarNaPlaylist(nome, m); }}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "favoritos" && (
          <div style={styles.section}>
            <h1 style={styles.title}>❤️ Favoritos</h1>
            <div style={styles.grid}>
              {favoritos.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m)}><Play size={14} /></button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}><Heart size={14} color="#000" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "playlists" && (
          <div style={styles.section}>
            <h1 style={styles.title}>📀 Playlists</h1>
            <button style={styles.btnGreenSmall} onClick={criarPlaylist}>+ Criar playlist</button>
            {Object.keys(playlists).length === 0 && (
              <p style={{ color: "#aaa", marginTop: 20 }}>Nenhuma playlist criada ainda.</p>
            )}
            {Object.keys(playlists).map((nome) => (
              <div key={nome} style={styles.playlistBox}>
                <div style={styles.playlistHeader}>
                  <h3>{nome}</h3>
                  <button style={styles.btnRedSmall} onClick={() => deletarPlaylist(nome)}>Excluir</button>
                </div>
                {(playlists[nome] || []).map((m) => (
                  <div key={m.id} style={styles.playlistMusic}>
                    <span onClick={() => tocarMusica(m)} style={{ cursor: "pointer" }}>🎵 {m.titulo}</span>
                    <button style={styles.btnRedSmall} onClick={() => removerDaPlaylist(nome, m.id)}>Remover</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {musicaTocando && (
        <div style={{ ...styles.player, left: isMobile ? 0 : 260 }}>
          <img src={musicaTocando.capa} alt="" style={styles.playerImg} />
          <div style={styles.playerInfo}>
            <div style={styles.playerTitle}>{musicaTocando.titulo}</div>
            <div style={styles.playerArtist}>{musicaTocando.artista}</div>
          </div>
          <button style={styles.playBtn} onClick={togglePlayPause}>
            {carregandoAudio ? (
              <div style={styles.loadingSpinner} />
            ) : tocando ? (
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </button>
          <div style={styles.progressArea}>
            <span style={styles.time}>{formatarTempo(tempoAtual)}</span>
            <input 
              type="range" 
              min="0" 
              max={duracao || 0} 
              value={tempoAtual} 
              onChange={(e) => { 
                if (audioRef.current) { 
                  audioRef.current.currentTime = e.target.value; 
                  setTempoAtual(e.target.value); 
                } 
              }} 
              style={styles.progress} 
            />
            <span style={styles.time}>{formatarTempo(duracao)}</span>
          </div>
        </div>
      )}

      <audio ref={audioRef} />

      {modalUpload && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>Upload de música</h3>
            <input type="file" accept=".mp3,.wav,.ogg" onChange={handleFileUpload} />
            <button disabled={subindo} style={styles.btnGreenSmall}>{subindo ? "Subindo..." : "Enviar"}</button>
            <button style={styles.btnRedSmall} onClick={() => setModalUpload(false)}>Fechar</button>
          </div>
        </div>
      )}

      {modalConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>{confirmTexto}</h3>
            <button style={styles.btnGreenSmall} onClick={() => { confirmAction(); setModalConfirm(false); }}>Sim</button>
            <button style={styles.btnRedSmall} onClick={() => setModalConfirm(false)}>Não</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: { display: "flex", minHeight: "100vh", background: "#121212", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" },
  toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1DB954", padding: "8px 16px", borderRadius: 20, zIndex: 999999, fontSize: 13, whiteSpace: "nowrap" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 },
  mobileMenuBtn: { position: "fixed", top: 15, left: 15, zIndex: 99999, background: "#1DB954", border: "none", padding: 10, borderRadius: 10, cursor: "pointer" },
  
  sidebar: { width: 260, background: "#000", padding: 20, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 9999, transition: "0.3s ease" },
  logoSmall: { color: "#1DB954", marginBottom: 30, fontSize: 20 },
  menuBtn: { background: "transparent", border: "none", color: "#fff", display: "flex", gap: 12, padding: 12, cursor: "pointer", borderRadius: 8, marginBottom: 4, fontSize: 14 },
  menuBtnGreen: { background: "#1DB954", border: "none", color: "#000", display: "flex", gap: 12, padding: 12, cursor: "pointer", borderRadius: 8, marginTop: 20, fontWeight: "bold" },
  userInfoSidebar: { marginTop: "auto", borderTop: "1px solid #222", paddingTop: 20 },
  logoutBtn: { background: "#222", border: "none", color: "#fff", padding: 10, borderRadius: 8, cursor: "pointer", width: "100%", display: "flex", gap: 8, alignItems: "center" },
  
  content: { flex: 1, padding: 20, overflowY: "auto" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 15 },
  searchBox: { display: "flex", gap: 8, background: "#1e1e1e", padding: "8px 15px", borderRadius: 40, flex: 1, maxWidth: 400 },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14 },
  searchBtn: { background: "#1DB954", border: "none", borderRadius: 30, padding: "5px 15px", cursor: "pointer", fontSize: 12 },
  userInfo: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover" },
  
  title: { fontSize: 24, marginBottom: 20, marginTop: 0 },
  sectionTitle: { fontSize: 20, marginBottom: 15 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 },
  sectionBadge: { background: "#1DB954", color: "#000", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold" },
  section: { marginBottom: 35 },
  
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 15 },
  gridSmall: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 },
  
  card: { background: "#181818", padding: 10, borderRadius: 12, cursor: "pointer", transition: "0.2s" },
  cardSmall: { background: "#181818", padding: 8, borderRadius: 10, cursor: "pointer" },
  cardImg: { width: "100%", borderRadius: 8, aspectRatio: "1/1", objectFit: "cover" },
  cardImgSmall: { width: "100%", borderRadius: 8, aspectRatio: "1/1", objectFit: "cover" },
  cardTitle: { margin: "8px 0 4px", fontWeight: "bold", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardTitleSmall: { margin: "6px 0 2px", fontWeight: "bold", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardActions: { display: "flex", gap: 6, justifyContent: "space-around", marginTop: 8 },
  iconBtn: { background: "#1DB954", border: "none", padding: 5, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" },
  iconBtnDanger: { background: "#ff4444", border: "none", padding: 5, borderRadius: 6, cursor: "pointer" },
  
  btnGreenSmall: { background: "#1DB954", border: "none", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: "bold" },
  btnRedSmall: { background: "#ff4444", border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, color: "#fff" },
  
  listItem: { display: "flex", alignItems: "center", gap: 12, background: "#1e1e1e", padding: 10, borderRadius: 10, marginBottom: 8 },
  listRank: { color: "#1DB954", fontWeight: "bold", fontSize: 16, width: 40 },
  listImg: { width: 50, height: 50, borderRadius: 8, objectFit: "cover" },
  listInfo: { flex: 1 },
  listTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  listArtist: { fontSize: 12, color: "#aaa" },
  playSmallBtn: { background: "#1DB954", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  
  artistsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 15 },
  artistCard: { background: "#181818", borderRadius: 12, padding: 15, textAlign: "center", position: "relative" },
  artistRankBadge: { position: "absolute", top: 8, left: 8, background: "#1DB954", color: "#000", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 11 },
  artistImg: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", border: "2px solid #1DB954" },
  artistName: { fontWeight: "bold", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  artistViews: { fontSize: 10, color: "#aaa", marginTop: 4 },
  
  playlistBox: { background: "#181818", padding: 15, borderRadius: 12, marginTop: 15 },
  playlistHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 },
  playlistMusic: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottom: "1px solid #333" },
  
  resultsSection: { marginBottom: 30 },
  
  player: { position: "fixed", bottom: 0, right: 0, background: "#000", padding: 10, display: "flex", alignItems: "center", gap: 12, borderTop: "2px solid #1DB954", zIndex: 999999, height: 70 },
  playerImg: { width: 48, height: 48, borderRadius: 8, objectFit: "cover" },
  playerInfo: { minWidth: 150 },
  playerTitle: { fontWeight: "bold", fontSize: 13 },
  playerArtist: { fontSize: 11, color: "#aaa" },
  playBtn: { background: "#1DB954", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  progressArea: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  progress: { flex: 1, cursor: "pointer", height: 4, borderRadius: 2 },
  time: { fontSize: 11, color: "#aaa" },
  loadingSpinner: { width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999999 },
  modalBox: { background: "#181818", padding: 20, borderRadius: 12, width: "90%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 },
  
  loginBg: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #000, #1DB954)" },
  loginCard: { background: "#000", padding: 40, borderRadius: 20, textAlign: "center", width: "90%", maxWidth: 380 },
  logo: { fontSize: 36, margin: 0, color: "#1DB954" },
  sub: { color: "#aaa", marginTop: 10, fontSize: 14 },
  btnGreen: { background: "#1DB954", border: "none", padding: "12px 24px", borderRadius: 25, fontSize: 14, cursor: "pointer", marginTop: 20, fontWeight: "bold" }
};

// Adiciona animação de loading
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;