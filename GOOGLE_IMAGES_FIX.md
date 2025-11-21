# Fix: Google Image Search Upload Error

## Problema Identificado

O erro `❌ URL não é imagem: text/html; charset="utf-8"` ocorre quando a API do Google Custom Search retorna URLs de páginas HTML ao invés de URLs diretas de imagens.

## Causa

Existem duas possíveis causas:

1. **Credenciais incorretas ou mal configuradas**: O Custom Search Engine (CX) pode estar configurado para retornar links de páginas ao invés de imagens diretas.

2. **Uso incorreto da API**: O campo `item.link` da resposta da API pode conter a URL da página onde a imagem está, não a URL da imagem em si.

## Solução Implementada

### 1. Validação de URLs no `AIService.js`

Agora o código valida se a URL é realmente uma imagem antes de retorná-la:

```javascript
// Preferir thumbnailLink que é sempre uma imagem válida
const imageUrl = item.image?.thumbnailLink || item.link;

// Validar se a URL parece ser uma imagem
const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(imageUrl) || 
                        imageUrl.includes('googleusercontent.com') ||
                        imageUrl.includes('ggpht.com');
```

### 2. Melhor Logging no Endpoint de Upload

O endpoint `/dashboard/media/upload-url` agora loga mais informações:

```javascript
console.log('📥 Tentando baixar imagem de:', url.substring(0, 100));
console.log('📄 Content-Type recebido:', contentType);
```

### 3. Seguir Redirects

Adicionado `maxRedirects: 5` para seguir redirects automaticamente.

## Como Testar

Execute o script de teste:

```bash
node test-google-images.js
```

Este script irá:
1. Verificar se as credenciais estão configuradas
2. Fazer uma busca de teste
3. Validar se cada URL retornada é uma imagem válida

## Verificar Credenciais de Produção

As credenciais de produção no `.env` são:

```
GOOGLE_API_KEY=AIzaSyB_oExZBwpquG5IhJ1UldEhMkwII5XHtwA
GOOGLE_CX=d794ee53b22334fc6
```

**IMPORTANTE**: Verifique se o Custom Search Engine (CX) `d794ee53b22334fc6` está configurado corretamente em:
https://programmablesearchengine.google.com/

### Configurações Recomendadas do Custom Search Engine:

1. **Search the entire web**: Ativado
2. **Image search**: Ativado
3. **Safe search**: Moderate ou Strict
4. **Sites to search**: Deixe vazio ou adicione sites confiáveis de imagens

## Logs Esperados

### ✅ Sucesso (Local)
```
✅ 5 imagens encontradas
--- Imagem 1 ---
Content-Type: image/jpeg
É imagem válida? ✅ SIM
```

### ❌ Erro (Produção - antes do fix)
```
❌ URL não é imagem: text/html; charset="utf-8"
POST /dashboard/media/upload-url 400
```

### ✅ Sucesso (Produção - após fix)
```
📥 Tentando baixar imagem de: https://encrypted-tbn0.gstatic.com/images?q=...
📄 Content-Type recebido: image/jpeg
✅ Imagem do Bing convertida para WebP
```

## Próximos Passos

1. ✅ Corrigir validação de URLs
2. ✅ Melhorar logs
3. ✅ Criar script de teste
4. ⏳ Testar em produção
5. ⏳ Se necessário, recriar o Custom Search Engine com configurações corretas

## Alternativa: Usar Thumbnails

Se o problema persistir, podemos usar apenas os thumbnails do Google (que são sempre válidos):

```javascript
// Sempre usar thumbnail ao invés do link original
const imageUrl = item.image?.thumbnailLink;
```

Os thumbnails são menores (geralmente 150x150), mas são sempre URLs diretas de imagens hospedadas no Google.
