🎧 Moises Music

Aplicação web full stack inspirada no Spotify, com login pelo Google, playlists, favoritos, upload de áudio e busca de músicas no YouTube.

Projeto pessoal e educacional, criado por mim para praticar o desenvolvimento de uma aplicação completa, do front-end ao deploy.

🔗 Projeto online: https://moises-music.netlify.app/ 📦 Repositório: https://github.com/Moises-Warlen/Moises-s-Music

A primeira carga pode levar alguns segundos, porque a API pode estar em modo de espera na hospedagem.

📸 Telas
Login	Início
Tela de login	Tela inicial
✨ Funcionalidades
🔐 Autenticação
Login com Google OAuth 2.0
Sessão gerenciada com cookies e express-session
🏠 Página inicial
Seções Músicas em alta, Artistas em alta e Suas músicas
Botão Tocar todas para reproduzir a lista inteira
Busca de músicas no YouTube pela barra superior
Menu lateral: Home, Minhas músicas, Favoritos, Playlists, Top YouTube, Offline e Upload
🎶 Player de música
Play, pause, avançar e voltar
Barra de progresso interativa (arrastável)
Modo shuffle (aleatório) e modo repeat (repetir fila)
Reprodução de arquivos de áudio e de músicas do YouTube
❤️ Favoritos
Adicionar e remover músicas dos favoritos
Tela exclusiva de favoritos, atualizada ao entrar na página
📀 Playlists
Criar playlists personalizadas
Adicionar e remover músicas
Excluir playlists inteiras
Visualização exclusiva por playlist
📤 Upload de músicas
Envio de arquivos MP3, WAV e OGG
Armazenamento no Cloudinary
Organização por usuário autenticado
Editar, excluir e baixar as músicas enviadas
Modo Offline, com importação de arquivos MP3
🔍 Busca no YouTube
Busca de músicas pela YouTube Data API v3
Resultados com capa, título e artista
Reprodução direta no player integrado
🔥 Top 10 do YouTube
As 10 músicas mais populares do momento
Reprodução instantânea no player
🛠️ Tecnologias

Front-end

React.js com Vite
Lucide Icons
React YouTube
CSS inline (objetos de estilo)
Deploy no Netlify

Back-end

Node.js e Express.js
MongoDB com Mongoose
Passport.js (estratégia Google OAuth)
express-session e CORS
Multer (upload de arquivos)
Cloudinary (armazenamento de áudio)
YouTube Data API v3
Deploy no Render
🧠 Decisões técnicas
Google OAuth 2.0 com Passport.js: o usuário entra com a conta Google, sem criar senha, e o back-end controla a sessão por cookie.
Cloudinary para os áudios: os arquivos enviados ficam fora do servidor da aplicação e fora do banco de dados, que guarda apenas os dados da música e o endereço do arquivo.
YouTube Data API v3 e player incorporado: a busca usa a API oficial, e a reprodução usa o player do próprio YouTube, sem baixar nem copiar conteúdo.
MongoDB com Mongoose: usuários, playlists e favoritos têm estrutura flexível e se encaixam bem em documentos.
Front-end e back-end separados: o React (Vite) conversa com a API Express por requisições HTTP, o que permite publicar cada parte em um serviço diferente.
Variáveis de ambiente: chaves e senhas ficam no arquivo .env, que não é enviado ao GitHub.
📁 Estrutura do projeto
Moises-s-Music/
├── frontend/              # Aplicação React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── backend/               # API Node.js + Express
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   └── server.js
│
└── README.md
⚙️ Como rodar localmente
Pré-requisitos
Node.js 18 ou superior
Git
Conta no MongoDB Atlas
Conta no Cloudinary
Credenciais de Google OAuth (Google Cloud Console)
Chave da YouTube Data API v3
1. Clonar o repositório
bash
git clone https://github.com/Moises-Warlen/Moises-s-Music.git
cd Moises-s-Music
2. Configurar e iniciar o back-end
bash
cd backend
npm install

Crie um arquivo .env dentro da pasta backend com as variáveis abaixo:

env
PORT=5000
MONGO_URI=sua_string_de_conexao_do_mongodb
SESSION_SECRET=um_segredo_longo_e_aleatorio

GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

YOUTUBE_API_KEY=sua_chave_da_youtube_api

FRONTEND_URL=http://localhost:5173

Inicie a API:

bash
npm run dev
3. Configurar e iniciar o front-end

Em outro terminal:

bash
cd frontend
npm install

Crie um arquivo .env dentro da pasta frontend:

env
VITE_API_URL=http://localhost:5000

Inicie a aplicação:

bash
npm run dev

Acesse http://localhost:5173 no navegador.

🔒 Segurança
Nunca envie o arquivo .env para o GitHub (ele está no .gitignore).
Se alguma chave for exposta por engano, gere uma nova no painel do serviço correspondente.
⚖️ Aviso sobre direitos autorais

Este é um projeto educacional, sem fins comerciais. O upload deve ser feito apenas com arquivos de áudio próprios ou com permissão de uso. As músicas do YouTube são reproduzidas pelo player oficial, sem download ou cópia do conteúdo. O projeto não tem relação com o Spotify.

🚧 Próximos passos
Testes automatizados no back-end e no front-end
Pipeline de integração contínua (GitHub Actions)
Estilização com CSS Modules ou Tailwind, no lugar do CSS inline
Fila de reprodução editável
👤 Autor

Desenvolvido por Moisés Warlen Dos Reis.

LinkedIn: https://www.linkedin.com/in/moiseswalen
GitHub: https://github.com/Moises-Warlen
