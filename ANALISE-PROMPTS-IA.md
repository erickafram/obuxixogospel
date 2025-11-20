# Análise dos Prompts de IA - Dashboard IA/Lote vs Reescrever Matéria

**Data:** 20/11/2025  
**Solicitante:** Verificação de inconsistência na geração de matérias

## 🔍 Problema Relatado

Matérias geradas em `dashboard/ia/lote` (a partir de posts do Instagram) estavam **inventando fatos** que não existiam no post original, enquanto a função "Reescrever Matéria (Estilo G1)" mantinha fidelidade ao conteúdo.

## 📊 Análise Realizada

### 1. Comparação dos Prompts

**Função `gerarMateriaEstiloG1`** (usada em `/dashboard/ia/lote`)
- Localização: `services/AIService.js` linha 1607
- Temperatura: **0.3** → Alterada para **0.2**
- Retorno: JSON com `{titulo, descricao, conteudo}`

**Função `reescreverMateriaG1`** (usada em "Reescrever Matéria")
- Localização: `services/AIService.js` linha 1831
- Temperatura: **0.4**
- Retorno: Apenas HTML do conteúdo

### 2. Diferenças Identificadas

| Aspecto | gerarMateriaEstiloG1 | reescreverMateriaG1 |
|---------|---------------------|---------------------|
| **Temperatura** | 0.3 → **0.2** (após correção) | 0.4 |
| **Instruções** | Mais rigorosas contra meta-linguagem | Focado em reescrita |
| **Validação** | Valida caption do Instagram | Assume conteúdo já validado |
| **Formato** | JSON completo | Apenas HTML |

### 3. Causa Raiz do Problema

O problema **NÃO estava no prompt**, mas sim em:

1. **Temperatura ligeiramente alta (0.3)** - Permitia alguma "criatividade"
2. **Captions do Instagram vagos** - Textos curtos como "Descanse em paz 🙏" levavam a IA a "preencher lacunas"
3. **Falta de validação de qualidade** - Posts com apenas hashtags/emojis eram processados

## ✅ Melhorias Implementadas

### 1. Redução da Temperatura da IA
```javascript
// ANTES
const response = await this.makeRequest(messages, 0.3, 3000);

// DEPOIS
const response = await this.makeRequest(messages, 0.2, 3000);
```

**Impacto:** Temperatura 0.2 torna a IA **EXTREMAMENTE conservadora**, evitando qualquer invenção de fatos.

### 2. Validação de Qualidade do Caption
```javascript
// Nova validação adicionada
const captionLimpo = post.caption.replace(/[#@\u{1F300}-\u{1F9FF}]/gu, '').trim();
if (captionLimpo.length < 50) {
  console.log(`⚠️ Post ${postId} ignorado: caption sem conteúdo significativo`);
  erros.push({
    post: post,
    erro: 'Caption sem conteúdo textual suficiente (apenas hashtags/emojis)'
  });
  continue;
}
```

**Impacto:** Posts com apenas hashtags, menções e emojis são **rejeitados automaticamente**.

### 3. Instrução Específica no Prompt
```
⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica
```

**Impacto:** IA recebe orientação clara sobre como lidar com textos vagos.

### 4. Logs Detalhados
```javascript
console.log('📋 Caption do post (primeiros 300 chars):', post.caption.substring(0, 300));
console.log('📏 Tamanho do caption:', post.caption.length, 'caracteres');
console.log('🧹 Caption limpo (sem hashtags/emojis):', captionLimpo.length, 'caracteres');
```

**Impacto:** Facilita debug e identificação de posts problemáticos.

## 🎯 Resultado Esperado

Após as melhorias:

✅ **Temperatura 0.2** - IA extremamente fiel ao original  
✅ **Validação rigorosa** - Apenas posts com conteúdo textual suficiente  
✅ **Logs detalhados** - Rastreamento completo do processamento  
✅ **Instruções claras** - Orientação específica sobre textos vagos  

## 📝 Recomendações de Uso

### Para Melhores Resultados:

1. **Posts do Instagram devem ter:**
   - Mínimo 50 caracteres de texto (sem hashtags/emojis)
   - Contexto claro sobre o evento/notícia
   - Informações factuais (nomes, locais, datas)

2. **Evitar processar posts com:**
   - Apenas emojis e hashtags
   - Textos vagos como "RIP 🙏"
   - Apenas imagens sem legenda

3. **Monitorar logs:**
   - Verificar posts rejeitados
   - Analisar qualidade do caption antes de processar
   - Revisar matérias geradas antes de publicar

## 🔧 Arquivos Modificados

- `services/AIService.js` (linhas 1376-1400, 1640-1650, 1733)

## 📌 Observações Finais

Os prompts eram **praticamente idênticos** desde o início. O problema estava na **temperatura da IA** e na **falta de validação** do conteúdo do Instagram. As melhorias implementadas garantem maior fidelidade ao conteúdo original.

---

**Última atualização:** 20/11/2025 13:35 BRT
