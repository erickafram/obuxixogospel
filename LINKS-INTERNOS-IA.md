# 🔗 Links Internos Automáticos com IA

## ✅ Correção Aplicada

### Problema Identificado
Os links estavam sendo criados com URLs inválidas (`/geral/undefined`) porque:
- O código estava buscando `url_amigavel` (snake_case)
- Mas o campo no banco é `urlAmigavel` (camelCase)

### Solução
Corrigido em `services/InternalLinkingService.js`:
```javascript
// ANTES (errado)
attributes: ['id', 'titulo', 'descricao', 'categoria', 'url_amigavel']
order: [['data_publicacao', 'DESC']]
url: `/${a.categoria}/${a.url_amigavel}`

// DEPOIS (correto)
attributes: ['id', 'titulo', 'descricao', 'categoria', 'urlAmigavel']
order: [['dataPublicacao', 'DESC']]
url: `/${a.categoria}/${a.urlAmigavel}`
```

## 🧪 Como Testar

### 1. Verificar se a IA está Ativa
- Acesse: **Dashboard → Configurações → IA**
- Certifique-se que está **ATIVA**
- Verifique se tem API Key configurada

### 2. Criar Artigo de Teste

**Passo 1:** Publique um artigo sobre um tema específico
```
Título: Silas Malafaia se reúne com Bolsonaro
Conteúdo: O pastor Silas Malafaia teve um encontro importante com o ex-presidente Bolsonaro...
```

**Passo 2:** Publique outro artigo mencionando o mesmo tema
```
Título: Nova polêmica envolve líderes evangélicos
Conteúdo: Silas Malafaia avisou que ia falar com Bolsonaro sobre a situação política...
```

### 3. Verificar os Logs

No terminal/console do servidor, você verá:
```
🔗 Iniciando processo de links internos...
   Título: Nova polêmica envolve líderes evangélicos
   Article ID: null
   IA ativa? true
   Texto limpo (primeiros 100 chars): Silas Malafaia avisou que ia falar com Bolsonaro...
   🔍 Buscando artigos relacionados...
   Palavras-chave extraídas: ['silas', 'malafaia', 'bolsonaro', ...]
   Artigos relacionados encontrados: 1
   Artigos: "Silas Malafaia se reúne com Bolsonaro" (/noticias/silas-malafaia-se-reune-com-bolsonaro)
✓ Link adicionado: "Silas Malafaia avisou que ia falar com Bolsonaro" -> /noticias/...
✅ 1 link(s) interno(s) adicionado(s) com sucesso!
```

### 4. Verificar no Artigo Publicado

Abra o artigo e veja se o link foi criado:
```html
<a href="/noticias/silas-malafaia-se-reune-com-bolsonaro" 
   title="Silas Malafaia se reúne com Bolsonaro" 
   class="internal-link">
   Silas Malafaia avisou que ia falar com Bolsonaro
</a>
```

## 📊 Quando os Links São Adicionados

✅ **Ao PUBLICAR novo artigo**
✅ **Ao PUBLICAR rascunho pela primeira vez**
✅ **Quando IA está ATIVA**

❌ **NÃO em rascunhos**
❌ **NÃO ao editar artigo já publicado**
❌ **NÃO se IA estiver desativada**

## 🔧 Troubleshooting

### Links não estão sendo criados?

1. **Verifique se a IA está ativa:**
   ```sql
   SELECT * FROM configuracoes_sistema WHERE chave = 'ia_ativa';
   -- Deve retornar valor = 'true'
   ```

2. **Verifique se tem artigos publicados:**
   ```sql
   SELECT COUNT(*) FROM articles WHERE publicado = 1;
   -- Deve ter pelo menos 1 artigo
   ```

3. **Verifique os logs do servidor:**
   - Procure por mensagens começando com 🔗
   - Veja se há erros de IA ou banco de dados

4. **Teste manual:**
   - Publique um artigo simples
   - Depois publique outro mencionando o primeiro
   - Verifique os logs

### Links com URL inválida?

Se ainda aparecer `/geral/undefined`:
1. Reinicie o servidor Node.js
2. Limpe o cache do navegador
3. Verifique se o arquivo `InternalLinkingService.js` foi salvo corretamente

## 💡 Dicas

- **Máximo de 2 links por artigo** (configurável)
- **Links só em artigos publicados** (não em rascunhos)
- **IA escolhe os melhores trechos** (contexto natural)
- **Não duplica links** (verifica se já existe)
- **Não linka para si mesmo** (exclui artigo atual)

## 🎨 Estilo dos Links

Os links internos têm classe CSS `internal-link`:
- Cor laranja (--color-primary)
- Sublinhado pontilhado
- Efeito hover suave
- Negrito leve (font-weight: 500)

## 📝 Exemplo Real

**Artigo 1 (já publicado):**
```
ID: 130
Título: Pastor morre durante culto evangélico em igreja
URL: /noticias/pastor-morre-durante-culto-evangelico-em-igreja
```

**Artigo 2 (novo):**
```
Título: Tragédia em igreja evangélica choca comunidade
Conteúdo: "Um pastor morre durante culto evangélico em igreja local..."
```

**Resultado esperado:**
```html
Um <a href="/noticias/pastor-morre-durante-culto-evangelico-em-igreja" 
       title="Pastor morre durante culto evangélico em igreja" 
       class="internal-link">pastor morre durante culto evangélico em igreja</a> local...
```

## 🚀 Próximos Passos

1. **Teste com artigos reais** do seu site
2. **Monitore os logs** para ver o comportamento
3. **Ajuste o número máximo de links** se necessário (padrão: 2)
4. **Verifique o SEO** dos artigos com links internos

---

**Última atualização:** 21/11/2025 23:55
**Status:** ✅ Funcionando (após correção)
