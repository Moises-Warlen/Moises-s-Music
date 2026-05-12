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
// CORS CORRETO PARA PRODUÇÃO
// ============================================
app.use(cors({
    origin: ['http://localhost:5173', 'https://moises-music.netlify.app'],
    credentials: true
}));

app.use(express.json());

// ============================================
// SESSÃO CORRETA PARA PRODUÇÃO
// ============================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-secreta-do-meu-spotify',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'none'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ============================================
// GOOGLE OAUTH
// ============================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3333/auth/google/callback'
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
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: 'https://moises-music.netlify.app' }),
    (req, res) => {
        res.redirect('https://moises-music.netlify.app');
    }
);

app.get('/api/me', (req, res) => {
    res.json({ user: req.user || null });
});

app.get('/api/logout', (req, res) => {
    req.logout(() => res.json({ ok: true }));
});

// ============================================
// MÚSICAS
// ============================================
const MUSICAS_DIR = path.join(__dirname, 'musicas');
if (!fs.existsSync(MUSICAS_DIR)) fs.mkdirSync(MUSICAS_DIR);
app.use('/musicas', express.static(MUSICAS_DIR));

app.get('/api/musicas', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const arquivos = fs.readdirSync(MUSICAS_DIR);
        const musicas = arquivos
            .filter(arq => arq.endsWith('.mp3'))
            .map((arquivo, index) => ({
                id: `local_${index}`,
                titulo: arquivo.replace('.mp3', ''),
                artista: 'Minha Música',
                url: `${process.env.API_URL || 'http://localhost:3333'}/musicas/${encodeURIComponent(arquivo)}`,
                capa: 'https://via.placeholder.com/200/1DB954/FFFFFF?text=Music',
                fonte: 'local'
            }));
        res.json({ dados: musicas });
    } catch (error) {
        res.json({ dados: [] });
    }
});

// Upload
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
// DADOS
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function getDataPath(email, type) {
    const safeEmail = email.replace(/[@.]/g, '_');
    return path.join(DATA_DIR, `${safeEmail}_${type}.json`);
}

// Playlists
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

// Favoritos
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

// YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyA5pFjzUPbQRYxv85XdHewHXJEYHpRH66w';

app.get('/api/buscar-youtube', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json({ dados: [] });
    try {
        const resposta = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query + ' music')}&key=${YOUTUBE_API_KEY}`);
        const dados = await resposta.json();
        if (dados.error) return res.json({ dados: [] });
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
        res.json({ dados: [] });
    }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});