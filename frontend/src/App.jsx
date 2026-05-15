import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { openDB } from "idb";

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
  Download,
  Shuffle,
  Repeat,
  WifiOff,
  Flame
} from "lucide-react";

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

// ============================================
// OFFLINE DB (IndexedDB) - REAL (BLOB)
// ============================================
const DB_NAME = "moises_music_offline";
const STORE_NAME = "musicas";

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    }
  });
}

async function salvarOffline(musica) {
  const db = await getDB();
  await db.put(STORE_NAME, musica);
}

async function listarOffline() {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}

async function removerOffline(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

async function existeOffline(id) {
  const db = await getDB();
  const res = await db.get(STORE_NAME, id);
  return !!res;
}

export default function App() {
  const [user, setUser] = useState(null);

  const [musicas, setMusicas] = useState([]);
  const [playlists, setPlaylists] = useState({});
  const [favoritos, setFavoritos] = useState([]);

  const [offlineMusicas, setOfflineMusicas] = useState([]);
  const [aba, setAba] = useState("home");

  const [musicaTocando, setMusicaTocando] = useState(null);
  const [fila, setFila] = useState([]);
  const [indiceFila, setIndiceFila] = useState(0);

  const [videoYoutube, setVideoYoutube] = useState(null);
  const youtubePlayerRef = useRef(null);

  const audioRef = useRef(null);

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

  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Player UI
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);

  // Shuffle + Repeat
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Playlist Modal
  const [modalCriarPlaylist, setModalCriarPlaylist] = useState(false);
  const [nomePlaylist, setNomePlaylist] = useState("");

  // Add playlist modal
  const [modalAddPlaylist, setModalAddPlaylist] = useState(false);
  const [musicaParaAdd, setMusicaParaAdd] = useState(null);
  const [playlistSelecionada, setPlaylistSelecionada] = useState("");

  // TOP 20 YouTube
  const [top20, setTop20] = useState([]);
  const [carregandoTop, setCarregandoTop] = useState(false);

  const mostrarMsg = (txt) => {
    setMensagem(txt);
    setTimeout(() => setMensagem(""), 3000);
  };

  // ============================================
  // DETECTA MOBILE
  // ============================================
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      if (!mobile) setMenuAberto(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ============================================
  // CARREGAR OFFLINE
  // ============================================
  const carregarOffline = async () => {
    const lista = await listarOffline();
    setOfflineMusicas(lista || []);
  };

  // ============================================
  // LOGIN
  // ============================================
  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.user) {
          setUser(data.user);

          const jaEntrou = localStorage.getItem("jaEntrou");
          if (!jaEntrou) {
            mostrarMsg(`🎉 Bem-vindo ao Moises Music, ${data.user.nome.split(" ")[0]}!`);
            localStorage.setItem("jaEntrou", "sim");
          } else {
            mostrarMsg(`😊 Que bom ter você de volta, ${data.user.nome.split(" ")[0]}!`);
          }

          await carregarTudo();
          await carregarOffline();
        }
      });
  }, []);

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/logout`, { credentials: "include" });
    setUser(null);
    localStorage.removeItem("jaEntrou");
  };

  const carregarTudo = async () => {
    await carregarMusicas();
    await carregarPlaylists();
    await carregarFavoritos();
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

  // ============================================
  // TOP 20 YOUTUBE (ROTA CERTA)
  // ============================================
  const carregarTop20 = async () => {
    setCarregandoTop(true);

    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();
      setTop20(data.dados || []);
    } catch {
      setTop20([]);
    }

    setCarregandoTop(false);
  };

  // ============================================
  // PLAYER
  // ============================================
  const tocarMusica = (musica, listaAtual = null) => {
    if (!musica) return;

    if (listaAtual && Array.isArray(listaAtual)) {
      setFila(listaAtual);

      const idx = listaAtual.findIndex((x) => x.id === musica.id);
      setIndiceFila(idx >= 0 ? idx : 0);
    }

    setMusicaTocando(musica);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.stopVideo();
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

  const tocarFila = (lista) => {
    if (!lista || lista.length === 0) return;
    setFila(lista);
    setIndiceFila(0);
    tocarMusica(lista[0], lista);
  };

  const tocarProxima = () => {
    if (!fila.length) return;

    if (shuffle) {
      const rand = Math.floor(Math.random() * fila.length);
      setIndiceFila(rand);
      tocarMusica(fila[rand], fila);
      return;
    }

    const prox = indiceFila + 1;

    if (prox >= fila.length) {
      if (repeat) {
        setIndiceFila(0);
        tocarMusica(fila[0], fila);
        return;
      }

      mostrarMsg("✅ Fim da fila!");
      setFila([]);
      setIndiceFila(0);
      setMusicaTocando(null);
      setVideoYoutube(null);
      setTocando(false);
      return;
    }

    setIndiceFila(prox);
    tocarMusica(fila[prox], fila);
  };

  const tocarAnterior = () => {
    if (!fila.length) return;

    const ant = indiceFila - 1;
    if (ant < 0) return;

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
      if (!audioRef.current) return;

      if (tocando) {
        audioRef.current.pause();
        setTocando(false);
      } else {
        audioRef.current.play();
        setTocando(true);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => tocarProxima();
    const onTimeUpdate = () => setTempoAtual(audio.currentTime);
    const onLoaded = () => setDuracao(audio.duration || 0);
    const onPause = () => setTocando(false);
    const onPlay = () => setTocando(true);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [fila, indiceFila, shuffle, repeat]);

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

  // ============================================
  // FAVORITOS
  // ============================================
  const estaNosFavoritos = (id) => {
    return favoritos.some((m) => m.id === id);
  };

  const toggleFavorito = async (musica) => {
    const eh = estaNosFavoritos(musica.id);

    await fetch(`${API_URL}/api/favoritos/${eh ? "remove" : "add"}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musica)
    });

    await carregarFavoritos();
    mostrarMsg(eh ? "💔 Removido dos favoritos" : "❤️ Adicionado aos favoritos");
  };

  const tocarFavoritos = () => {
    if (!favoritos.length) return mostrarMsg("⚠️ Nenhum favorito");
    tocarFila(favoritos);
    mostrarMsg("⭐ Tocando favoritos");
  };

  // ============================================
  // PLAYLISTS
  // ============================================
  const abrirCriarPlaylist = () => {
    setNomePlaylist("");
    setModalCriarPlaylist(true);
  };

  const criarPlaylist = async () => {
    if (!nomePlaylist.trim()) return;

    await fetch(`${API_URL}/api/playlists/${nomePlaylist}`, {
      method: "POST",
      credentials: "include"
    });

    await carregarPlaylists();
    mostrarMsg(`📀 Playlist "${nomePlaylist}" criada`);
    setModalCriarPlaylist(false);
  };

  const abrirModalAddPlaylist = (musica) => {
    setMusicaParaAdd(musica);
    setPlaylistSelecionada("");
    setModalAddPlaylist(true);
  };

  const adicionarNaPlaylist = async () => {
    if (!playlistSelecionada || !musicaParaAdd) return;

    await fetch(`${API_URL}/api/playlists/${playlistSelecionada}/add`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musicaParaAdd)
    });

    await carregarPlaylists();
    mostrarMsg(`✅ Adicionado em "${playlistSelecionada}"`);
    setModalAddPlaylist(false);
  };

  const removerDaPlaylist = async (playlistNome, musicaId) => {
    await fetch(`${API_URL}/api/playlists/${playlistNome}/remove`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: musicaId })
    });

    await carregarPlaylists();
    mostrarMsg(`🗑️ Removido da playlist "${playlistNome}"`);
  };

  const deletarPlaylist = (nome) => {
    setConfirmTexto(`Deseja excluir a playlist "${nome}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/playlists/${nome}`, {
        method: "DELETE",
        credentials: "include"
      });

      await carregarPlaylists();
      mostrarMsg(`🗑️ Playlist "${nome}" excluída`);
    });
    setModalConfirm(true);
  };

  const tocarPlaylist = (nome) => {
    const lista = playlists[nome] || [];
    if (!lista.length) return mostrarMsg("⚠️ Playlist vazia");
    tocarFila(lista);
    mostrarMsg(`▶️ Tocando playlist "${nome}"`);
  };

  // ============================================
  // OFFLINE REAL (BLOB)
  // ============================================
  const baixarOffline = async (musica) => {
    if (musica.fonte === "youtube") {
      mostrarMsg("❌ Não é permitido baixar músicas do YouTube");
      return;
    }

    try {
      const jaExiste = await existeOffline(musica.id);
      if (jaExiste) return mostrarMsg("📥 Já está salvo offline!");

      mostrarMsg("⬇️ Baixando...");

      const res = await fetch(musica.url);
      const blob = await res.blob();

      await salvarOffline({
        id: musica.id,
        titulo: musica.titulo,
        artista: musica.artista,
        capa: musica.capa,
        fonte: musica.fonte,
        blob: blob,
        baixadoEm: new Date().toISOString()
      });

      await carregarOffline();
      mostrarMsg("✅ Música salva offline!");
    } catch (err) {
      console.error(err);
      mostrarMsg("❌ Erro ao baixar música");
    }
  };

  const excluirOffline = async (id) => {
    await removerOffline(id);
    await carregarOffline();
    mostrarMsg("🗑️ Removido do offline");
  };

  const tocarOffline = async () => {
    const lista = await listarOffline();
    if (!lista.length) return mostrarMsg("⚠️ Nenhuma música offline");

    const listaConvertida = lista.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      artista: m.artista,
      capa: m.capa,
      fonte: "local",
      url: URL.createObjectURL(m.blob),
      offline: true
    }));

    setOfflineMusicas(listaConvertida);
    tocarFila(listaConvertida);
    mostrarMsg("📥 Tocando Offline");
  };

  // ============================================
  // UPLOAD
  // ============================================
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
      mostrarMsg("✅ Música enviada!");
      setArquivoUpload(null);
      setTituloUpload("");
      setModalUpload(false);
      await carregarMusicas();
    } else {
      console.log("UPLOAD ERROR:", data);
      mostrarMsg("❌ " + (data.error || "Erro no upload"));
    }

    setSubindo(false);
  };

  // ============================================
  // EXCLUIR MUSICA
  // ============================================
  const excluirMusica = (id, titulo) => {
    setConfirmTexto(`Deseja excluir a música "${titulo}"?`);
    setConfirmAction(() => async () => {
      await fetch(`${API_URL}/api/musicas/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      await carregarTudo();
      mostrarMsg("🗑️ Música excluída");
    });
    setModalConfirm(true);
  };

  // ============================================
  // EDITAR MUSICA
  // ============================================
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
    await carregarMusicas();
    mostrarMsg("✏️ Música editada");
  };

  // ============================================
  // YOUTUBE SEARCH
  // ============================================
  const buscarYoutube = async (mais = false) => {
    if (!busca.trim()) return;

    setBuscando(true);

    const token = mais ? nextPageToken : "";
    const res = await fetch(
      `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(busca)}&pageToken=${token}`
    );
    const data = await res.json();

    if (!mais) {
      setResultadosYoutube(data.dados || []);
    } else {
      setResultadosYoutube((prev) => [...prev, ...(data.dados || [])]);
    }

    setNextPageToken(data.nextPageToken || null);
    setBuscando(false);
  };

  // ============================================
  // MENU MOBILE
  // ============================================
  const mudarAba = async (novaAba) => {
    setAba(novaAba);
    setMenuAberto(false);

    if (novaAba === "offline") {
      await carregarOffline();
    }

    if (novaAba === "top20") {
      await carregarTop20();
    }
  };

  // ============================================
  // TEMPO FORMAT
  // ============================================
  const formatarTempo = (segundos) => {
    if (!segundos || isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!user) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ fontSize: 36, margin: 0, color: "#1DB954" }}>🎵 Moises Music</h1>
          <p style={{ color: "#aaa", marginTop: 10 }}>Sua música, suas playlists, seu estilo.</p>

          <button onClick={login} style={styles.btnGreen}>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // UI
  // ============================================
  return (
    <div style={styles.app}>
      {mensagem && <div style={styles.toast}>{mensagem}</div>}

      {/* BOTÃO MENU MOBILE */}
      {isMobile && (
        <button style={styles.mobileMenuBtn} onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      {/* OVERLAY COM BLUR */}
      {menuAberto && isMobile && (
        <div style={styles.overlay} onClick={() => setMenuAberto(false)} />
      )}

      {/* SIDEBAR */}
      <div
        style={{
          ...styles.sidebar,
          transform: isMobile
            ? menuAberto
              ? "translateX(0)"
              : "translateX(-270px)"
            : "translateX(0)"
        }}
      >
        <h2 style={styles.logo}>Moises Music</h2>

        <button style={styles.menuBtn} onClick={() => mudarAba("home")}>
          <Home size={18} /> Home
        </button>

        <button style={styles.menuBtn} onClick={() => mudarAba("musicas")}>
          <Music size={18} /> Minhas músicas
        </button>

        <button style={styles.menuBtn} onClick={() => mudarAba("favoritos")}>
          <Heart size={18} /> Favoritos
        </button>

        <button style={styles.menuBtn} onClick={() => mudarAba("playlists")}>
          <ListMusic size={18} /> Playlists
        </button>

        <button style={styles.menuBtn} onClick={() => mudarAba("offline")}>
          <WifiOff size={18} /> Offline
        </button>

        <button style={styles.menuBtn} onClick={() => mudarAba("top20")}>
          <Flame size={18} /> Top 20 YouTube
        </button>

        <button
          style={styles.menuBtnGreen}
          onClick={() => {
            setModalUpload(true);
            setMenuAberto(false);
          }}
        >
          <Upload size={18} /> Upload
        </button>

        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, color: "#aaa" }}>{user.email}</p>
          <button style={styles.logoutBtn} onClick={logout}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          ...styles.content,
          marginLeft: isMobile ? 0 : 260,
          paddingBottom: musicaTocando ? 170 : 20
        }}
      >
        {/* TOP BAR */}
        <div style={styles.topbar}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Search size={20} />
            <input
              style={styles.searchInput}
              placeholder="Buscar música no YouTube..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarYoutube(false)}
            />
            <button style={styles.btnGreenSmall} onClick={() => buscarYoutube(false)}>
              Buscar
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img src={user.foto} alt="" style={styles.avatar} />
            <span style={{ fontWeight: "bold", color: "white" }}>
              {user.nome.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* HOME */}
        {aba === "home" && (
          <>
            <h1 style={styles.title}>Bem-vindo ao Moises Music 🎧</h1>

            <div style={styles.grid}>
              {musicas.slice(0, 8).map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={18} color={estaNosFavoritos(m.id) ? "#000" : "white"} />
                    </button>

                    {m.fonte !== "youtube" && (
                      <button style={styles.iconBtn} onClick={() => baixarOffline(m)}>
                        <Download size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MINHAS MUSICAS */}
        {aba === "musicas" && (
          <>
            <h1 style={styles.title}>🎵 Minhas músicas</h1>

            <div style={styles.grid}>
              {musicas.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={18} color={estaNosFavoritos(m.id) ? "#000" : "white"} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => abrirEditar(m.id, m.titulo)}>
                      <Pencil size={18} />
                    </button>

                    <button
                      style={styles.iconBtnDanger}
                      onClick={() => excluirMusica(m.id, m.titulo)}
                    >
                      <Trash2 size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => abrirModalAddPlaylist(m)}>
                      <Plus size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => baixarOffline(m)}>
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FAVORITOS */}
        {aba === "favoritos" && (
          <>
            <h1 style={styles.title}>❤️ Favoritos</h1>

            <button style={styles.btnGreenSmall} onClick={tocarFavoritos}>
              ▶️ Tocar favoritos
            </button>

            <div style={styles.grid}>
              {favoritos.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, favoritos)}>
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={18} color="#000" />
                    </button>

                    {m.fonte !== "youtube" && (
                      <button style={styles.iconBtn} onClick={() => baixarOffline(m)}>
                        <Download size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PLAYLISTS */}
        {aba === "playlists" && (
          <>
            <h1 style={styles.title}>📀 Playlists</h1>

            <button style={styles.btnGreenSmall} onClick={abrirCriarPlaylist}>
              + Criar playlist
            </button>

            {Object.keys(playlists).length === 0 && (
              <p style={{ color: "#aaa" }}>Nenhuma playlist criada ainda.</p>
            )}

            {Object.keys(playlists).map((nome) => (
              <div key={nome} style={styles.playlistBox}>
                <div style={styles.playlistHeader}>
                  <h3 style={{ margin: 0 }}>{nome}</h3>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={styles.btnGreenSmall} onClick={() => tocarPlaylist(nome)}>
                      ▶️ Tocar
                    </button>

                    <button style={styles.btnRedSmall} onClick={() => deletarPlaylist(nome)}>
                      🗑️ Excluir
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {(playlists[nome] || []).map((m) => (
                    <div key={m.id} style={styles.playlistMusic}>
                      <span
                        onClick={() => tocarMusica(m, playlists[nome])}
                        style={{ cursor: "pointer" }}
                      >
                        🎵 {m.titulo}
                      </span>

                      <button
                        style={styles.btnRedSmall}
                        onClick={() => removerDaPlaylist(nome, m.id)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* OFFLINE */}
        {aba === "offline" && (
          <>
            <h1 style={styles.title}>📥 Offline</h1>

            <button style={styles.btnGreenSmall} onClick={tocarOffline}>
              ▶️ Tocar Offline
            </button>

            {offlineMusicas.length === 0 && (
              <p style={{ color: "#aaa" }}>Nenhuma música salva offline ainda.</p>
            )}

            <div style={styles.grid}>
              {offlineMusicas.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, offlineMusicas)}>
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtnDanger} onClick={() => excluirOffline(m.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TOP 20 */}
        {aba === "top20" && (
          <>
            <h1 style={styles.title}>🔥 Top 20 YouTube</h1>

            {carregandoTop && <p style={{ color: "#aaa" }}>Carregando top 20...</p>}

            <div style={styles.grid}>
              {top20.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, top20)}>
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={18} color={estaNosFavoritos(m.id) ? "#000" : "white"} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => abrirModalAddPlaylist(m)}>
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* RESULTADOS YOUTUBE */}
        {resultadosYoutube.length > 0 && (
          <>
            <h2 style={{ marginTop: 40, color: "white" }}>🎬 Resultados do YouTube</h2>

            <div style={styles.grid}>
              {resultadosYoutube.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImg} />
                  <p style={styles.cardTitle}>{m.titulo}</p>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.iconBtn}
                      onClick={() => tocarMusica(m, resultadosYoutube)}
                    >
                      <Play size={18} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={18} color={estaNosFavoritos(m.id) ? "#000" : "white"} />
                    </button>

                    <button style={styles.iconBtn} onClick={() => abrirModalAddPlaylist(m)}>
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {nextPageToken && (
              <button
                disabled={buscando}
                style={styles.btnGreenSmall}
                onClick={() => buscarYoutube(true)}
              >
                {buscando ? "Carregando..." : "Carregar mais"}
              </button>
            )}
          </>
        )}
      </div>

      {/* PLAYER */}
      {musicaTocando && (
        <div style={{ ...styles.player, left: isMobile ? 0 : 260 }}>
          <div style={styles.playerLeft}>
            <img src={musicaTocando.capa} alt="" style={styles.playerImg} />

            <div>
              <p style={styles.playerTitle}>{musicaTocando.titulo}</p>
              <p style={styles.playerArtist}>{musicaTocando.artista}</p>
            </div>
          </div>

          <div style={styles.playerControls}>
            <button style={styles.playerBtn} onClick={tocarAnterior}>
              <SkipBack size={20} />
            </button>

            <button style={styles.playBtn} onClick={togglePlayPause}>
              {tocando ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button style={styles.playerBtn} onClick={tocarProxima}>
              <SkipForward size={20} />
            </button>

            <button
              style={{
                ...styles.playerBtn,
                border: shuffle ? "2px solid #1DB954" : "none"
              }}
              onClick={() => setShuffle(!shuffle)}
            >
              <Shuffle size={18} />
            </button>

            <button
              style={{
                ...styles.playerBtn,
                border: repeat ? "2px solid #1DB954" : "none"
              }}
              onClick={() => setRepeat(!repeat)}
            >
              <Repeat size={18} />
            </button>
          </div>

          {musicaTocando.fonte !== "youtube" && (
            <div style={styles.progressArea}>
              <span style={styles.time}>{formatarTempo(tempoAtual)}</span>

              <input
                type="range"
                min="0"
                max={duracao || 0}
                value={tempoAtual}
                onChange={(e) => {
                  const novoTempo = Number(e.target.value);
                  audioRef.current.currentTime = novoTempo;
                  setTempoAtual(novoTempo);
                }}
                style={styles.progress}
              />

              <span style={styles.time}>{formatarTempo(duracao)}</span>
            </div>
          )}

          {musicaTocando.fonte === "youtube" && (
            <div style={styles.progressArea}>
              <span style={{ color: "#aaa", fontSize: 12 }}>🎬 Tocando via YouTube</span>
            </div>
          )}

          <audio ref={audioRef} />
        </div>
      )}

      {/* YOUTUBE MINIMIZADO */}
      {videoYoutube && (
        <div style={styles.youtubeMini}>
          <YouTube
            key={videoYoutube}
            videoId={videoYoutube}
            opts={{
              width: "1",
              height: "1",
              playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1
              }
            }}
            onReady={onYoutubeReady}
            onStateChange={onYoutubeStateChange}
          />
        </div>
      )}

      {/* MODAL UPLOAD */}
      {modalUpload && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h2>Upload MP3 / WAV / OGG</h2>

            <input
              type="file"
              accept=".mp3,.wav,.ogg"
              onChange={(e) => setArquivoUpload(e.target.files[0])}
            />

            <input
              style={styles.input}
              placeholder="Nome da música (opcional)"
              value={tituloUpload}
              onChange={(e) => setTituloUpload(e.target.value)}
            />

            <button disabled={subindo} style={styles.btnGreenSmall} onClick={enviarUpload}>
              {subindo ? "Subindo..." : "Enviar"}
            </button>

            <button style={styles.btnRedSmall} onClick={() => setModalUpload(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM */}
      {modalConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>{confirmTexto}</h3>

            <button
              style={styles.btnGreenSmall}
              onClick={() => {
                confirmAction();
                setModalConfirm(false);
              }}
            >
              Sim
            </button>

            <button style={styles.btnRedSmall} onClick={() => setModalConfirm(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {modalEditar && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h2>Editar música</h2>

            <input
              style={styles.input}
              value={editarTitulo}
              onChange={(e) => setEditarTitulo(e.target.value)}
            />

            <button style={styles.btnGreenSmall} onClick={salvarEdicao}>
              Salvar
            </button>

            <button style={styles.btnRedSmall} onClick={() => setModalEditar(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CRIAR PLAYLIST */}
      {modalCriarPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h2>Criar Playlist</h2>

            <input
              style={styles.input}
              placeholder="Nome da playlist"
              value={nomePlaylist}
              onChange={(e) => setNomePlaylist(e.target.value)}
            />

            <button style={styles.btnGreenSmall} onClick={criarPlaylist}>
              Criar
            </button>

            <button style={styles.btnRedSmall} onClick={() => setModalCriarPlaylist(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL ADD PLAYLIST */}
      {modalAddPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h2>Adicionar em Playlist</h2>

            <select
              style={styles.input}
              value={playlistSelecionada}
              onChange={(e) => setPlaylistSelecionada(e.target.value)}
            >
              <option value="">Selecione...</option>
              {Object.keys(playlists).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <button style={styles.btnGreenSmall} onClick={adicionarNaPlaylist}>
              Adicionar
            </button>

            <button style={styles.btnRedSmall} onClick={() => setModalAddPlaylist(false)}>
              Cancelar
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
  app: {
    display: "flex",
    height: "100vh",
    background: "#121212"
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(5px)",
    zIndex: 9998
  },

  mobileMenuBtn: {
    position: "fixed",
    top: 15,
    left: 15,
    zIndex: 99999,
    background: "#1DB954",
    border: "none",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0px 4px 15px rgba(0,0,0,0.5)"
  },

  toast: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1DB954",
    padding: "10px 20px",
    borderRadius: 20,
    zIndex: 999999,
    fontWeight: "bold"
  },

  sidebar: {
    width: 260,
    background: "linear-gradient(180deg, #000 0%, #111 100%)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    transition: "0.35s ease",
    boxShadow: "4px 0px 25px rgba(0,0,0,0.7)"
  },

  logo: {
    margin: 0,
    color: "#1DB954",
    marginBottom: 30,
    fontSize: 22
  },

  menuBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    display: "flex",
    gap: 10,
    padding: 12,
    cursor: "pointer",
    fontSize: 15,
    borderRadius: 12,
    textAlign: "left",
    transition: "0.2s",
    marginBottom: 6
  },

  menuBtnGreen: {
    background: "#1DB954",
    border: "none",
    color: "black",
    display: "flex",
    gap: 10,
    padding: 12,
    cursor: "pointer",
    fontSize: 15,
    borderRadius: 12,
    marginTop: 20,
    fontWeight: "bold"
  },

  logoutBtn: {
    background: "#222",
    border: "none",
    color: "white",
    display: "flex",
    gap: 10,
    padding: 12,
    cursor: "pointer",
    fontSize: 15,
    borderRadius: 12,
    width: "100%"
  },

  content: {
    flex: 1,
    padding: 20,
    overflowY: "auto"
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10
  },

  searchInput: {
    background: "#222",
    border: "none",
    padding: "10px 15px",
    borderRadius: 20,
    color: "white",
    width: 250
  },

  avatar: {
    width: 35,
    height: 35,
    borderRadius: "50%"
  },

  title: {
    marginTop: 0,
    fontSize: 30,
    color: "white"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 15
  },

  card: {
    background: "#181818",
    padding: 12,
    borderRadius: 14,
    transition: "0.2s",
    boxShadow: "0px 3px 12px rgba(0,0,0,0.4)"
  },

  cardImg: {
    width: "100%",
    borderRadius: 12
  },

  cardTitle: {
    margin: "10px 0",
    fontWeight: "bold",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "white"
  },

  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10
  },

  iconBtn: {
    background: "#1DB954",
    border: "none",
    padding: 8,
    borderRadius: 12,
    cursor: "pointer"
  },

  iconBtnDanger: {
    background: "#ff4444",
    border: "none",
    padding: 8,
    borderRadius: 12,
    cursor: "pointer"
  },

  btnGreenSmall: {
    background: "#1DB954",
    border: "none",
    padding: "10px 15px",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: 10
  },

  btnRedSmall: {
    background: "#ff4444",
    border: "none",
    padding: "10px 15px",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: 10,
    color: "white"
  },

  playlistBox: {
    background: "#181818",
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    color: "white"
  },

  playlistHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },

  playlistMusic: {
    display: "flex",
    justifyContent: "space-between",
    padding: 8,
    borderBottom: "1px solid #333",
    color: "#ddd"
  },

  player: {
    position: "fixed",
    bottom: 0,
    right: 0,
    background: "linear-gradient(90deg, #000 0%, #111 100%)",
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderTop: "2px solid #1DB954",
    zIndex: 999999,
    height: 90
  },

  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "35%"
  },

  playerImg: {
    width: 55,
    height: 55,
    borderRadius: 12,
    objectFit: "cover"
  },

  playerTitle: {
    margin: 0,
    fontWeight: "bold",
    color: "white",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 180
  },

  playerArtist: {
    margin: 0,
    fontSize: 12,
    color: "#aaa"
  },

  playerControls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    width: "25%"
  },

  playBtn: {
    background: "#1DB954",
    border: "none",
    borderRadius: "50%",
    width: 45,
    height: 45,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 3px 12px rgba(0,0,0,0.5)"
  },

  playerBtn: {
    background: "#222",
    border: "none",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer",
    color: "white"
  },

  progressArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "40%"
  },

  progress: {
    flex: 1,
    cursor: "pointer"
  },

  time: {
    fontSize: 12,
    color: "#aaa"
  },

  youtubeMini: {
    position: "fixed",
    bottom: 0,
    right: 0,
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0.01
  },

  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999
  },

  modalBox: {
    background: "#181818",
    padding: 20,
    borderRadius: 15,
    width: 320,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    color: "white"
  },

  input: {
    padding: 10,
    borderRadius: 10,
    border: "none",
    background: "#222",
    color: "white"
  },

  loginBg: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #000 0%, #1DB954 100%)"
  },

  loginCard: {
    background: "#000",
    padding: 40,
    borderRadius: 20,
    textAlign: "center",
    width: 400
  },

  btnGreen: {
    background: "#1DB954",
    border: "none",
    padding: "12px 25px",
    borderRadius: 25,
    fontSize: 16,
    cursor: "pointer",
    marginTop: 20,
    fontWeight: "bold"
  }
};