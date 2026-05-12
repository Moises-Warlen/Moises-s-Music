const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const multer = require('multer');

const app = express();

// ============================================
// CONFIGURAÇÕES CORS - CORRIGIDA
// ============================================

app.use(cors({
    origin: ['http://localhost:5173', 'https://moises-music.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// SESSÃO - CORRIGIDA PARA O RENDER
// ============================================

app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-secreta-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    proxy: true,  // ESSENCIAL para o Render
    cookie: { 
        secure: true,  // SEMPRE true (Render usa HTTPS)
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'none',  // Frontend e backend em domínios diferentes
        domain: '.onrender.com'  // Compartilha cookie no Render
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ============================================
// GOOGLE OAUTH
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3333/auth/google/callback';

if (process.env.NODE_ENV === 'production' && (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)) {
    console.error('❌ ERRO: Variáveis GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórias!');
}

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
    done(null, {
        id: profile.id,
        email: profile.emails[0].value,
        nome: profile.displayName,
        foto: profile.photos[0].value
    });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: FRONTEND_URL }),
    (req, res) => {
        res.redirect(FRONTEND_URL);
    }
);

app.get('/api/me', (req, res) => {
    console.log('Usuário logado:', req.user?.email || 'nenhum');
    res.json({ user: req.user || null });
});

app.get('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

// ============================================
// MÚSICAS
// ============================================

const MUSICAS_DIR = path.join(__dirname, 'musicas');
if (!fs.existsSync(MUSICAS_DIR)) fs.mkdirSync(MUSICAS_DIR);
app.use('/musicas', express.static(MUSICAS_DIR));

const BASE_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3333}`;

app.get('/api/musicas', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const arquivos = fs.readdirSync(MUSICAS_DIR);
        const musicas = arquivos
            .filter(arq => arq.endsWith('.mp3'))
            .map((arquivo, index) => ({
                id: `local_${index}`,
                titulo: arquivo.replace('.mp3', '').replace(/[_-]/g, ' '),
                artista: 'Minha Música',
                url: `${BASE_URL}/musicas/${encodeURIComponent(arquivo)}`,
                capa: 'https://via.placeholder.com/200/1DB954/FFFFFF?text=Music',
                fonte: 'local'
            }));
        res.json({ dados: musicas });
    } catch (error) {
        console.error('Erro ao listar músicas:', error);
        res.json({ dados: [] });
    }
});

// Upload de MP3
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MUSICAS_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

app.post('/api/upload', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    upload.single('musica')(req, res, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, arquivo: req.file?.originalname });
    });
});

// ============================================
// DADOS DO USUÁRIO
// ============================================

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function getDataPath(email, type) {
    const safeEmail = email.replace(/[@.]/g, '_');
    return path.join(DATA_DIR, `${safeEmail}_${type}.json`);
}

// PLAYLISTS
app.get('/api/playlists', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'playlists'), 'utf8'));
        res.json(data);
    } catch { res.json({}); }
});

app.post('/api/playlists/:nome', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = {};
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'playlists'), 'utf8')); } catch {}
    if (!data[req.params.nome]) data[req.params.nome] = [];
    fs.writeFileSync(getDataPath(req.user.email, 'playlists'), JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.post('/api/playlists/:nome/:musicaId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = {};
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'playlists'), 'utf8')); } catch {}
    if (!data[req.params.nome]) data[req.params.nome] = [];
    if (!data[req.params.nome].includes(req.params.musicaId)) data[req.params.nome].push(req.params.musicaId);
    fs.writeFileSync(getDataPath(req.user.email, 'playlists'), JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.delete('/api/playlists/:nome/:musicaId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = {};
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'playlists'), 'utf8')); } catch {}
    if (data[req.params.nome]) {
        data[req.params.nome] = data[req.params.nome].filter(id => id !== req.params.musicaId);
        fs.writeFileSync(getDataPath(req.user.email, 'playlists'), JSON.stringify(data, null, 2));
    }
    res.json({ success: true });
});

app.delete('/api/playlists/:nome', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = {};
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'playlists'), 'utf8')); } catch {}
    delete data[req.params.nome];
    fs.writeFileSync(getDataPath(req.user.email, 'playlists'), JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// FAVORITOS
app.get('/api/favoritos', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'favoritos'), 'utf8'));
        res.json(data);
    } catch { res.json([]); }
});

app.post('/api/favoritos/:musicaId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = [];
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'favoritos'), 'utf8')); } catch {}
    if (!data.includes(req.params.musicaId)) data.push(req.params.musicaId);
    fs.writeFileSync(getDataPath(req.user.email, 'favoritos'), JSON.stringify(data, null, 2));
    res.json({ favoritos: data });
});

app.delete('/api/favoritos/:musicaId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let data = [];
    try { data = JSON.parse(fs.readFileSync(getDataPath(req.user.email, 'favoritos'), 'utf8')); } catch {}
    data = data.filter(id => id !== req.params.musicaId);
    fs.writeFileSync(getDataPath(req.user.email, 'favoritos'), JSON.stringify(data, null, 2));
    res.json({ favoritos: data });
});

// YOUTUBE SEARCH
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.get('/api/buscar-youtube', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json({ dados: [] });
    
    if (!YOUTUBE_API_KEY) {
        console.error('❌ YOUTUBE_API_KEY não configurada');
        return res.json({ dados: [] });
    }
    
    try {
        const resposta = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query + ' music')}&key=${YOUTUBE_API_KEY}`);
        const dados = await resposta.json();
        if (dados.error) {
            console.error('Erro YouTube API:', dados.error);
            return res.json({ dados: [] });
        }
        const musicas = dados.items.map(item => ({
            id: `yt_${item.id.videoId}`,
            titulo: item.snippet.title,
            artista: item.snippet.channelTitle,
            videoId: item.id.videoId,
            capa: item.snippet.thumbnails.medium.url,
            fonte: 'youtube'
        }));
        res.json({ dados: musicas });
    } catch (error) {
        console.error('Erro na busca do YouTube:', error);
        res.json({ dados: [] });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend: ${FRONTEND_URL}`);
    console.log(`📁 Diretório de músicas: ${MUSICAS_DIR}`);
});