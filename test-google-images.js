/**
 * Script de teste para verificar se a API do Google Custom Search
 * está retornando URLs de imagens válidas
 */

require('dotenv').config();
const axios = require('axios');

async function testarGoogleImages() {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CX;

  console.log('🔑 Testando credenciais do Google Custom Search API');
  console.log('API Key:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : 'NÃO CONFIGURADA');
  console.log('CX:', GOOGLE_CX || 'NÃO CONFIGURADO');
  console.log('');

  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.error('❌ Credenciais não configuradas no .env');
    process.exit(1);
  }

  const query = 'igreja gospel evangélico';
  const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=5&imgSize=large&safe=active`;

  try {
    console.log('🔍 Buscando imagens para:', query);
    const response = await axios.get(searchUrl, { timeout: 15000 });

    if (!response.data || !response.data.items) {
      console.error('❌ Nenhum resultado retornado pela API');
      console.log('Resposta:', JSON.stringify(response.data, null, 2));
      process.exit(1);
    }

    console.log(`✅ ${response.data.items.length} imagens encontradas\n`);

    for (let i = 0; i < Math.min(5, response.data.items.length); i++) {
      const item = response.data.items[i];
      console.log(`--- Imagem ${i + 1} ---`);
      console.log('Título:', item.title);
      console.log('Link (item.link):', item.link);
      console.log('Thumbnail (item.image.thumbnailLink):', item.image?.thumbnailLink);
      console.log('Context Link:', item.image?.contextLink);
      
      // Testar se o link é uma imagem válida
      const testUrl = item.image?.thumbnailLink || item.link;
      try {
        const testResponse = await axios.head(testUrl, {
          timeout: 5000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const contentType = testResponse.headers['content-type'];
        const isImage = contentType && contentType.startsWith('image/');
        
        console.log('Content-Type:', contentType);
        console.log('É imagem válida?', isImage ? '✅ SIM' : '❌ NÃO');
      } catch (error) {
        console.log('❌ Erro ao testar URL:', error.message);
      }
      console.log('');
    }

    console.log('✅ Teste concluído');
  } catch (error) {
    console.error('❌ Erro ao buscar imagens:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testarGoogleImages();
