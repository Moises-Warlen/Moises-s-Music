require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const connectDB = require("./src/config/database");
const User = require("./src/models/User");

const musicRoutes = require("./src/routes/musicRoutes");
const trendingRoutes = require("./src/routes/trendingRoutes");

const app = express();

// ============================================
// URLS (AUTO DETECT)
// ============================================
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://moises-music.netlify.app"
    : "http://localhost:5173");

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://moises-s-music.onrender.com"
    : `http://localhost:${process.env.PORT || 3333}`);

// ============================================
// TRUST PROXY
// ============================================
app.set("trust proxy", 1);

// ============================================
// CORS
// ============================================
app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://moises-music.netlify.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// SESSION
// ============================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ============================================
// GOOGLE STRATEGY
// ============================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            nome: profile.displayName,
            foto: profile.photos?.[0]?.value
          });
        }

        done(null, {
          id: user._id,
          email: user.email,
          nome: user.nome,
          foto: user.foto
        });
      } catch (err) {
        console.error("Erro no Google Strategy:", err);
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ============================================
// AUTH ROUTES
// ============================================
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: FRONTEND_URL }),
  (req, res) => {
    res.redirect(FRONTEND_URL);
  }
);

app.get("/api/me", (req, res) => {
  res.json({ user: req.user || null });
});

app.get("/api/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
      });
      res.json({ success: true, message: "Logout realizado com sucesso" });
    });
  });
});

// ============================================
// API ROUTES
// ============================================
app.use("/api", musicRoutes);
app.use("/api", trendingRoutes);

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error("Erro global:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// ============================================
// START SERVER
// ============================================
connectDB();

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Moises Music Backend rodando na porta ${PORT}`);
  console.log(`📱 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔑 YouTube API Key: ${process.env.YOUTUBE_API_KEY ? "✅ Configurada" : "❌ FALTANDO"}`);
});