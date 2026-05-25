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
  ExternalLink,
  Download,
  WifiOff
} from "lucide-react";

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3333"
  : "https://moises-s-music.onrender.com";

// ============================================
// CACHE OFFLINE - IndexedDB
// ============================================
let db = null;

function abrirDB() {
  return new Promise((resolve) => {
    if (db) { resolve(db); return; }
    const request = indexedDB.open("MoisesMusicOffline", 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("musicas", { keyPath: "id" });
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = () => resolve(null);
  });
}

async function salvarNoCache(musica, blob) {
  const database = await abrirDB();
  if (!database) return false;
  const tx = database.transaction(["musicas"], "readwrite");
  tx.objectStore("musicas").put({
    id: musica.id,
    titulo: musica.titulo,
    artista: musica.artista,
    capa: musica.capa,
    tipo: musica.fonte || "upload",
    videoId: musica.videoId,
    blob: blob,
    data: Date.now()
  });
  return true;
}

async function buscarDoCache(id) {
  const database = await abrirDB();
  if (!database) return null;
  return new Promise((resolve) => {
    const tx = database.transaction(["musicas"], "readonly");
    const req = tx.objectStore("musicas").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function listarCache() {
  const database = await abrirDB();
  if (!database) return [];
  return new Promise((resolve) => {
    const tx = database.transaction(["musicas"], "readonly");
    const req = tx.objectStore("musicas").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

async function removerDoCache(id) {
  const database = await abrirDB();
  if (!database) return;
  const tx = database.transaction(["musicas"], "readwrite");
  tx.objectStore("musicas").delete(id);
}

async function limparCacheAntigo() {
  const cacheItens = await listarCache();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  const agora = Date.now();
  for (const item of cacheItens) {
    if (agora - item.data > trintaDias) {
      await removerDoCache(item.id);
    }
  }
}

// Tentativa de usar sessionStorage se localStorage for bloqueado
let storage;
try {
  storage = window.sessionStorage;
  storage.setItem('test', 'test');
  storage.removeItem('test');
} catch(e) {
  console.log('Storage bloqueado, usando fallback');
  storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}

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
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [ultimaBusca, setUltimaBusca] = useState("");
  
  // Estados do offline
  const [modoOffline, setModoOffline] = useState(!navigator.onLine);
  const [musicasCache, setMusicasCache] = useState([]);
  const [baixando, setBaixando] = useState({});
  
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

  const fecharMenuMobile = useCallback(() => {
    if (isMobile) setMenuAberto(false);
  }, [isMobile]);

  // Mobile detect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMenuAberto(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carregar cache ao iniciar
  useEffect(() => {
    const carregarCache = async () => {
      const cache = await listarCache();
      setMusicasCache(cache);
      limparCacheAntigo();
    };
    carregarCache();
  }, []);

  // Detectar online/offline
  useEffect(() => {
    const handleOnline = () => {
      setModoOffline(false);
      mostrarMsg("🟢 Conexão restaurada!");
      carregarTudo();
    };
    const handleOffline = () => {
      setModoOffline(true);
      mostrarMsg("🔴 Modo offline - tocando músicas baixadas");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Limpar resultados da busca ao mudar de aba
  useEffect(() => {
    if (aba !== "home") {
      setResultadosYoutube([]);
      setNextPageToken(null);
      setUltimaBusca("");
      setBusca("");
    }
  }, [aba]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setAttribute('playsinline', 'true');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.stopVideo();
          youtubePlayerRef.current.destroy?.();
        } catch(e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    
    const onEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Erro ao repetir:", e));
      } else {
        tocarProxima();
      }
    };
    
    const onTimeUpdate = () => {
      if (audio.currentTime && !isNaN(audio.currentTime)) {
        setTempoAtual(audio.currentTime);
      }
    };
    
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuracao(audio.duration);
      }
      setTempoAtual(0);
    };
    
    const onPlay = () => setTocando(true);
    const onPause = () => setTocando(false);
    const onError = (e) => {
      console.error("Erro no audio:", e);
      setLoading(false);
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
  }, [repeatMode]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        mostrarMsg("Tempo limite excedido");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loading, mostrarMsg]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          carregarTudo();
        }
      })
      .catch(err => console.error("Erro ao carregar usuário:", err));
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.stopVideo();
      } catch(e) {}
      youtubePlayerRef.current = null;
    }
  };

  const carregarTudo = async () => {
    if (modoOffline) return;
    if (carregandoDados) return;
    setCarregandoDados(true);
    await Promise.all([
      carregarMusicas(),
      carregarPlaylists(),
      carregarFavoritos(),
      carregarTopYoutube(),
      carregarTrendings()
    ]);
    setCarregandoDados(false);
  };

  const carregarMusicas = async () => {
    if (modoOffline) return;
    try {
      const res = await fetch(`${API_URL}/api/musicas`, { credentials: "include" });
      const data = await res.json();
      setMusicas(data.dados || []);
    } catch (err) {
      console.error("Erro ao carregar musicas:", err);
      setMusicas([]);
    }
  };

  const carregarPlaylists = async () => {
    if (modoOffline) return;
    try {
      const res = await fetch(`${API_URL}/api/playlists`, { credentials: "include" });
      const data = await res.json();
      setPlaylists(data || {});
    } catch (err) {
      console.error("Erro ao carregar playlists:", err);
      setPlaylists({});
    }
  };

  const carregarFavoritos = async () => {
    if (modoOffline) return;
    try {
      const res = await fetch(`${API_URL}/api/favoritos`, { credentials: "include" });
      const data = await res.json();
      setFavoritos(data || []);
    } catch (err) {
      console.error("Erro ao carregar favoritos:", err);
      setFavoritos([]);
    }
  };

  const carregarTopYoutube = async () => {
    if (modoOffline) return;
    try {
      const res = await fetch(`${API_URL}/api/top-youtube`);
      const data = await res.json();
      setTopYoutube((data.dados || []).slice(0, 5));
    } catch (err) {
      console.error("Erro ao carregar top youtube:", err);
      setTopYoutube([]);
    }
  };

  const carregarTrendings = async () => {
    if (modoOffline) return;
    try {
      const [musicRes, artistRes] = await Promise.all([
        fetch(`${API_URL}/api/trending-music?region=BR`),
        fetch(`${API_URL}/api/trending-artists?region=BR`)
      ]);
      const musicData = await musicRes.json();
      const artistData = await artistRes.json();
      if (musicData.success) setTrendingMusics((musicData.dados || []).slice(0, 5));
      if (artistData.success) setTrendingArtists(artistData.dados || []);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirArtistaYoutube = (artistaNome) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(artistaNome)}`;
    window.open(searchUrl, "_blank");
  };

  const estaNoCache = (id) => musicasCache.some(m => m.id === id);

  // Baixar música para offline
  const baixarMusicaOffline = async (musica) => {
    if (estaNoCache(musica.id)) {
      mostrarMsg(`📀 "${musica.titulo}" já está offline`);
      return;
    }
    
    setBaixando(prev => ({ ...prev, [musica.id]: true }));
    mostrarMsg(`⬇️ Baixando "${musica.titulo}"...`);
    
    try {
      let url;
      if (musica.fonte === "youtube" && musica.videoId) {
        url = `${API_URL}/api/youtube-audio/${musica.videoId}`;
      } else if (musica.url) {
        url = musica.url;
      } else {
        throw new Error("URL não disponível");
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao baixar");
      
      const blob = await response.blob();
      await salvarNoCache(musica, blob);
      const cache = await listarCache();
      setMusicasCache(cache);
      mostrarMsg(`✅ "${musica.titulo}" disponível offline!`);
    } catch (error) {
      console.error("Erro ao baixar:", error);
      mostrarMsg(`❌ Erro ao baixar "${musica.titulo}"`);
    } finally {
      setBaixando(prev => {
        const newState = { ...prev };
        delete newState[musica.id];
        return newState;
      });
    }
  };

  const removerMusicaOffline = async (musica) => {
    await removerDoCache(musica.id);
    const cache = await listarCache();
    setMusicasCache(cache);
    mostrarMsg(`🗑️ "${musica.titulo}" removido do offline`);
  };

  // ⭐ FUNÇÃO BUSCAR YOUTUBE CORRIGIDA
  const buscarYoutube = async (mais = false) => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível buscar");
      return;
    }
    
    if (!mais && !busca.trim()) {
      mostrarMsg("Digite algo para buscar");
      return;
    }
    
    if (mais && !ultimaBusca) {
      mostrarMsg("Nenhuma busca anterior para carregar mais");
      return;
    }
    
    setBuscando(true);
    
    if (!mais) {
      setUltimaBusca(busca);
      setDestaqueBusca(true);
    }
    
    const termoBusca = mais ? ultimaBusca : busca;
    const token = mais ? nextPageToken : "";
    
    try {
      const url = `${API_URL}/api/buscar-youtube?q=${encodeURIComponent(termoBusca)}&pageToken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      
      const resultados = data.dados || [];
      const nextToken = data.nextPageToken || null;
      
      if (!mais) {
        setResultadosYoutube(resultados);
      } else {
        const novosIds = new Set(resultados.map(r => r.id));
        const filtrados = resultadosYoutube.filter(p => !novosIds.has(p.id));
        setResultadosYoutube([...filtrados, ...resultados]);
      }
      
      setNextPageToken(nextToken);
      
      if (!mais) {
        setTimeout(() => setDestaqueBusca(false), 3000);
        setBusca("");
        if (resultados.length === 0) {
          mostrarMsg(`Nenhum resultado encontrado para "${termoBusca}"`);
        } else {
          mostrarMsg(`🎬 ${resultados.length} resultados encontrados`);
        }
      } else {
        if (resultados.length === 0 || !nextToken) {
          mostrarMsg("📋 Fim dos resultados");
          setNextPageToken(null);
        } else {
          mostrarMsg(`📋 +${resultados.length} resultados carregados`);
        }
      }
      
    } catch (error) {
      console.error("Erro na busca:", error);
      mostrarMsg(`Erro ao buscar: ${error.message}`);
      if (!mais) {
        setResultadosYoutube([]);
        setNextPageToken(null);
      }
    } finally {
      setBuscando(false);
    }
  };

  const limparResultadosBusca = () => {
    setResultadosYoutube([]);
    setNextPageToken(null);
    setUltimaBusca("");
    setBusca("");
    mostrarMsg("Resultados limpos");
  };

  // ⭐ FUNÇÃO TOCAR MUSICA COM SUPORTE OFFLINE
  const tocarMusica = useCallback(async (musica, listaAtual = null) => {
    if (!musica) return;
    if (musicaTocando?.id === musica.id && tocando) return;
    
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
      try {
        youtubePlayerRef.current.stopVideo();
        youtubePlayerRef.current.destroy?.();
      } catch(e) {}
      youtubePlayerRef.current = null;
    }
    setVideoYoutube(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current.load();
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verificar cache primeiro
    const cached = await buscarDoCache(musica.id);
    
    if (cached && cached.blob) {
      try {
        const audioUrl = URL.createObjectURL(cached.blob);
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setTocando(true);
            setLoading(false);
          }).catch((err) => {
            console.error("Erro ao tocar do cache:", err);
            setLoading(false);
            mostrarMsg("Erro ao reproduzir música do cache");
          });
        }
      } catch (error) {
        console.error("Erro:", error);
        setLoading(false);
      }
      return;
    }
    
    // Se não está em cache e está offline
    if (modoOffline || !navigator.onLine) {
      setLoading(false);
      mostrarMsg(`🔴 Offline: "${musica.titulo}" não está disponível. Conecte-se para baixar.`);
      return;
    }
    
    // Tocar normal (streaming)
    if (musica.fonte === "youtube" && musica.videoId) {
      setTimeout(() => {
        setVideoYoutube(musica.videoId);
        setTocando(true);
        setLoading(false);
        // Baixar em background para ouvir depois
        setTimeout(() => baixarMusicaOffline(musica), 1000);
      }, 200);
      return;
    }
    
    if (musica.url) {
      try {
        audioRef.current.src = musica.url;
        audioRef.current.load();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setTocando(true);
            setLoading(false);
            // Baixar em background para ouvir depois
            setTimeout(() => baixarMusicaOffline(musica), 1000);
          }).catch((err) => {
            console.error("Erro ao dar play:", err);
            setLoading(false);
            mostrarMsg("Erro ao reproduzir música");
          });
        }
      } catch (error) {
        console.error("Erro ao tocar:", error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [musicaTocando, tocando, shuffleMode, fila, loading, modoOffline]);

  const tocarFila = useCallback((lista) => {
    if (!lista || lista.length === 0) {
      mostrarMsg("Nenhuma música na lista");
      return;
    }
    let novaFila = shuffleMode ? [...lista].sort(() => Math.random() - 0.5) : [...lista];
    setFila(novaFila);
    setIndiceFila(0);
    tocarMusica(novaFila[0], novaFila);
  }, [shuffleMode, mostrarMsg, tocarMusica]);

  const tocarProxima = useCallback(() => {
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
  }, [fila, indiceFila, repeatMode, mostrarMsg, tocarMusica]);

  const tocarAnterior = useCallback(() => {
    if (!fila.length) return;
    let ant = indiceFila - 1;
    if (ant < 0) ant = 0;
    setIndiceFila(ant);
    tocarMusica(fila[ant], fila);
  }, [fila, indiceFila, tocarMusica]);

  const togglePlayPause = () => {
    if (!musicaTocando) return;

    if (musicaTocando.fonte === "youtube" && videoYoutube) {
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
        audioRef.current.play().catch(e => console.error(e));
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
    setTimeout(() => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.playVideo();
        setTocando(true);
      }
    }, 100);
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
    if (musicaTocando?.fonte !== "youtube" && audioRef.current && !isNaN(novoTempo)) {
      audioRef.current.currentTime = novoTempo;
      setTempoAtual(novoTempo);
    }
  };

  const estaNosFavoritos = (id) => favoritos.some((m) => m.id === id);

  const toggleFavorito = async (musica) => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível modificar favoritos");
      return;
    }
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

  const criarPlaylist = async () => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível criar playlists");
      return;
    }
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
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível adicionar à playlist");
      return;
    }
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
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível remover da playlist");
      return;
    }
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
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível excluir playlists");
      return;
    }
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

  const enviarUpload = async () => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível fazer upload");
      return;
    }
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

  const excluirMusica = (id, titulo) => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível excluir músicas");
      return;
    }
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

  const abrirEditar = (id, titulo) => {
    setEditarMusicaId(id);
    setEditarTitulo(titulo);
    setModalEditar(true);
  };

  const salvarEdicao = async () => {
    if (modoOffline) {
      mostrarMsg("Modo offline: não é possível editar");
      return;
    }
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

  // Login screen
  if (!user) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.animatedBg}>
          <div style={styles.gradient1}></div>
          <div style={styles.gradient2}></div>
          <div style={styles.gradient3}></div>
        </div>
        
        <div style={styles.particles}>
          {[...Array(15)].map((_, i) => (
            <div key={i} style={{ ...styles.particle, animationDelay: `${i * 0.4}s`, left: `${Math.random() * 100}%` }} />
          ))}
        </div>
        
        <div style={styles.loginCard}>
          <div style={styles.logoWrapper}>
            <div style={styles.logoIcon}>🎵</div>
            <h1 style={styles.logoText}>
              Moises<span style={styles.logoHighlight}>Music</span>
            </h1>
          </div>
          
          <p style={styles.slogan}>
            Sua trilha sonora,<br />
            <span style={styles.sloganHighlight}>do seu jeito</span>
          </p>
          
          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🎧</span>
              <span>Músicas ilimitadas</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📱</span>
              <span>Disponível em todos dispositivos</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🎵</span>
              <span>Upload das suas músicas</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📀</span>
              <span>Ouça offline</span>
            </div>
          </div>
          
          <button onClick={login} style={styles.btnPremium}>
            <span style={styles.btnContent}>
              <span style={styles.googleIcon}>G</span>
              Entrar com Google
              <span style={styles.btnArrow}>→</span>
            </span>
          </button>
          
          <p style={styles.footerText}>
            Milhares de músicas ao seu alcance
          </p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={styles.app}>
      {mensagem && <div style={styles.toast}>{mensagem}</div>}
      {loading && <div style={styles.loading}>🎵 Carregando música...</div>}

      {/* Indicador de modo offline */}
      {modoOffline && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          background: "#ff4444",
          color: "white",
          padding: "4px 12px",
          fontSize: 12,
          borderRadius: "0 0 0 8px",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <WifiOff size={14} /> Modo Offline
        </div>
      )}

      {isMobile && (
        <button style={styles.mobileMenuBtn} onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? <X size={24} color="black" /> : <Menu size={24} color="black" />}
        </button>
      )}

      {menuAberto && isMobile && <div style={styles.overlay} onClick={() => setMenuAberto(false)} />}

      <div style={{ 
        ...styles.sidebar, 
        transform: isMobile && !menuAberto ? "translateX(-100%)" : "translateX(0)",
        position: isMobile ? "fixed" : "fixed"
      }}>
        <h2 style={styles.logo}>Moises Music</h2>

        <button style={{ ...styles.navItem, ...(aba === "home" && styles.navItemActive) }} 
          onClick={() => { setAba("home"); fecharMenuMobile(); }}>
          <Home size={20} /> Home
        </button>

        <button style={{ ...styles.navItem, ...(aba === "musicas" && styles.navItemActive) }} 
          onClick={() => { setAba("musicas"); fecharMenuMobile(); carregarMusicas(); }}>
          <Music size={20} /> Minhas músicas
        </button>

        <button style={{ ...styles.navItem, ...(aba === "favoritos" && styles.navItemActive) }} 
          onClick={() => { setAba("favoritos"); fecharMenuMobile(); carregarFavoritos(); }}>
          <Heart size={20} /> Favoritos
        </button>

        <button style={{ ...styles.navItem, ...(aba === "playlists" && styles.navItemActive) }} 
          onClick={() => { setAba("playlists"); fecharMenuMobile(); carregarPlaylists(); }}>
          <ListMusic size={20} /> Playlists
        </button>

        <button style={{ ...styles.navItem, ...(aba === "topYoutube" && styles.navItemActive) }} 
          onClick={() => { setAba("topYoutube"); fecharMenuMobile(); carregarTopYoutube(); }}>
          <Flame size={20} /> Top YouTube
        </button>

        <button style={{ ...styles.navItem, ...(aba === "offline" && styles.navItemActive) }} 
          onClick={() => { setAba("offline"); fecharMenuMobile(); }}>
          <Download size={20} /> Offline
          {musicasCache.length > 0 && (
            <span style={{
              background: "#1DB954",
              color: "black",
              fontSize: 11,
              borderRadius: 10,
              padding: "2px 6px",
              marginLeft: 8
            }}>{musicasCache.length}</span>
          )}
        </button>

        <button style={styles.uploadBtn} onClick={() => { setModalUpload(true); fecharMenuMobile(); }}>
          <Upload size={18} /> Upload
        </button>

        <div style={styles.userInfo}>
          <img src={user.foto || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${encodeURIComponent(user.nome)}`} alt="" style={styles.avatar} />
          <div style={styles.userTextInfo}>
            <p style={styles.userName}>{user.nome}</p>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ 
        ...styles.content, 
        marginLeft: isMobile ? 0 : 260,
        paddingBottom: musicaTocando ? (isMobile ? 100 : 120) : 20 
      }}>
        <div style={styles.topbar}>
          <div style={styles.searchContainer}>
            <Search size={18} color="#b3b3b3" />
            <input
              style={styles.searchInput}
              placeholder="Buscar música no YouTube..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarYoutube(false)}
              disabled={modoOffline}
            />
            <button style={styles.searchBtn} onClick={() => buscarYoutube(false)} disabled={buscando || modoOffline}>
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {aba === "home" && (
          <>
            <h1 style={styles.title}>Bem-vindo ao Moisés Music 🎧</h1>

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🔥 Músicas em alta</h2>
              <button style={styles.playAllBtn} onClick={() => tocarFila(trendingMusics)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            <div style={styles.grid}>
              {trendingMusics.map((m) => (
                <div key={m.id} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImage} crossOrigin="anonymous" />
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                    {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>}
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
                    {!estaNoCache(m.id) && !baixando[m.id] && (
                      <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                        <Download size={16} color="white" />
                      </button>
                    )}
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
                    crossOrigin="anonymous"
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
                    <p style={styles.cardArtist}>{m.artista || "Desconhecido"}</p>
                    {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>}
                    {baixando[m.id] && <span style={{ fontSize: 10, color: "#ffa500", display: "inline-block", marginTop: 4 }}>⬇️</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                      <Play size={16} color="white" />
                    </button>
                    <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                      <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                    </button>
                    {!estaNoCache(m.id) && !baixando[m.id] && (
                      <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                        <Download size={16} color="white" />
                      </button>
                    )}
                    {estaNoCache(m.id) && (
                      <button style={styles.iconBtnDanger} onClick={() => removerMusicaOffline(m)}>
                        <Trash2 size={16} color="white" />
                      </button>
                    )}
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

        {aba === "topYoutube" && (
          <>
            <h1 style={styles.title}>🔥 Top YouTube Brasil</h1>
            <button style={styles.playAllBtn} onClick={() => tocarFila(topYoutube)}>
              <Play size={14} /> Tocar todas ({topYoutube.length})
            </button>
            <div style={styles.grid}>
              {topYoutube.map((m, idx) => (
                <div key={m.id} style={styles.card}>
                  <div style={styles.rankBadge}>#{idx + 1}</div>
                  <img src={m.capa} alt="" style={styles.cardImage} crossOrigin="anonymous" />
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                    <p style={styles.cardArtist}>{m.artista}</p>
                    {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>}
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
                    {!estaNoCache(m.id) && !baixando[m.id] && (
                      <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                        <Download size={16} color="white" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {aba === "musicas" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>🎵 Minhas músicas</h1>
              <button style={styles.playAllBtn} onClick={() => tocarFila(musicas)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            {musicas.length === 0 ? (
              <div style={styles.emptyMsg}>
                <p>Nenhuma música encontrada. Faça upload!</p>
                <button style={styles.uploadBtnSmall} onClick={() => setModalUpload(true)}>
                  <Upload size={16} /> Enviar música
                </button>
              </div>
            ) : (
              <div style={styles.grid}>
                {musicas.map((m) => (
                  <div key={m.id} style={styles.card}>
                    <div style={styles.cardIcon}>🎵</div>
                    <div style={styles.cardInfo}>
                      <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                      <p style={styles.cardArtist}>{m.artista || "Desconhecido"}</p>
                      {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>}
                      {baixando[m.id] && <span style={{ fontSize: 10, color: "#ffa500", display: "inline-block", marginTop: 4 }}>⬇️</span>}
                    </div>
                    <div style={styles.cardActions}>
                      <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicas)}>
                        <Play size={16} color="white" />
                      </button>
                      <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                        <Heart size={16} fill={estaNosFavoritos(m.id) ? "#1DB954" : "none"} color={estaNosFavoritos(m.id) ? "#1DB954" : "white"} />
                      </button>
                      {!estaNoCache(m.id) && !baixando[m.id] && (
                        <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                          <Download size={16} color="white" />
                        </button>
                      )}
                      {estaNoCache(m.id) && (
                        <button style={styles.iconBtnDanger} onClick={() => removerMusicaOffline(m)}>
                          <Trash2 size={16} color="white" />
                        </button>
                      )}
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
            )}
          </>
        )}

        {aba === "favoritos" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>❤️ Músicas favoritas</h1>
              <button style={styles.playAllBtn} onClick={() => tocarFila(favoritos)}>
                <Play size={14} /> Tocar todas
              </button>
            </div>
            {favoritos.length === 0 ? (
              <p style={styles.emptyMsg}>Nenhuma música favorita ainda.</p>
            ) : (
              <div style={styles.grid}>
                {favoritos.map((m) => (
                  <div key={m.id} style={styles.card}>
                    {m.fonte === "youtube" && m.capa ? (
                      <img src={m.capa} alt="" style={styles.cardImage} crossOrigin="anonymous" />
                    ) : (
                      <div style={styles.cardIcon}>🎵</div>
                    )}
                    <div style={styles.cardInfo}>
                      <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                      <p style={styles.cardArtist}>{m.artista}</p>
                      {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>}
                    </div>
                    <div style={styles.cardActions}>
                      <button style={styles.iconBtn} onClick={() => tocarMusica(m, favoritos)}>
                        <Play size={16} color="white" />
                      </button>
                      <button style={styles.iconBtn} onClick={() => toggleFavorito(m)}>
                        <Heart size={16} fill="#1DB954" color="#1DB954" />
                      </button>
                      {!estaNoCache(m.id) && !baixando[m.id] && m.fonte !== "youtube" && (
                        <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                          <Download size={16} color="white" />
                        </button>
                      )}
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

        {aba === "playlists" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>📀 Suas playlists</h1>
              <button style={styles.createPlaylistBtn} onClick={() => setModalPlaylist(true)} disabled={modoOffline}>
                + Criar playlist
              </button>
            </div>
            {Object.keys(playlists).length === 0 && <p style={styles.emptyMsg}>Nenhuma playlist criada ainda.</p>}
            {Object.keys(playlists).map((nome) => (
              <div key={nome} style={styles.playlistBox}>
                <div style={styles.playlistHeader}>
                  <h3 style={styles.playlistTitle}>{nome}</h3>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={styles.playAllBtn} onClick={() => tocarFila(playlists[nome] || [])}>
                      <Play size={14} /> Tocar tudo
                    </button>
                    <button style={styles.deletePlaylistBtn} onClick={() => deletarPlaylist(nome)} disabled={modoOffline}>
                      Excluir
                    </button>
                  </div>
                </div>
                <div style={styles.playlistSongs}>
                  {(playlists[nome] || []).length === 0 ? (
                    <p style={styles.emptyPlaylistMsg}>Nenhuma música nesta playlist</p>
                  ) : (
                    (playlists[nome] || []).map((m) => (
                      <div key={m.id} style={styles.playlistSong}>
                        <div style={styles.playlistSongIcon}>🎵</div>
                        <div style={styles.playlistSongInfo}>
                          <p style={styles.playlistSongTitle}>{m.titulo}</p>
                          <p style={styles.playlistSongArtist}>{m.artista}</p>
                          {estaNoCache(m.id) && <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block" }}>📀 Offline</span>}
                        </div>
                        <div style={styles.playlistSongActions}>
                          <button style={styles.iconBtnSmall} onClick={() => tocarMusica(m, playlists[nome])}>
                            <Play size={14} color="white" />
                          </button>
                          <button style={styles.iconBtnDangerSmall} onClick={() => abrirRemoveFromPlaylist(nome, m.id)} disabled={modoOffline}>
                            <Trash2 size={14} color="white" />
                          </button>
                          {!estaNoCache(m.id) && !baixando[m.id] && (
                            <button style={styles.iconBtnSmall} onClick={() => baixarMusicaOffline(m)}>
                              <Download size={14} color="white" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {aba === "offline" && (
          <>
            <div style={styles.sectionHeader}>
              <h1 style={styles.title}>📀 Músicas disponíveis offline</h1>
              <button style={styles.playAllBtn} onClick={() => tocarFila(musicasCache)}>
                <Play size={14} /> Tocar todas offline
              </button>
            </div>
            {musicasCache.length === 0 ? (
              <div style={styles.emptyMsg}>
                <p>Nenhuma música baixada para offline.</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>As músicas que você ouvir serão baixadas automaticamente!</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {musicasCache.map((m) => (
                  <div key={m.id} style={styles.card}>
                    <div style={styles.cardIcon}>🎵</div>
                    <div style={styles.cardInfo}>
                      <p style={styles.cardTitle}>{m.titulo.substring(0, 35)}</p>
                      <p style={styles.cardArtist}>{m.artista || "Desconhecido"}</p>
                      <span style={{ fontSize: 10, color: "#1DB954", display: "inline-block", marginTop: 4 }}>📀 Offline</span>
                    </div>
                    <div style={styles.cardActions}>
                      <button style={styles.iconBtn} onClick={() => tocarMusica(m, musicasCache)}>
                        <Play size={16} color="white" />
                      </button>
                      <button style={styles.iconBtnDanger} onClick={() => removerMusicaOffline(m)}>
                        <Trash2 size={16} color="white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* RESULTADOS DA BUSCA DO YOUTUBE */}
        {resultadosYoutube.length > 0 && !modoOffline && (
          <>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🎬 Resultados da busca: "{ultimaBusca}"</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={styles.clearResultsBtn} onClick={limparResultadosBusca}>
                  Limpar resultados
                </button>
              </div>
            </div>
            <div style={destaqueBusca ? styles.gridHighlight : styles.grid}>
              {resultadosYoutube.map((m, idx) => (
                <div key={m.id || idx} style={styles.card}>
                  <img src={m.capa} alt="" style={styles.cardImage} crossOrigin="anonymous" />
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
                    {!estaNoCache(m.id) && !baixando[m.id] && (
                      <button style={styles.iconBtn} onClick={() => baixarMusicaOffline(m)}>
                        <Download size={16} color="white" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {nextPageToken && (
              <button 
                style={styles.loadMoreBtn} 
                onClick={() => buscarYoutube(true)} 
                disabled={buscando}
              >
                {buscando ? "🔄 Carregando..." : "📥 Carregar mais resultados"}
              </button>
            )}
            
            {!nextPageToken && resultadosYoutube.length > 0 && (
              <p style={{ textAlign: "center", color: "#b3b3b3", marginTop: 20 }}>
                📋 Fim dos resultados
              </p>
            )}
          </>
        )}
      </div>

      {/* Player */}
      {musicaTocando && (
        <div style={{ ...styles.player, left: isMobile ? 0 : 260 }}>
          <div style={styles.playerLeft}>
            {musicaTocando.fonte === "youtube" && musicaTocando.capa ? (
              <img src={musicaTocando.capa} alt="" style={styles.playerImage} crossOrigin="anonymous" />
            ) : (
              <div style={styles.playerIcon}>🎵</div>
            )}
            <div style={styles.playerInfo}>
              <p style={styles.playerTitle}>{musicaTocando.titulo}</p>
              <p style={styles.playerArtist}>{musicaTocando.artista || "Desconhecido"}</p>
              {estaNoCache(musicaTocando.id) && <span style={{ fontSize: 9, color: "#1DB954", marginLeft: 6 }}>📀 Offline</span>}
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
            
            {musicaTocando.fonte !== "youtube" && duracao > 0 && (
              <div style={styles.progressArea}>
                <span style={styles.time}>{formatarTempo(tempoAtual)}</span>
                <input
                  type="range"
                  min="0"
                  max={duracao || 100}
                  value={tempoAtual || 0}
                  onChange={handleProgressChange}
                  style={styles.progress}
                />
                <span style={styles.time}>{formatarTempo(duracao)}</span>
              </div>
            )}
          </div>

          <div style={styles.playerRight}>
            <button style={styles.playerIconBtn} onClick={() => setVolume(volume === 0 ? 70 : 0)}>
              {volume === 0 ? <VolumeX size={18} color="white" /> : <Volume2 size={18} color="white" />}
            </button>
            {!isMobile && (
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={styles.volumeSlider}
              />
            )}
          </div>
        </div>
      )}

      {videoYoutube && (
        <div style={styles.youtubeHidden}>
          <YouTube
            key={videoYoutube}
            videoId={videoYoutube}
            opts={{ 
              width: "1", 
              height: "1", 
              playerVars: { 
                autoplay: 1, 
                controls: 0, 
                modestbranding: 1,
                playsinline: 1
              } 
            }}
            onReady={onYoutubeReady}
            onStateChange={onYoutubeStateChange}
          />
        </div>
      )}

      {/* Modals - mantidos iguais ao original */}
      {modalPlaylist && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: "white" }}>Nova playlist</h2>
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
            <p style={styles.modalText}>Música: <strong style={{ color: "#1DB954" }}>{selectedMusic?.titulo}</strong></p>
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
            <p style={styles.modalText}>Remover esta música da playlist?</p>
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
              <h2 style={{ color: "white" }}>Upload</h2>
              <button style={styles.modalClose} onClick={() => setModalUpload(false)}>
                <XCircle size={20} color="#b3b3b3" />
              </button>
            </div>
            <input type="file" accept=".mp3,.wav,.ogg" onChange={(e) => setArquivoUpload(e.target.files[0])} style={{ color: "white" }} />
            <input style={styles.modalInput} placeholder="Nome (opcional)" value={tituloUpload} onChange={(e) => setTituloUpload(e.target.value)} />
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
              <h2 style={{ color: "white" }}>Editar</h2>
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

// ============================================
// STYLES (mantidos iguais ao original)
// ============================================
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
  uploadBtnSmall: {
    background: "#1DB954",
    border: "none",
    color: "black",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    marginTop: 16
  },
  userInfo: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #282828",
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  userTextInfo: {
    flex: 1,
    overflow: "hidden"
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
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  userEmail: {
    fontSize: 10,
    color: "#b3b3b3",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  logoutBtn: {
    background: "transparent",
    border: "none",
    color: "#b3b3b3",
    cursor: "pointer",
    padding: 4
  },
  content: {
    flex: 1,
    padding: "20px 24px",
    overflowY: "auto",
    minHeight: "100vh"
  },
  topbar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 24
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#242424",
    padding: "8px 16px",
    borderRadius: 500,
    width: "100%",
    maxWidth: 400
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
    fontSize: 28,
    fontWeight: 700,
    color: "white",
    marginBottom: 20
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12
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
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12
  },
  gridHighlight: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
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
    position: "relative"
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
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  cardArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    margin: "4px 0 0 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  cardActions: {
    display: "flex",
    gap: 6
  },
  iconBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    padding: 6,
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
    padding: 6,
    borderRadius: 50,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  iconBtnSmall: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    padding: 5,
    borderRadius: 50,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  iconBtnDangerSmall: {
    background: "rgba(255,68,68,0.2)",
    border: "none",
    padding: 5,
    borderRadius: 50,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  artistsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 16
  },
  artistCard: {
    background: "#181818",
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
    transition: "all 0.2s",
    cursor: "pointer",
    position: "relative"
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
    margin: "0 0 8px 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
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
    marginTop: 16,
    overflow: "hidden"
  },
  playlistHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    background: "#242424",
    borderBottom: "1px solid #282828",
    flexWrap: "wrap",
    gap: 10
  },
  playlistTitle: {
    fontSize: 16,
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
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s",
    flexWrap: "wrap"
  },
  playlistSongIcon: {
    fontSize: 24,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1DB954",
    borderRadius: 6,
    color: "black"
  },
  playlistSongInfo: {
    flex: 1,
    minWidth: 120
  },
  playlistSongTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  playlistSongArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  playlistSongActions: {
    display: "flex",
    gap: 6
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
    padding: "40px 20px",
    fontSize: 14
  },
  emptyPlaylistMsg: {
    color: "#b3b3b3",
    textAlign: "center",
    padding: "20px",
    fontSize: 12
  },
  loadMoreBtn: {
    background: "transparent",
    border: "1px solid #1DB954",
    padding: "10px 20px",
    borderRadius: 500,
    color: "#1DB954",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 20,
    width: "100%",
    transition: "all 0.2s"
  },
  player: {
    position: "fixed",
    bottom: 0,
    background: "#181818",
    borderTop: "1px solid #282828",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
    height: 80,
    boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
    gap: 12,
    right: 0
  },
  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    flex: 1
  },
  playerImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: "cover"
  },
  playerIcon: {
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
  playerInfo: {
    minWidth: 0,
    flex: 1
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "white",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  playerArtist: {
    fontSize: 11,
    color: "#b3b3b3",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  playerCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flex: 2
  },
  playerControls: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  playerControlBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  playPauseBtn: {
    background: "white",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  progressArea: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 300
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
    minWidth: 35
  },
  playerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end"
  },
  playerIconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  volumeSlider: {
    width: 80,
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
    zIndex: 10000,
    padding: 16
  },
  modalBox: {
    background: "#181818",
    padding: 24,
    borderRadius: 12,
    width: 400,
    maxWidth: "100%"
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
  modalText: {
    color: "white",
    marginBottom: 16
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
  loginBg: {
    position: "relative",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    background: "#0a0a0a"
  },
  animatedBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden"
  },
  gradient1: {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: "radial-gradient(circle, rgba(29,185,84,0.3) 0%, rgba(0,0,0,0) 70%)",
    animation: "rotate 20s linear infinite"
  },
  gradient2: {
    position: "absolute",
    top: "-50%",
    right: "-50%",
    width: "200%",
    height: "200%",
    background: "radial-gradient(circle, rgba(29,185,84,0.2) 0%, rgba(0,0,0,0) 70%)",
    animation: "rotate 25s linear infinite reverse"
  },
  gradient3: {
    position: "absolute",
    bottom: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: "radial-gradient(circle, rgba(29,185,84,0.15) 0%, rgba(0,0,0,0) 70%)",
    animation: "rotate 30s linear infinite"
  },
  particles: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none"
  },
  particle: {
    position: "absolute",
    width: "2px",
    height: "2px",
    background: "#1DB954",
    borderRadius: "50%",
    opacity: 0,
    animation: "float 3s ease-in-out infinite"
  },
  loginCard: {
    position: "relative",
    zIndex: 10,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(20px)",
    padding: "40px",
    borderRadius: "24px",
    textAlign: "center",
    width: "420px",
    maxWidth: "90%",
    border: "1px solid rgba(29,185,84,0.2)",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    animation: "fadeInUp 0.8s ease-out"
  },
  logoWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "24px"
  },
  logoIcon: {
    fontSize: "48px",
    animation: "bounce 2s ease-in-out infinite"
  },
  logoText: {
    fontSize: "38px",
    fontWeight: "bold",
    background: "linear-gradient(135deg, #fff 0%, #1DB954 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: 0,
    letterSpacing: "-1px"
  },
  logoHighlight: {
    background: "linear-gradient(135deg, #1DB954 0%, #fff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text"
  },
  slogan: {
    fontSize: "18px",
    color: "#ccc",
    marginBottom: "28px",
    lineHeight: 1.4
  },
  sloganHighlight: {
    color: "#1DB954",
    fontWeight: "bold"
  },
  features: {
    textAlign: "left",
    marginBottom: "28px",
    padding: "16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px"
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 0",
    color: "#ddd",
    fontSize: "13px"
  },
  featureIcon: {
    fontSize: "20px"
  },
  btnPremium: {
    width: "100%",
    background: "linear-gradient(135deg, #1DB954 0%, #0d8c3f 100%)",
    border: "none",
    padding: "14px 24px",
    borderRadius: "50px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "20px",
    position: "relative",
    overflow: "hidden"
  },
  btnContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    position: "relative",
    zIndex: 2
  },
  googleIcon: {
    background: "white",
    color: "#1DB954",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold"
  },
  btnArrow: {
    transition: "transform 0.3s ease",
    display: "inline-block"
  },
  footerText: {
    fontSize: "12px",
    color: "#888",
    margin: 0
  }
};

// Animações CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.01); background: rgba(29,185,84,0.1); }
    100% { transform: scale(1); }
  }
  
  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes float {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0);
    }
    50% {
      opacity: 0.8;
      transform: translateY(-100px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-200px) scale(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }
  
  button:hover {
    transform: scale(1.02);
    transition: transform 0.2s;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  input[type="range"] {
    -webkit-appearance: none;
    background: #535353;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #1DB954;
    cursor: pointer;
  }
  
  @media (max-width: 768px) {
    .content {
      margin-left: 0 !important;
      padding: 70px 12px 100px !important;
    }
    
    .player {
      left: 0 !important;
      padding: 8px 12px !important;
      height: auto !important;
      min-height: 70px !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
    }
    
    .player-left {
      flex: 2 !important;
      min-width: 120px !important;
    }
    
    .player-center {
      flex: 3 !important;
      min-width: 150px !important;
    }
    
    .player-right {
      flex: 1 !important;
      min-width: 60px !important;
    }
    
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
      gap: 12px !important;
    }
    
    .artistsGrid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
    }
    
    .card {
      flex-direction: column !important;
      align-items: flex-start !important;
      padding: 12px !important;
    }
    
    .card-image, .card-icon {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1 !important;
      margin-bottom: 8px !important;
    }
    
    .card-info {
      width: 100% !important;
      margin-bottom: 8px !important;
    }
    
    .card-title, .card-artist {
      white-space: normal !important;
      word-break: break-word !important;
    }
    
    .card-actions {
      width: 100% !important;
      justify-content: space-around !important;
    }
    
    .playlist-song {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 8px !important;
    }
    
    .playlist-song-actions {
      width: 100% !important;
      justify-content: flex-end !important;
    }
    
    .toast {
      bottom: 80px !important;
      white-space: normal !important;
      text-align: center !important;
      max-width: 80% !important;
      font-size: 12px !important;
    }
    
    .modal-box {
      width: 90% !important;
      padding: 16px !important;
    }
    
    .player-title {
      font-size: 11px !important;
      max-width: 80px !important;
    }
    
    .progress-area {
      max-width: 100% !important;
    }
    
    .time {
      font-size: 10px !important;
      min-width: 30px !important;
    }
  }
  
  @media (max-width: 480px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
    }
    
    .player-controls {
      gap: 8px !important;
    }
    
    .play-pause-btn {
      width: 32px !important;
      height: 32px !important;
    }
    
    .play-pause-btn svg {
      width: 18px !important;
      height: 18px !important;
    }
    
    .player-control-btn svg {
      width: 16px !important;
      height: 16px !important;
    }
    
    .player-right {
      display: none !important;
    }
    
    .artist-image {
      width: 60px !important;
      height: 60px !important;
    }
    
    .artist-name {
      font-size: 11px !important;
    }
    
    .section-title {
      font-size: 16px !important;
    }
    
    .title {
      font-size: 20px !important;
    }
  }
`;
document.head.appendChild(styleSheet);