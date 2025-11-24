# 📧 Configuração SMTP para Newsletter

## ⚠️ Problema Atual

O Gmail está com timeout no servidor DigitalOcean porque a porta 587 pode estar bloqueada.

**Erro:**
```
Connection timeout
code: 'ETIMEDOUT'
```

---

## ✅ Soluções Alternativas

### **Opção 1: Usar SMTP do Servidor (Recomendado para DigitalOcean)**

Se você tem CloudPanel instalado, pode usar o SMTP local:

#### 1. Criar Email no CloudPanel

1. Acesse CloudPanel
2. Vá em **Email** → **Email Accounts**
3. Crie: `noreply@obuxixogospel.com.br`
4. Defina uma senha forte

#### 2. Configurar no .env

```env
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=noreply@obuxixogospel.com.br
SMTP_PASS=sua-senha-aqui
SMTP_FROM=Obuxixo Gospel <noreply@obuxixogospel.com.br>
BASE_URL=https://www.obuxixogospel.com.br
```

#### 3. Reiniciar Aplicação

```bash
pm2 restart obuxixogospel
```

---

### **Opção 2: Usar Porta 465 do Gmail (SSL)**

Algumas vezes a porta 465 funciona quando a 587 está bloqueada:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=obuxixogospel@gmail.com
SMTP_PASS=copn eynr ldrj nybr
SMTP_FROM=Obuxixo Gospel <noreply@obuxixogospel.com.br>
BASE_URL=https://www.obuxixogospel.com.br
```

E ajuste no código `services/EmailService.js`:

```javascript
this.transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true para porta 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});
```

---

### **Opção 3: Usar SendGrid (Grátis - 100 emails/dia)**

#### 1. Criar Conta

1. Acesse: https://sendgrid.com/
2. Crie conta gratuita
3. Vá em **Settings** → **API Keys**
4. Crie uma API Key

#### 2. Configurar no .env

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key-aqui
SMTP_FROM=Obuxixo Gospel <noreply@obuxixogospel.com.br>
BASE_URL=https://www.obuxixogospel.com.br
```

---

### **Opção 4: Usar Mailgun (Grátis - 5.000 emails/mês)**

#### 1. Criar Conta

1. Acesse: https://www.mailgun.com/
2. Crie conta gratuita
3. Adicione seu domínio
4. Configure DNS (SPF, DKIM, CNAME)

#### 2. Configurar no .env

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.obuxixogospel.com.br
SMTP_PASS=sua-senha-aqui
SMTP_FROM=Obuxixo Gospel <noreply@obuxixogospel.com.br>
BASE_URL=https://www.obuxixogospel.com.br
```

---

### **Opção 5: Desbloquear Porta 587 no DigitalOcean**

DigitalOcean bloqueia portas SMTP por padrão para evitar spam.

#### Solicitar Desbloqueio

1. Acesse: https://cloud.digitalocean.com/support/tickets
2. Crie um ticket solicitando desbloqueio da porta 587
3. Explique que é para newsletter legítima
4. Aguarde aprovação (pode levar 24-48h)

---

## 🧪 Testar Configuração

Após configurar, teste:

```bash
# No servidor
curl https://www.obuxixogospel.com.br/api/newsletter/test-email
```

Deve retornar:
```json
{
  "success": true,
  "message": "Configuração de email OK"
}
```

---

## 📊 Comparação de Opções

| Opção | Custo | Limite | Dificuldade | Recomendação |
|-------|-------|--------|-------------|--------------|
| **SMTP Local** | Grátis | Ilimitado* | Fácil | ⭐⭐⭐⭐⭐ Melhor |
| **Gmail 465** | Grátis | 500/dia | Fácil | ⭐⭐⭐ Pode funcionar |
| **SendGrid** | Grátis | 100/dia | Fácil | ⭐⭐⭐⭐ Boa opção |
| **Mailgun** | Grátis | 5.000/mês | Média | ⭐⭐⭐⭐⭐ Melhor grátis |
| **Desbloquear** | Grátis | 500/dia | Difícil | ⭐⭐ Demorado |

*Depende do servidor

---

## 🔧 Configuração Atual Aplicada

O código já está preparado para:

✅ **Não bloquear inscrição** se email falhar
✅ **Timeout de 10 segundos** para não travar
✅ **Logs de erro** para debug
✅ **Subscriber salvo** mesmo se email não enviar

**Resultado:** O usuário consegue se inscrever, mas não recebe email de confirmação até SMTP ser configurado corretamente.

---

## 📝 Próximos Passos

1. **Escolha uma opção** de SMTP acima
2. **Configure no .env** do servidor
3. **Reinicie a aplicação**: `pm2 restart obuxixogospel`
4. **Teste** a inscrição novamente
5. **Verifique os logs**: `pm2 logs obuxixogospel`

---

## 🆘 Troubleshooting

### Email não está sendo enviado

```bash
# Ver logs em tempo real
pm2 logs obuxixogospel --lines 50

# Testar conexão SMTP
telnet smtp.gmail.com 587
# ou
telnet localhost 587
```

### Porta bloqueada

```bash
# Verificar se porta está aberta
nc -zv smtp.gmail.com 587
nc -zv localhost 587
```

### Verificar configuração

```bash
# Ver variáveis de ambiente
pm2 env 0
```

---

**💡 Recomendação Final:**

Use **SMTP Local (CloudPanel)** ou **Mailgun** para melhor resultado em produção.
