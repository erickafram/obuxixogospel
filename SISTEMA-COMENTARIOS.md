# 📝 Sistema de Gerenciamento de Comentários

## 🎯 Visão Geral

Sistema completo de moderação de comentários no dashboard do Obuxixo Gospel, permitindo aprovar, rejeitar e gerenciar todos os comentários do site.

---

## ✨ Funcionalidades

### **Dashboard de Comentários** (`/dashboard/comentarios`)

#### **📊 Estatísticas em Tempo Real**
- **Total de Comentários:** Contador geral
- **Pendentes:** Comentários aguardando aprovação
- **Aprovados:** Comentários já publicados

#### **🔍 Filtros e Busca**
- **Busca em tempo real:** Por nome, email ou conteúdo do comentário
- **Filtro por status:**
  - Todos
  - ⏳ Pendentes (padrão)
  - ✅ Aprovados

#### **💬 Visualização de Comentários**
Cada comentário exibe:
- **Avatar** com inicial do nome
- **Nome e email** do autor
- **Data e hora** do comentário
- **IP do usuário** (para moderação)
- **Post relacionado** com link direto
- **Status** (Pendente ou Aprovado)
- **Conteúdo** do comentário

#### **⚡ Ações Disponíveis**
- **✅ Aprovar:** Publica o comentário no site
- **🗑️ Rejeitar/Deletar:** Remove o comentário permanentemente
- **👁️ Ver Post:** Abre o artigo relacionado em nova aba

---

## 🗂️ Estrutura de Arquivos

```
views/dashboard/comentarios/
└── index.ejs                    # Página principal de gerenciamento

controllers/
└── commentController.js         # Lógica de negócio dos comentários

models/
└── Comment.js                   # Modelo do banco de dados

app.js                           # Rotas do dashboard
```

---

## 🔌 Rotas da API

### **Dashboard (Autenticado)**
```javascript
GET  /dashboard/comentarios              // Página de gerenciamento
GET  /dashboard/comentarios/api/all      // Listar todos os comentários
POST /dashboard/comentarios/api/:id/approve  // Aprovar comentário
DELETE /dashboard/comentarios/api/:id    // Deletar comentário
```

### **API Pública**
```javascript
GET  /api/comments/:articleId            // Listar comentários aprovados de um artigo
POST /api/comments/:articleId            // Criar novo comentário (público)
```

---

## 📦 Modelo de Dados

### **Tabela: `comments`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | ID único (auto-increment) |
| `article_id` | INTEGER | ID do artigo relacionado |
| `nome` | STRING(100) | Nome do autor |
| `email` | STRING(150) | Email do autor |
| `comentario` | TEXT | Conteúdo do comentário |
| `aprovado` | BOOLEAN | Status de aprovação (padrão: false) |
| `ip_address` | STRING(45) | IP do usuário |
| `user_agent` | STRING(255) | Navegador/dispositivo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

---

## 🎨 Interface do Usuário

### **Cards de Estatísticas**
```
┌─────────────────────────────────────────────────┐
│  Total: 45    │  Pendentes: 12  │  Aprovados: 33 │
└─────────────────────────────────────────────────┘
```

### **Filtros**
```
┌─────────────────────────────────────────────────┐
│ 🔍 [Buscar...]  [Status ▼]  [🔄 Atualizar]     │
└─────────────────────────────────────────────────┘
```

### **Lista de Comentários**
```
┌─────────────────────────────────────────────────┐
│ [J] João Silva                    ⏳ Pendente   │
│     joao@email.com • 22 nov, 11:30 • 192.168... │
│                                                  │
│     📰 Post: Pastor realiza culto em igreja...  │
│                                                  │
│     ┌─────────────────────────────────────────┐ │
│     │ Que benção! Deus é maravilhoso...       │ │
│     └─────────────────────────────────────────┘ │
│                                                  │
│     [✅ Aprovar] [🗑️ Rejeitar] [👁️ Ver Post]    │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Como Usar

### **1. Acessar o Dashboard**
```
https://www.obuxixogospel.com.br/dashboard/comentarios
```

### **2. Aprovar Comentário**
1. Visualize os comentários pendentes
2. Leia o conteúdo
3. Clique em **"✅ Aprovar"**
4. Confirme a ação
5. ✅ Comentário publicado!

### **3. Rejeitar/Deletar Comentário**
1. Localize o comentário indesejado
2. Clique em **"🗑️ Rejeitar"** ou **"🗑️ Deletar"**
3. Confirme a exclusão
4. ⚠️ Ação irreversível!

### **4. Buscar Comentários**
- Digite no campo de busca
- Resultados filtrados em tempo real
- Busca por: nome, email, conteúdo ou título do post

### **5. Filtrar por Status**
- **Todos:** Exibe todos os comentários
- **Pendentes:** Apenas aguardando aprovação
- **Aprovados:** Apenas publicados

---

## 🔒 Segurança

### **Validações no Backend**
- ✅ Nome mínimo: 2 caracteres
- ✅ Email válido (regex)
- ✅ Comentário mínimo: 10 caracteres
- ✅ Captcha simples: "obuxixo"
- ✅ Verificação de artigo existente
- ✅ Captura de IP e User-Agent

### **Proteção de Rotas**
- 🔐 Todas as rotas do dashboard requerem autenticação
- 🔐 Middleware `isAuthenticated` aplicado
- 🔐 Apenas admins podem aprovar/deletar

---

## 📊 Fluxo de Comentário

```
1. Usuário preenche formulário no post
   ↓
2. Validações (nome, email, comentário, captcha)
   ↓
3. Comentário salvo com aprovado=false
   ↓
4. Admin recebe notificação (pendente)
   ↓
5. Admin acessa /dashboard/comentarios
   ↓
6. Admin aprova ou rejeita
   ↓
7. Se aprovado: comentário aparece no post
   Se rejeitado: comentário deletado
```

---

## 🎯 Melhorias Futuras

### **Curto Prazo**
- [ ] Notificações push para novos comentários
- [ ] Responder comentários direto do dashboard
- [ ] Editar comentários aprovados
- [ ] Marcar como spam

### **Médio Prazo**
- [ ] Integração com reCAPTCHA v3
- [ ] Sistema de reputação de usuários
- [ ] Blacklist de IPs/emails
- [ ] Moderação automática com IA

### **Longo Prazo**
- [ ] Sistema de threads (respostas aninhadas)
- [ ] Reações aos comentários (like/dislike)
- [ ] Notificações por email para autores
- [ ] Análise de sentimento dos comentários

---

## 🐛 Troubleshooting

### **Comentários não aparecem**
```bash
# Verificar se o comentário foi aprovado
SELECT * FROM comments WHERE aprovado = true;

# Verificar associação com artigo
SELECT c.*, a.titulo 
FROM comments c 
LEFT JOIN articles a ON c.article_id = a.id;
```

### **Erro ao aprovar**
- Verificar se o usuário está autenticado
- Verificar permissões do usuário
- Checar logs do servidor: `pm2 logs obuxixogospel`

### **Busca não funciona**
- Limpar cache do navegador
- Verificar console do navegador (F12)
- Recarregar a página

---

## 📝 Exemplo de Uso da API

### **Listar comentários aprovados de um post**
```javascript
fetch('/api/comments/123')
  .then(res => res.json())
  .then(data => {
    console.log(data.comments);
  });
```

### **Criar novo comentário**
```javascript
fetch('/api/comments/123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nome: 'João Silva',
    email: 'joao@email.com',
    comentario: 'Ótimo conteúdo!',
    captcha: 'obuxixo'
  })
})
.then(res => res.json())
.then(data => {
  console.log(data.message); // "Comentário enviado! Aguardando aprovação."
});
```

### **Aprovar comentário (admin)**
```javascript
fetch('/dashboard/comentarios/api/123/approve', {
  method: 'POST'
})
.then(res => res.json())
.then(data => {
  console.log(data.message); // "Comentário aprovado com sucesso"
});
```

---

## 🎨 Personalização

### **Cores do Status**
```css
.status-pending {
  background: #fff3cd;  /* Amarelo claro */
  color: #856404;       /* Marrom escuro */
}

.status-approved {
  background: #d4edda;  /* Verde claro */
  color: #155724;       /* Verde escuro */
}
```

### **Botões de Ação**
```css
.btn-approve {
  background: #48bb78;  /* Verde */
}

.btn-reject {
  background: #f56565;  /* Vermelho */
}

.btn-view {
  background: #4299e1;  /* Azul */
}
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar este documento
2. Checar logs do servidor
3. Revisar código em `controllers/commentController.js`
4. Testar rotas com Postman/Insomnia

---

**Desenvolvido para Obuxixo Gospel** 🙏
**Versão:** 1.0.0
**Data:** Novembro 2025
