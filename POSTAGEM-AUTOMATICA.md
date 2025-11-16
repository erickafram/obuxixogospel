# 🤖 Sistema de Postagem Automática

## Visão Geral

O sistema de postagem automática permite que perfis favoritos do Instagram sejam monitorados diariamente, extraindo posts automaticamente e gerando matérias como rascunhos sem intervenção manual.

## Como Funciona

### 1. Adicionar Perfil aos Favoritos

1. Acesse: http://localhost:3000/dashboard/ia/lote
2. Cole a URL do perfil do Instagram (ex: https://www.instagram.com/falafarizeu/)
3. Clique no botão ⭐ (estrela) ao lado do campo de URL
4. O perfil será salvo na lista de "Perfis Favoritos"

### 2. Configurar Postagem Automática

Para cada perfil favorito, você pode:

1. **Ativar/Desativar**: Clique no botão ⚙️ (engrenagem) para abrir as configurações
2. **Configurar Horário**: Defina o horário diário de execução (ex: 09:00)
3. **Definir Quantidade**: Escolha quantos posts processar por dia (1-12)
4. **Salvar**: Clique em "Salvar Configurações"

### 3. Funcionamento Automático

**O sistema executa automaticamente:**

- ✅ Verifica perfis com postagem automática ativada a cada hora
- ✅ No horário configurado, extrai os últimos posts do perfil
- ✅ Filtra posts que já foram publicados (evita duplicatas)
- ✅ Gera matérias completas com IA
- ✅ Busca imagens relevantes automaticamente
- ✅ Salva tudo como **rascunho** para revisão
- ✅ Registra data/hora da última execução

### 4. Processamento Manual

Você também pode processar um perfil manualmente:

1. Clique no botão ▶️ (play) nas configurações do perfil
2. O sistema processará imediatamente sem esperar o horário agendado

## Recursos

### Badge "AUTO"
Perfis com postagem automática ativada exibem um badge verde "🤖 AUTO"

### Última Execução
Mostra quando foi a última vez que o perfil foi processado automaticamente

### Rascunhos Automáticos
Todas as matérias geradas automaticamente são salvas como **rascunho** para que você possa:
- Revisar o conteúdo
- Editar se necessário
- Publicar quando aprovar

## Configurações Técnicas

### Frequência de Verificação
- O sistema verifica perfis **a cada hora**
- Processa apenas no horário configurado
- Evita processamento duplicado (mínimo 23h entre execuções)

### Limite de Posts
- Mínimo: 1 post por dia
- Máximo: 12 posts por dia
- Padrão: 3 posts por dia

### Horário Padrão
- Horário padrão: 09:00 (manhã)
- Pode ser alterado para qualquer horário

## Comandos de Banco de Dados

### Executar Migration
```bash
npx sequelize-cli db:migrate
```

Isso criará os campos necessários na tabela `instagram_profiles`:
- `auto_post_enabled` - Se está ativado
- `last_auto_post` - Última execução
- `auto_post_frequency` - Frequência (daily)
- `auto_post_time` - Horário (HH:MM)
- `posts_per_execution` - Quantidade de posts

### Instalar Dependências
```bash
npm install
```

Isso instalará o `node-cron` necessário para o agendamento.

## Logs do Sistema

O sistema gera logs detalhados no console:

```
🚀 Iniciando serviço de postagem automática...
✅ Serviço de postagem automática iniciado

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

## Segurança

- ✅ Todas as rotas são protegidas com autenticação
- ✅ Apenas usuários logados podem configurar
- ✅ Matérias salvas como rascunho (não publicadas automaticamente)
- ✅ Sistema evita duplicatas verificando posts já processados

## Troubleshooting

### Perfil não está sendo processado
1. Verifique se a postagem automática está ativada (badge "AUTO")
2. Confirme o horário configurado
3. Verifique se já passou 23h desde a última execução
4. Veja os logs do servidor para erros

### Posts duplicados
O sistema verifica automaticamente posts já processados usando o `instagramPostId`. Se houver duplicatas, pode ser que:
- O perfil foi processado manualmente e automaticamente no mesmo dia
- Houve erro na verificação de duplicatas

### Matérias não aparecem
- Verifique a lista de Posts no dashboard
- Filtre por "Rascunhos" (publicado = false)
- Matérias automáticas têm autor: "Redação Obuxixo Gospel (via @username)"

## Próximos Passos

Após configurar:

1. ✅ Aguarde o horário configurado ou processe manualmente
2. ✅ Acesse Dashboard > Posts para ver os rascunhos
3. ✅ Revise e edite as matérias geradas
4. ✅ Publique as que aprovar

## Suporte

Para problemas ou dúvidas, verifique:
- Logs do servidor (console)
- Status da IA (deve estar ativa)
- Configurações de API da IA
- Conexão com banco de dados
