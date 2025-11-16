# 📰 O Buxixo Gospel

Portal de notícias gospel completo com sistema de gerenciamento de conteúdo (CMS) e assistente de IA para criação automática de matérias a partir de links do Instagram.

## 🚀 Tecnologias

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Banco de Dados**: MySQL + Sequelize ORM
- **Template Engine**: EJS
- **Editor**: Quill.js (WYSIWYG)
- **IA**: Together AI (Meta-Llama-3.1-70B)
- **Autenticação**: Express Session + BCrypt
- **Upload**: Multer
- **Arquitetura**: MVC

## ✨ Funcionalidades Principais

### 🎯 Portal Público
- ✅ Home page com notícias em destaque
- ✅ Grid de notícias por categoria
- ✅ Página de artigo completo com SEO otimizado
- ✅ Sistema de busca
- ✅ Layout responsivo
- ✅ Categorias gospel (Notícias, Música, Ministério, Eventos, etc)

### 🔐 Painel Administrativo
- ✅ Sistema de autenticação seguro
- ✅ CRUD completo de matérias
- ✅ Editor WYSIWYG avançado (Quill.js)
- ✅ Upload de imagens e mídias
- ✅ Gerenciamento de categorias
- ✅ Sistema de rascunhos
- ✅ Agendamento de publicações

### 🤖 Assistente de IA
- ✅ Criação automática de matérias por tema
- ✅ Extração de conteúdo de links do Instagram (6 métodos diferentes)
- ✅ Busca automática de imagens no Bing
- ✅ Extração inteligente de palavras-chave
- ✅ Modo automático (gera e publica direto)
- ✅ Sugestão de imagens relevantes
- ✅ Configuração de API no painel

## 📋 Pré-requisitos

- Node.js (v14 ou superior)
- MySQL (v5.7 ou superior)
- NPM ou Yarn
- WAMP/XAMPP ou MySQL standalone

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/erickafram/obuxixogospel.git
cd obuxixogospel
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados MySQL

Crie o banco de dados:
```sql
CREATE DATABASE obuxixo_gospel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Configure as credenciais em `config/config.json`:
```json
{
  "development": {
    "username": "root",
    "password": "sua_senha",
    "database": "obuxixo_gospel",
    "host": "127.0.0.1",
    "port": 3306,
    "dialect": "mysql"
  }
}
```

### 4. Execute as migrations
```bash
npx sequelize-cli db:migrate
```

### 5. Popule o banco com dados iniciais
```bash
npx sequelize-cli db:seed:all
```

Isso criará:
- ✅ Usuário admin (email: `admin@obuxixogospel.com`, senha: `admin123`)
- ✅ 8 categorias gospel
- ✅ Configurações do sistema
- ✅ Matérias de exemplo

### 6. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 7. Inicie o servidor
```bash
npm start
```

Ou em modo desenvolvimento:
```bash
npm run dev
```

### 8. Acesse o sistema

- **Portal**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

**Credenciais padrão:**
- Email: `admin@obuxixogospel.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro login!

## 📁 Estrutura do Projeto

```
obuxixogospel/
├── config/              # Configurações do Sequelize e banco
├── controllers/         # Lógica de negócio
├── middleware/          # Middlewares de autenticação
├── migrations/          # Migrations do Sequelize
├── models/              # Modelos do banco (Article, User, etc)
├── public/              # Arquivos estáticos
│   ├── css/            # Estilos
│   ├── js/             # Scripts
│   ├── images/         # Imagens
│   └── uploads/        # Uploads de usuários
├── routes/              # Rotas da aplicação
├── seeders/             # Seeds do banco
├── services/            # Serviços (AIService)
├── views/               # Templates EJS
│   ├── dashboard/      # Painel administrativo
│   └── partials/       # Componentes reutilizáveis
└── app.js               # Arquivo principal
```

## 🎯 Categorias Gospel

- **Notícias** 📰 - Azul (#3B82F6)
- **Música** 🎵 - Roxo (#8B5CF6)
- **Ministério** ⛪ - Verde (#10B981)
- **Eventos** 📅 - Laranja (#F59E0B)
- **Testemunhos** ❤️ - Vermelho (#EF4444)
- **Estudo Bíblico** 📖 - Índigo (#6366F1)
- **Família** 👨‍👩‍👧‍👦 - Rosa (#EC4899)
- **Jovens** ⭐ - Teal (#14B8A6)

## 🤖 Configurar Assistente de IA

1. Acesse o painel: `/dashboard/ia/config`
2. Obtenha uma API Key da Together AI: https://api.together.xyz
3. Configure:
   - **API Key**: Sua chave da Together AI
   - **API URL**: `https://api.together.xyz/v1/chat/completions`
   - **Modelo**: `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`
4. Ative o assistente

### Criar Matéria com IA

**Por Tema:**
1. Acesse `/dashboard/posts/new`
2. Clique na aba "Por Tema"
3. Digite o tema (ex: "Louvor na igreja")
4. Escolha categoria e palavras-chave
5. Marque "Modo Automático" para publicar direto
6. Clique em "Gerar Matéria"

**Por Link do Instagram:**
1. Acesse `/dashboard/posts/new`
2. Clique na aba "Por Link"
3. Cole o link do Instagram
4. (Opcional) Cole o texto manualmente se a extração falhar
5. Escolha categoria
6. Marque "Modo Automático" para publicar direto
7. Clique em "Gerar Matéria"

O sistema tentará 6 métodos diferentes para extrair o conteúdo do Instagram!

## 📡 API Endpoints

### Artigos
- `GET /api/articles` - Listar artigos
- `GET /api/articles/:id` - Obter artigo específico
- `POST /api/articles` - Criar artigo
- `PUT /api/articles/:id` - Atualizar artigo
- `DELETE /api/articles/:id` - Deletar artigo

### IA
- `POST /api/ia/criar-materia` - Criar matéria por tema ou link
- `POST /api/ia/criar-por-texto` - Criar matéria por texto colado
- `GET /api/ia/config` - Obter configurações da IA
- `POST /api/ia/config` - Atualizar configurações da IA

### Categorias
- `GET /api/categorias` - Listar categorias

## 🔒 Segurança

- ✅ Senhas criptografadas com BCrypt
- ✅ Sessões seguras com express-session
- ✅ Proteção contra SQL Injection (Sequelize ORM)
- ✅ Upload de arquivos com validação
- ✅ Middleware de autenticação

## 🚀 Deploy

### Heroku
```bash
heroku create obuxixogospel
heroku addons:create cleardb:ignite
heroku config:set SESSION_SECRET=seu_secret_aqui
git push heroku main
heroku run npx sequelize-cli db:migrate
heroku run npx sequelize-cli db:seed:all
```

### Vercel/Netlify
Configure as variáveis de ambiente e use MySQL externo (PlanetScale, Railway, etc)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes

## 👨‍💻 Autor

**Erick Afram**
- GitHub: [@erickafram](https://github.com/erickafram)
- Site: [O Buxixo Gospel](https://obuxixogospel.com)

---

⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!
