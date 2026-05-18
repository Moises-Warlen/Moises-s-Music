# 🎧 Moises Music

**Moises Music** é uma aplicação web full stack inspirada no Spotify, desenvolvida para oferecer uma experiência moderna e interativa de streaming musical. O projeto permite login social, gerenciamento de playlists, músicas favoritas, upload de arquivos de áudio pessoais e integração com o YouTube para busca e reprodução de músicas.

🔗 **Acesse o projeto online:** [Adicione o link aqui]  
📦 **Repositório:** [Adicione o link do GitHub aqui]

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Login com **Google OAuth 2.0**
- Gerenciamento de sessão com **cookies** e `express-session`

### 🎶 Player de Música (estilo Spotify)
- Controles: Play / Pause, Avançar, Voltar
- Barra de progresso interativa (arrastável)
- Modo **Shuffle** (aleatório)
- Modo **Repeat** (repetir fila)
- Suporte a MP3 e músicas do YouTube

### ❤️ Favoritos
- Adicionar e remover músicas dos favoritos
- Tela exclusiva para visualização de favoritos
- Atualização automática ao entrar na página

### 📀 Playlists
- Criar playlists personalizadas
- Adicionar músicas a playlists existentes
- Remover músicas de playlists
- Excluir playlists inteiras
- Visualização exclusiva por playlists

### 📤 Upload de Músicas
- Upload de arquivos nos formatos **MP3**, **WAV** e **OGG**
- Armazenamento seguro no **Cloudinary**
- Organização por usuário autenticado

### 🔍 Pesquisa no YouTube
- Busca de músicas via **YouTube Data API v3**
- Exibição de resultados com capa, título e artista
- Execução direta no player integrado

### 🔥 Top 10 do YouTube
- Exibe as 10 músicas mais populares do momento
- Player integrado para reprodução instantânea

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React.js** + **Vite**
- **Lucide Icons**
- **React YouTube**
- Estilização com **CSS inline (Styled Object)**
- **Netlify** (deploy)

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **Passport.js** (estratégia Google OAuth)
- **Express-session** + **CORS**
- **Cloudinary** (armazenamento de áudios)
- **Multer** (upload de arquivos)
- **YouTube Data API v3**
- **Render** (deploy)

---

## 📁 Estrutura do Projeto

Moises-Music/
│
├── frontend/ # Aplicação React + Vite
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── services/
│ │ └── App.jsx
│ └── package.json
│
├── backend/ # API Node.js + Express
│ ├── models/
│ ├── routes/
│ ├── controllers/
│ ├── middleware/
│ ├── config/
│ └── server.js
│
└── README.md





---

## ⚙️ Como Rodar Localmente

### ✅ Pré-requisitos

Antes de iniciar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Conta no [Cloudinary](https://cloudinary.com/)
- Credenciais de **Google OAuth**
- Chave da **YouTube Data API v3**

---

### 🔧 Configuração do Backend

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/Moises-Music.git
cd Moises-Music/backend

npm install

PORT=5000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

YOUTUBE_API_KEY=your_youtube_api_key

FRONTEND_URL=http://localhost:5173


npm run dev



cd ../frontend
npm install
VITE_API_URL=http://localhost:5000
npm run dev



Desenvolvido por Moises


