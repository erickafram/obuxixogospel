# Como Configurar Firefox para yt-dlp Usar Cookies do Instagram

## 🎯 Objetivo

Permitir que o yt-dlp baixe vídeos do Instagram usando cookies de uma sessão autenticada do Firefox, contornando o rate-limit.

## 📋 Pré-requisitos

- Acesso SSH ao servidor
- Permissões de root ou sudo

## 🚀 Método 1: Firefox Headless no Servidor (RECOMENDADO)

### Passo 1: Instalar Firefox no Servidor

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install firefox -y

# CentOS/RHEL
sudo yum install firefox -y
```

### Passo 2: Instalar Xvfb (Display Virtual)

```bash
# Ubuntu/Debian
sudo apt install xvfb -y

# CentOS/RHEL
sudo yum install xorg-x11-server-Xvfb -y
```

### Passo 3: Criar Perfil do Firefox

```bash
# Criar diretório para perfil
mkdir -p ~/.mozilla/firefox/instagram-profile

# Iniciar Firefox headless com Xvfb
Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99

# Criar perfil
firefox -CreateProfile "instagram ~/.mozilla/firefox/instagram-profile"
```

### Passo 4: Fazer Login no Instagram

```bash
# Iniciar Firefox com o perfil
firefox -P instagram https://www.instagram.com/accounts/login/

# Ou usar Firefox headless com VNC para acesso remoto
```

**Alternativa mais fácil:**

1. No seu computador local, instale o Firefox
2. Faça login no Instagram
3. Copie o perfil do Firefox para o servidor

```bash
# No seu computador (Windows)
# Perfil do Firefox fica em: C:\Users\SEU_USUARIO\AppData\Roaming\Mozilla\Firefox\Profiles\

# Compactar perfil
tar -czf firefox-profile.tar.gz "C:\Users\SEU_USUARIO\AppData\Roaming\Mozilla\Firefox\Profiles\PERFIL.default"

# Enviar para servidor via SCP
scp firefox-profile.tar.gz root@seu-servidor:/root/

# No servidor
cd /root
tar -xzf firefox-profile.tar.gz
mv PERFIL.default ~/.mozilla/firefox/instagram-profile
```

### Passo 5: Testar yt-dlp com Cookies

```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# Testar com cookies do Firefox
./bin/yt-dlp --cookies-from-browser firefox -g "https://www.instagram.com/reel/EXEMPLO/"
```

Se funcionar, você verá a URL do vídeo!

---

## 🚀 Método 2: Exportar Cookies Manualmente (MAIS SIMPLES)

### Passo 1: Instalar Extensão no Firefox

No seu computador, instale:
- **Firefox:** [cookies.txt LOCALLY](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

### Passo 2: Fazer Login no Instagram

1. Abra o Firefox
2. Acesse https://www.instagram.com
3. Faça login normalmente

### Passo 3: Exportar Cookies

1. Clique no ícone da extensão
2. Clique em "Export" ou "Download"
3. Salve como `instagram-cookies.txt`

### Passo 4: Enviar para Servidor

```bash
# No seu computador
scp instagram-cookies.txt root@seu-servidor:/home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/
```

### Passo 5: Modificar AIService.js

Adicione uma estratégia usando o arquivo de cookies:

```javascript
// No método obterUrlVideoComYtDlp, adicione:
const cookiesPath = path.join(__dirname, '../instagram-cookies.txt');
if (fs.existsSync(cookiesPath)) {
  strategies.unshift(
    `${ytDlpPath} -g --no-warnings --cookies "${cookiesPath}" "${instagramUrl}"`
  );
}
```

### Passo 6: Testar

```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# Testar com arquivo de cookies
./bin/yt-dlp --cookies instagram-cookies.txt -g "https://www.instagram.com/reel/EXEMPLO/"
```

---

## 🚀 Método 3: Usar Conta Secundária (MAIS SEGURO)

### Por que?

- Não expõe sua conta principal
- Se for bloqueada, não afeta sua conta pessoal
- Pode criar múltiplas contas para rotação

### Passos:

1. Crie uma conta nova no Instagram (use email temporário)
2. Faça login no Firefox
3. Exporte os cookies (Método 2)
4. Use no servidor

**Dica:** Crie 3-5 contas e rotacione os cookies semanalmente.

---

## ⚠️ Importante

### Renovação de Cookies

Cookies do Instagram expiram após ~30 dias. Você precisará:

1. Fazer login novamente
2. Exportar novos cookies
3. Atualizar no servidor

### Segurança

- **NUNCA** commite o arquivo `instagram-cookies.txt` no Git
- Adicione ao `.gitignore`:

```bash
echo "instagram-cookies.txt" >> .gitignore
```

### Permissões

```bash
# Dar permissão apenas para o usuário
chmod 600 instagram-cookies.txt
```

---

## 🎯 Qual Método Escolher?

| Método | Dificuldade | Manutenção | Segurança |
|---|---|---|---|
| **Método 1** (Firefox no servidor) | 🔴 Difícil | 🟢 Baixa | 🟢 Alta |
| **Método 2** (Exportar cookies) | 🟢 Fácil | 🟡 Média | 🟡 Média |
| **Método 3** (Conta secundária) | 🟢 Fácil | 🟡 Média | 🟢 Alta |

**Recomendação:** Comece com **Método 2 + Método 3** (exportar cookies de conta secundária).

---

## 📊 Taxa de Sucesso Esperada

Com cookies configurados:
- ✅ **90-95%** de sucesso no download de vídeos
- ⚠️ **5-10%** podem falhar (vídeos privados, bloqueios temporários)

---

## 🔧 Troubleshooting

### Erro: "No cookies found"

```bash
# Verificar se o Firefox está instalado
firefox --version

# Verificar perfil do Firefox
ls -la ~/.mozilla/firefox/
```

### Erro: "Cookies expired"

Renove os cookies (faça login novamente e exporte).

### Erro: "Browser not found"

Instale o Firefox no servidor (Método 1, Passo 1).

---

## 📝 Logs Esperados

Com cookies funcionando:

```bash
🔧 Tentando estratégia 1/5 do yt-dlp
⚠️ Estratégia 1 falhou (sem cookies)
🔧 Tentando estratégia 2/5 do yt-dlp
✅ URL do vídeo obtida via yt-dlp
✅ Vídeo salvo
✅ Áudio extraído
✅ Transcrição concluída
```

---

## 🎉 Resultado Final

Com esta configuração, você terá:
- ✅ Download automático de vídeos do Instagram
- ✅ Transcrição automática com Groq Whisper
- ✅ 90-95% de taxa de sucesso
- ✅ Sistema totalmente automatizado
