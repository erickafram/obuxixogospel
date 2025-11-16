# 📋 Instruções de Instalação - Postagem Automática

## Passo 1: Instalar Dependências

Execute no terminal:

```bash
npm install
```

Isso instalará o pacote `node-cron` necessário para o agendamento.

## Passo 2: Executar Migration do Banco de Dados

Execute a migration para criar os campos necessários:

```bash
npx sequelize-cli db:migrate
```

Isso criará os seguintes campos na tabela `instagram_profiles`:
- `auto_post_enabled` (boolean) - Se a postagem automática está ativada
- `last_auto_post` (datetime) - Data/hora da última execução
- `auto_post_frequency` (string) - Frequência (daily, weekly, monthly)
- `auto_post_time` (string) - Horário de execução (formato HH:MM)
- `posts_per_execution` (integer) - Quantidade de posts por execução

## Passo 3: Iniciar o Servidor

```bash
npm start
```

ou para desenvolvimento:

```bash
npm run dev
```

Você verá no console:

```
🚀 Servidor rodando em http://localhost:3000
🚀 Iniciando serviço de postagem automática...
✅ Serviço de postagem automática iniciado
⏰ Verificando perfis para processamento automático...
📭 Nenhum perfil com postagem automática ativada
✅ Verificação de perfis concluída
```

## Passo 4: Configurar Perfis

1. Acesse: http://localhost:3000/dashboard/ia/lote
2. Faça login se necessário
3. Cole a URL de um perfil do Instagram
4. Clique no botão ⭐ para salvar nos favoritos
5. Clique no botão ⚙️ para configurar a postagem automática
6. Configure:
   - **Horário**: Quando executar (ex: 09:00)
   - **Posts/dia**: Quantos posts processar (1-12)
7. Clique em "Salvar Configurações"

## Passo 5: Testar Manualmente (Opcional)

Para testar sem esperar o horário agendado:

1. Nas configurações do perfil, clique no botão ▶️ (play)
2. Confirme o processamento
3. Aguarde a conclusão (pode levar alguns minutos)
4. Verifique os rascunhos em Dashboard > Posts

## Verificação de Funcionamento

### Console do Servidor

Quando o sistema processar um perfil, você verá:

```
⏰ Verificando perfis para processamento automático...
📋 1 perfil(is) com postagem automática ativada

🎯 Processando perfil @falafarizeu...
📱 Extraindo posts de @falafarizeu...
✅ 3 posts extraídos de @falafarizeu
📝 2 posts novos para processar
🤖 Gerando matérias com IA...
✅ 2 matéria(s) gerada(s)
💾 Matéria salva como rascunho: [título]...

✅ Processamento concluído para @falafarizeu:
   - Posts extraídos: 3
   - Posts novos: 2
   - Matérias geradas: 2
   - Matérias salvas: 2
   - Status: Salvas como rascunho
```

### Interface Web

1. Badge "🤖 AUTO" aparece em perfis com postagem automática ativada
2. "Última execução" mostra quando foi processado
3. Configurações ficam visíveis quando ativadas

### Dashboard de Posts

1. Acesse Dashboard > Posts
2. Filtre por rascunhos (não publicados)
3. Matérias automáticas terão autor: "Redação Obuxixo Gospel (via @username)"

## Troubleshooting

### Erro: "Cannot find module 'node-cron'"

Execute:
```bash
npm install node-cron
```

### Erro: "Column 'auto_post_enabled' doesn't exist"

Execute a migration:
```bash
npx sequelize-cli db:migrate
```

### Perfil não está sendo processado

1. Verifique se passou o horário configurado
2. Confirme que a postagem automática está ativada (badge "AUTO")
3. Verifique se já processou nas últimas 23 horas
4. Veja os logs do servidor para erros

### IA não está gerando matérias

1. Verifique se a IA está ativa em Dashboard > Configurações
2. Confirme que a API Key está configurada
3. Teste manualmente gerando uma matéria

## Configurações Avançadas

### Alterar Frequência de Verificação

Edite `services/AutoPostService.js`, linha 25:

```javascript
// Executar a cada hora (padrão)
this.mainJob = cron.schedule('0 * * * *', async () => {

// Executar a cada 30 minutos
this.mainJob = cron.schedule('*/30 * * * *', async () => {

// Executar a cada 2 horas
this.mainJob = cron.schedule('0 */2 * * *', async () => {
```

### Desativar Serviço Automático

Comente as linhas em `app.js` (linhas 982-988):

```javascript
// // Iniciar serviço de postagem automática
// try {
//   const autoPostService = require('./services/AutoPostService');
//   await autoPostService.start();
// } catch (error) {
//   console.error('❌ Erro ao iniciar serviço de postagem automática:', error);
// }
```

## Recursos Implementados

✅ Agendamento automático por perfil  
✅ Configuração de horário personalizado  
✅ Quantidade de posts configurável  
✅ Processamento manual sob demanda  
✅ Verificação de duplicatas  
✅ Logs detalhados  
✅ Interface visual intuitiva  
✅ Salvamento como rascunho  
✅ Badge de status  
✅ Histórico de execução  

## Próximos Passos

Após a instalação:

1. Configure pelo menos um perfil favorito
2. Ative a postagem automática
3. Aguarde o horário agendado ou teste manualmente
4. Revise os rascunhos gerados
5. Publique as matérias aprovadas

## Suporte

Para problemas, verifique:
- Logs do servidor (console)
- Configurações da IA
- Conexão com banco de dados
- Permissões de arquivo (pasta uploads)
