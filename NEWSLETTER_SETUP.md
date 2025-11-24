# 📧 Sistema de Newsletter - Guia de Configuração

## 🎯 Visão Geral

Sistema completo de newsletter com:
- ✅ Cadastro de emails no footer
- ✅ Confirmação por email (double opt-in)
- ✅ Envio automático de novos posts
- ✅ Painel admin para gerenciar subscribers
- ✅ Templates de email profissionais
- ✅ Sistema de unsubscribe

---

## 📋 Pré-requisitos

1. **Node.js** instalado
2. **MySQL** configurado
3. **Conta de email** para envio (Gmail, SMTP do servidor, etc.)

---

## 🚀 Passo a Passo de Instalação

### 1. Instalar Dependência

```bash
npm install nodemailer
```

### 2. Configurar Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```env
# Configurações de Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=Obuxixo Gospel <noreply@obuxixogospel.com.br>

# URL Base do Site
BASE_URL=https://www.obuxixogospel.com.br
```

### 3. Executar Migration

```bash
# No diretório do projeto
node migrations/20241123-create-newsletter-subscribers.js
```

Ou execute manualmente no MySQL:

```sql
CREATE TABLE newsletter_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255),
  ativo BOOLEAN DEFAULT TRUE,
  token_confirmacao VARCHAR(255),
  confirmado BOOLEAN DEFAULT FALSE,
  data_confirmacao DATETIME,
  token_unsubscribe VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON newsletter_subscribers(email);
CREATE INDEX idx_ativo ON newsletter_subscribers(ativo);
CREATE INDEX idx_confirmado ON newsletter_subscribers(confirmado);
```

---

## 🔐 Configuração de Email

### Opção 1: Gmail (Grátis - Recomendado para Testes)

1. Acesse: https://myaccount.google.com/apppasswords
2. Crie uma "Senha de App"
3. Use essa senha no `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-aqui
```

**Limite:** ~500 emails/dia

### Opção 2: SMTP do Servidor (DigitalOcean/CloudPanel)

Se você tem CloudPanel instalado:

```env
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=noreply@obuxixogospel.com.br
SMTP_PASS=senha-do-email
```

**Como criar email no CloudPanel:**
1. Acesse CloudPanel
2. Vá em "Email" → "Email Accounts"
3. Crie: `noreply@obuxixogospel.com.br`
4. Use as credenciais no `.env`

### Opção 3: Serviços Gratuitos

**SendGrid** (100 emails/dia grátis):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=sua-api-key-aqui
```

**Mailgun** (5.000 emails/mês grátis):
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-aqui
```

---

## 🧪 Testar Configuração

### 1. Testar Conexão SMTP

Acesse no navegador:
```
https://www.obuxixogospel.com.br/api/newsletter/test-email
```

Deve retornar:
```json
{
  "success": true,
  "message": "Configuração de email OK"
}
```

### 2. Testar Inscrição

1. Vá para o site: https://www.obuxixogospel.com.br
2. Role até o footer
3. Insira seu email no formulário
4. Clique em "Inscrever-se"
5. Verifique seu email para confirmação

---

## 📱 Como Usar

### Para Usuários (Frontend)

1. **Inscrever-se:**
   - Preencher email no footer
   - Clicar em "Inscrever-se"
   - Confirmar email recebido

2. **Cancelar Inscrição:**
   - Clicar no link "Cancelar inscrição" em qualquer email

### Para Administradores (Dashboard)

1. **Ver Subscribers:**
   ```
   /dashboard/newsletter
   ```

2. **Enviar Newsletter Manual:**
   - Acesse `/dashboard/newsletter`
   - Selecione um post
   - Clique em "Enviar Newsletter"

3. **Ver Estatísticas:**
   ```
   /dashboard/newsletter/stats
   ```

---

## 🔄 Envio Automático ao Publicar Post

Para enviar newsletter automaticamente quando um post for publicado, adicione no controller de posts:

```javascript
// No arquivo controllers/postController.js ou onde você publica posts

const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const EmailService = require('../services/EmailService');

// Após publicar o post
if (post.publicado) {
  // Buscar subscribers ativos
  const subscribers = await NewsletterSubscriber.getActiveSubscribers();
  
  if (subscribers.length > 0) {
    // Enviar newsletter em background
    EmailService.enviarNovoPost(subscribers, post)
      .then(result => {
        console.log(`Newsletter enviada: ${result.successful}/${result.total}`);
      })
      .catch(error => {
        console.error('Erro ao enviar newsletter:', error);
      });
  }
}
```

---

## 📊 Endpoints da API

### Públicos

- `POST /api/newsletter/subscribe` - Inscrever email
- `GET /newsletter/confirmar/:token` - Confirmar inscrição
- `GET /newsletter/cancelar/:token` - Cancelar inscrição
- `GET /api/newsletter/test-email` - Testar configuração

### Admin (Requer Autenticação)

- `GET /dashboard/newsletter` - Listar subscribers
- `POST /dashboard/newsletter/enviar` - Enviar newsletter manual
- `GET /dashboard/newsletter/stats` - Estatísticas

---

## 🎨 Personalização

### Templates de Email

Edite em: `services/EmailService.js`

- `enviarEmailConfirmacao()` - Email de confirmação
- `enviarNovoPost()` - Notificação de novo post
- `enviarBoasVindas()` - Email de boas-vindas

### Estilos do Formulário

Edite em: `public/css/style.css`

Procure por: `.footer-newsletter-section`

---

## 🐛 Troubleshooting

### Email não está sendo enviado

1. **Verificar credenciais:**
   ```bash
   # Teste a conexão
   curl https://www.obuxixogospel.com.br/api/newsletter/test-email
   ```

2. **Verificar logs:**
   ```bash
   # No servidor
   pm2 logs
   ```

3. **Gmail bloqueando:**
   - Ative "Acesso a apps menos seguros"
   - Use "Senha de App" (recomendado)

### Emails indo para SPAM

1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um email do mesmo domínio do site
3. Evite palavras como "grátis", "promoção" no assunto

### Limite de envios atingido

- Gmail: 500/dia
- SendGrid Free: 100/dia
- Mailgun Free: 5.000/mês

**Solução:** Upgrade para plano pago ou use serviço dedicado

---

## 📈 Melhorias Futuras

- [ ] Segmentação por categoria
- [ ] Agendamento de envios
- [ ] A/B testing de subject
- [ ] Analytics de abertura/cliques
- [ ] Templates personalizáveis no admin
- [ ] Exportar lista de emails

---

## 🆘 Suporte

Se precisar de ajuda:

1. Verifique os logs: `pm2 logs`
2. Teste a conexão SMTP
3. Verifique as variáveis de ambiente
4. Confirme que a tabela foi criada

---

## ✅ Checklist de Implementação

- [ ] Instalar nodemailer
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Executar migration da tabela
- [ ] Testar conexão SMTP
- [ ] Testar inscrição no frontend
- [ ] Verificar email de confirmação
- [ ] Testar cancelamento de inscrição
- [ ] Configurar envio automático (opcional)
- [ ] Adicionar SPF/DKIM no domínio (produção)

---

**🎉 Pronto! Seu sistema de newsletter está configurado!**
