const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const { SystemConfig } = require('../models');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const FormData = require('form-data');
const { igApi } = require('insta-fetcher');

// Configurar caminho do ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

class AIService {
  /**
   * Verifica se a IA está ativa
   */
  static async isActive() {
    const ativa = await SystemConfig.getConfig('ia_ativa');
    return ativa === 'true';
  }

  /**
   * Obtém as configurações da IA
   */
  static async getConfig() {
    const [apiKey, apiUrl, model] = await Promise.all([
      SystemConfig.getConfig('ia_api_key'),
      SystemConfig.getConfig('ia_api_url'),
      SystemConfig.getConfig('ia_model')
    ]);

    return { apiKey, apiUrl, model };
  }

  /**
   * Faz uma requisição para a API da IA
   */
  static async makeRequest(messages, temperature = 0.7, maxTokens = 2000) {
    const { apiKey, apiUrl, model } = await this.getConfig();

    if (!apiKey || !apiUrl || !model) {
      throw new Error('Configurações da IA não encontradas');
    }

    try {
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 segundos
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Erro na API da IA:', error.response?.data || error.message);
      throw new Error('Erro ao comunicar com a IA: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  /**
   * Pesquisa informações na internet usando DuckDuckGo
   */
  static async pesquisarInternet(query) {
    try {
      // Usando DuckDuckGo HTML (gratuito, sem API key)
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const resultados = [];

      $('.result').slice(0, 5).each((i, elem) => {
        const titulo = $(elem).find('.result__title').text().trim();
        const snippet = $(elem).find('.result__snippet').text().trim();
        resultados.push({ titulo, snippet });
      });

      return resultados;
    } catch (error) {
      console.error('Erro ao pesquisar:', error.message);
      return [];
    }
  }

  /**
   * Extrai conteúdo de uma URL (incluindo Instagram)
   * Retorna objeto com texto e imagem (se for artigo/matéria)
   */
  static async extrairConteudoURL(url) {
    try {
      // Detectar se é Instagram
      if (url.includes('instagram.com')) {
        const conteudo = await this.extrairConteudoInstagram(url);
        return { texto: conteudo, imagem: null };
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Tentar extrair imagem destaque de artigo/matéria
      const imagemDestaque = await this.extrairImagemDestaque($, url);

      // Remover scripts e estilos
      $('script, style, nav, footer, header').remove();

      // Extrair texto principal
      const texto = $('article, main, .content, .post-content, .entry-content, body')
        .first()
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 2000); // Limitar a 2000 caracteres

      return { texto, imagem: imagemDestaque };
    } catch (error) {
      console.error('Erro ao extrair conteúdo:', error.message);
      return { texto: '', imagem: null };
    }
  }

  /**
   * Extrai imagem destaque de um artigo/matéria
   */
  static async extrairImagemDestaque($, urlBase) {
    try {
      let imagemUrl = null;

      // Método 1: Open Graph image (mais confiável)
      imagemUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[property="og:image:secure_url"]').attr('content');

      // Método 2: Twitter Card image
      if (!imagemUrl) {
        imagemUrl = $('meta[name="twitter:image"]').attr('content') ||
          $('meta[name="twitter:image:src"]').attr('content');
      }

      // Método 3: Schema.org image
      if (!imagemUrl) {
        const schemaScript = $('script[type="application/ld+json"]').html();
        if (schemaScript) {
          try {
            const schema = JSON.parse(schemaScript);
            imagemUrl = schema.image?.url || schema.image || schema.thumbnailUrl;
          } catch (e) {
            // Ignorar erro de parse
          }
        }
      }

      // Método 4: Link rel="image_src"
      if (!imagemUrl) {
        imagemUrl = $('link[rel="image_src"]').attr('href');
      }

      // Método 5: Primeira imagem grande no artigo
      if (!imagemUrl) {
        const primeiraImagem = $('article img, .post-content img, .entry-content img, main img').first();
        imagemUrl = primeiraImagem.attr('src') || primeiraImagem.attr('data-src');
      }

      // Se encontrou imagem, normalizar URL
      if (imagemUrl) {
        // Se for URL relativa, converter para absoluta
        if (imagemUrl.startsWith('/')) {
          const urlObj = new URL(urlBase);
          imagemUrl = `${urlObj.protocol}//${urlObj.host}${imagemUrl}`;
        } else if (!imagemUrl.startsWith('http')) {
          const urlObj = new URL(urlBase);
          imagemUrl = `${urlObj.protocol}//${urlObj.host}/${imagemUrl}`;
        }

        // Validar se é uma imagem válida (não é ícone pequeno)
        if (imagemUrl.includes('icon') || imagemUrl.includes('logo') || imagemUrl.includes('avatar')) {
          console.log('Imagem ignorada (parece ser ícone/logo):', imagemUrl);
          return null;
        }

        console.log('✅ Imagem destaque encontrada:', imagemUrl);
        return imagemUrl;
      }

      console.log('❌ Nenhuma imagem destaque encontrada');
      return null;
    } catch (error) {
      console.error('Erro ao extrair imagem destaque:', error.message);
      return null;
    }
  }

  /**
   * Extrai conteúdo do Instagram (texto da postagem + comentários)
   */
  static async extrairConteudoInstagram(url) {
    try {
      console.log('Extraindo conteúdo do Instagram:', url);

      let textoLegenda = '';
      let textoTranscricao = '';

      // 1. Tentar extrair texto da postagem (Legenda) via oEmbed ou Proxy
      const postId = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[1] || url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[2];

      if (postId) {
        // Método 1A: Tentar oEmbed API (Oficial e rápido para dados públicos)
        try {
          console.log('Tentando oEmbed API para post:', postId);
          const cleanUrl = `https://www.instagram.com/p/${postId}/`;
          const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}&omitscript=true`;

          const oembedResponse = await axios.get(oembedUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' }
          });

          if (oembedResponse.data && oembedResponse.data.title) {
            textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${oembedResponse.data.title}\n\n`;
            if (oembedResponse.data.author_name) {
              textoLegenda += `AUTOR: ${oembedResponse.data.author_name}\n\n`;
            }
            console.log('✅ Legenda extraída via oEmbed');
          }
        } catch (oembedError) {
          console.log('⚠️ oEmbed falhou, tentando próximos métodos...');
        }

        // Método 1B: Tentar via instagram-url-direct
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair legenda via instagram-url-direct...');
            let instagramGetUrl;
            try {
              const lib = require("instagram-url-direct");
              instagramGetUrl = lib.instagramGetUrl;
            } catch (e) { }

            if (instagramGetUrl) {
              const links = await instagramGetUrl(url);
              // Verificar se há caption nos dados retornados
              if (links.caption) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${links.caption}\n\n`;
                console.log('✅ Legenda extraída via instagram-url-direct');
              }
            }
          } catch (e) {
            console.log('⚠️ Falha ao extrair legenda via instagram-url-direct:', e.message);
          }
        }

        // Método 1C: Tentar via insta-fetcher
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair legenda via insta-fetcher...');
            const ig = new igApi();
            const postData = await ig.fetchPost(url);

            if (postData && (postData.caption || postData.description)) {
              const caption = postData.caption || postData.description;
              textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
              if (postData.username || postData.owner?.username) {
                const author = postData.username || postData.owner?.username;
                textoLegenda += `AUTOR: ${author}\n\n`;
              }
              console.log('✅ Legenda extraída via insta-fetcher');
            }
          } catch (e) {
            console.log('⚠️ Falha ao extrair legenda via insta-fetcher:', e.message);
          }
        }

        // Método 1D: Scraping direto do HTML do Instagram
        if (!textoLegenda) {
          try {
            console.log('Tentando scraping direto do HTML...');
            const response = await axios.get(url, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
              }
            });

            const html = response.data;
            
            // Método 1: Extrair do JSON embutido no HTML
            const scriptRegex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
            const scriptMatches = html.matchAll(scriptRegex);
            
            for (const match of scriptMatches) {
              try {
                const jsonData = JSON.parse(match[1]);
                if (jsonData.articleBody) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${jsonData.articleBody}\n\n`;
                  console.log('✅ Legenda extraída via JSON-LD');
                  break;
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            }

            // Método 2: Extrair do meta tag og:description
            if (!textoLegenda) {
              const $ = cheerio.load(html);
              const ogDescription = $('meta[property="og:description"]').attr('content');
              const twitterDescription = $('meta[name="twitter:description"]').attr('content');
              const description = ogDescription || twitterDescription;

              if (description && description.length > 20) {
                // Remover contadores de likes/comentários que vêm no og:description
                const cleanDescription = description.replace(/^\d+\s+(Likes|Comments|Followers|Following),?\s*/i, '');
                if (cleanDescription.length > 10) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${cleanDescription}\n\n`;
                  console.log('✅ Legenda extraída via meta tags');
                }
              }
            }

            // Método 3: Extrair do window._sharedData
            if (!textoLegenda) {
              const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
              if (sharedDataMatch) {
                try {
                  const sharedData = JSON.parse(sharedDataMatch[1]);
                  const postData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                  
                  if (postData?.edge_media_to_caption?.edges?.[0]?.node?.text) {
                    const caption = postData.edge_media_to_caption.edges[0].node.text;
                    textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                    console.log('✅ Legenda extraída via _sharedData');
                  }
                } catch (e) {
                  console.log('⚠️ Erro ao parsear _sharedData:', e.message);
                }
              }
            }

          } catch (scrapingError) {
            console.log('❌ Scraping direto falhou:', scrapingError.message);
          }
        }

        // Método 1E: Tentar API pública Instagram Downloader
        if (!textoLegenda) {
          try {
            console.log('Tentando API pública Instagram Downloader...');
            const apiUrl = `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`;
            
            const apiResponse = await axios.get(apiUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0'
              }
            });

            if (apiResponse.data && apiResponse.data.data) {
              const postData = apiResponse.data.data;
              const caption = postData.caption?.text || postData.edge_media_to_caption?.edges?.[0]?.node?.text;
              
              if (caption && caption.length > 10) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                if (postData.owner?.username) {
                  textoLegenda += `AUTOR: ${postData.owner.username}\n\n`;
                }
                console.log('✅ Legenda extraída via API pública');
              }
            }
          } catch (apiError) {
            console.log('❌ API pública falhou:', apiError.message);
          }
        }

        // Método 1F: Tentar proxy (allorigins) como último recurso
        if (!textoLegenda) {
          try {
            console.log('Tentando proxy allorigins...');
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const proxyResponse = await axios.get(proxyUrl, { timeout: 15000 });

            if (proxyResponse.data && proxyResponse.data.contents) {
              const $ = cheerio.load(proxyResponse.data.contents);
              const description = $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content');

              if (description && description.length > 20) {
                const cleanDescription = description.replace(/^\d+\s+(Likes|Comments|Followers|Following),?\s*/i, '');
                if (cleanDescription.length > 10) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${cleanDescription}\n\n`;
                  console.log('✅ Legenda extraída via proxy');
                }
              }
            }
          } catch (proxyError) {
            console.log('❌ Proxy falhou:', proxyError.message);
          }
        }

        // Método 1G: Tentar extrair do próprio objeto retornado pelo instagram-url-direct (dados completos)
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair dados completos via instagram-url-direct...');
            const lib = require("instagram-url-direct");
            const result = await lib.instagramGetUrl(url);
            
            // Tentar diferentes campos onde a legenda pode estar
            const possibleCaptions = [
              result.caption,
              result.edge_media_to_caption?.edges?.[0]?.node?.text,
              result.title,
              result.description
            ];

            for (const caption of possibleCaptions) {
              if (caption && typeof caption === 'string' && caption.length > 10) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                console.log('✅ Legenda extraída via instagram-url-direct (dados completos)');
                break;
              }
            }
          } catch (e) {
            console.log('❌ Extração completa via instagram-url-direct falhou:', e.message);
          }
        }
      }

      // 2. Tentar transcrever vídeo (Reels ou Posts de vídeo)
      if (url.includes('/reel/') || url.includes('/reels/') || url.includes('/p/')) {
        try {
          console.log('🎥 Verificando se há vídeo para transcrição...');
          const transcricao = await this.processarVideoInstagram(url);
          if (transcricao) {
            textoTranscricao = `📱 CONTEÚDO DO VÍDEO (TRANSCRITO):\n\n${transcricao}\n\n`;
          }
        } catch (e) {
          console.log('⚠️ Não foi possível transcrever vídeo (pode ser apenas foto):', e.message);
        }
      }

      // 3. Combinar resultados
      let conteudoFinal = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';

      if (textoLegenda) conteudoFinal += textoLegenda;
      if (textoTranscricao) conteudoFinal += textoTranscricao;

      if (!textoLegenda && !textoTranscricao) {
        return '\n\n📱 Não foi possível extrair o conteúdo automaticamente do Instagram.\n\nPor favor, copie o texto da postagem e cole no campo "Cole o Texto da Postagem".\n';
      }

      return conteudoFinal;

    } catch (error) {
      console.error('Erro ao extrair Instagram:', error.message);
      return '\n\n📱 Não foi possível extrair o conteúdo automaticamente do Instagram.\n\nPor favor, copie o texto da postagem e cole no campo "Cole o Texto da Postagem".\n';
    }
  }

  /**
   * Busca notícias atuais usando Google News RSS
   */
  static async buscarNoticiasAtuais(query) {
    try {
      const parser = new Parser();
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

      const feed = await parser.parseURL(url);
      const noticias = feed.items.slice(0, 5).map(item => ({
        titulo: item.title,
        descricao: item.contentSnippet || item.content,
        link: item.link,
        data: item.pubDate
      }));

      return noticias;
    } catch (error) {
      console.error('Erro ao buscar notícias:', error.message);
      return [];
    }
  }

  /**
   * Busca imagens relacionadas ao tema usando Unsplash API (gratuita)
   */
  static async buscarImagensSugeridas(query) {
    try {
      // Unsplash API gratuita (sem necessidade de key para busca básica)
      // Alternativa: usar Pexels API que também é gratuita
      const response = await fetch(
        `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)},gospel,church,christian`,
        { redirect: 'manual' }
      );

      // A URL de redirecionamento é a imagem
      const imageUrl = response.headers.get('location');

      if (imageUrl) {
        return [{
          url: imageUrl,
          descricao: `Imagem relacionada a: ${query}`,
          fonte: 'Unsplash'
        }];
      }

      // Fallback: buscar usando Pexels API (gratuita, mas precisa de key)
      // Por enquanto, retornar array vazio se Unsplash falhar
      return [];
    } catch (error) {
      console.error('Erro ao buscar imagens:', error.message);
      return [];
    }
  }

  /**
   * Busca imagens usando Bing Image Search (mais permissivo que Google)
   */
  static async buscarImagensPexels(query) {
    try {
      console.log('Buscando imagens no Bing para:', query);

      // Bing Image Search - mais permissivo que Google
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=10`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': 'https://www.bing.com/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const imagens = [];

      // Método 1: Extrair de atributo m (metadata JSON do Bing)
      $('a.iusc').each((i, elem) => {
        if (imagens.length >= 5) return false;

        const m = $(elem).attr('m');
        if (m) {
          try {
            const metadata = JSON.parse(m);
            if (metadata.murl) {
              imagens.push({
                url: metadata.murl,
                thumbnail: metadata.turl || metadata.murl,
                descricao: metadata.t || `Imagem relacionada a ${query}`,
                fonte: 'Bing Images'
              });
            }
          } catch (e) {
            // Ignorar erros de parse
          }
        }
      });

      console.log('Imagens do Bing encontradas:', imagens.length);

      if (imagens.length > 0) {
        return imagens;
      }

      // Método 2: Fallback - extrair de tags img
      $('img.mimg').each((i, elem) => {
        if (imagens.length >= 5) return false;

        const src = $(elem).attr('src');
        if (src && src.startsWith('http')) {
          imagens.push({
            url: src,
            thumbnail: src,
            descricao: `Imagem relacionada a ${query}`,
            fonte: 'Bing Images'
          });
        }
      });

      console.log('Total de imagens encontradas:', imagens.length);

      if (imagens.length > 0) {
        return imagens;
      }

      // Se não encontrou imagens do Google, usar fallback
      console.log('Nenhuma imagem encontrada no Google, usando fallback...');

      // Fallback: usar Picsum
      const imagensFallback = [];
      for (let i = 0; i < 5; i++) {
        const randomId = 100 + Math.floor(Math.random() * 900);
        imagensFallback.push({
          url: `https://picsum.photos/800/600?random=${randomId}`,
          thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
          descricao: `Imagem ${i + 1}`,
          fonte: 'Picsum'
        });
      }
      return imagensFallback;

    } catch (error) {
      console.error('Erro ao buscar imagens do Google:', error.message);

      // Fallback: retornar imagens do Picsum
      try {
        console.log('Usando imagens genéricas de fallback (Picsum)');
        const imagens = [];

        for (let i = 0; i < 5; i++) {
          const randomId = 200 + Math.floor(Math.random() * 800);
          imagens.push({
            url: `https://picsum.photos/800/600?random=${randomId}`,
            thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
            descricao: `Imagem ${i + 1}`,
            fonte: 'Picsum'
          });
        }

        console.log('Imagens fallback geradas:', imagens.length);
        return imagens;
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError.message);
        // Retornar array vazio como último recurso
        return [];
      }
    }
  }

  /**
   * Busca imagens usando Google Custom Search API
   */
  static async buscarImagensGoogle(query) {
    try {
      // Limpar e preparar a query
      let cleanQuery = query
        .replace(/TEXTO DA POSTAGEM \(LEGENDA\):/gi, '')
        .replace(/CONTEÚDO DO VÍDEO \(TRANSCRITO\):/gi, '')
        .replace(/📱/g, '')
        .replace(/AUTOR:/gi, '')
        .replace(/-\s*\w+\s+no\s+\w+\s+\d+,\s+\d{4}:/gi, '') // Remove "- username no Month DD, YYYY:"
        .replace(/\d+\s+(Likes|Comments|Followers|Following)/gi, '')
        .replace(/@\w+/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/["""]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Limitar a 100 caracteres (limite seguro para Google Custom Search)
      if (cleanQuery.length > 100) {
        cleanQuery = cleanQuery.substring(0, 100).trim();
      }

      // Se ficou muito curto ou vazio, usar fallback genérico
      if (cleanQuery.length < 5) {
        cleanQuery = 'igreja gospel evangélico';
      }

      // Adicionar contexto gospel se não tiver palavras-chave relacionadas
      const temContextoGospel = /igreja|pastor|gospel|evangélic|cristã|culto|assembleia|deus|jesus|bíblia/i.test(cleanQuery);
      if (!temContextoGospel && cleanQuery.length < 80) {
        cleanQuery = cleanQuery + ' gospel';
      }

      console.log('Query limpa para Google:', cleanQuery.substring(0, 100));

      // Configurar credenciais do Google Custom Search
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      const GOOGLE_CX = process.env.GOOGLE_CX;

      if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        console.log('⚠️ Google API não configurada, usando fallback Picsum');
        throw new Error('GOOGLE_API_KEY ou GOOGLE_CX não configuradas');
      }

      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(cleanQuery)}&searchType=image&num=10&imgSize=large&safe=active`;

      const response = await axios.get(searchUrl, {
        timeout: 15000
      });

      const imagens = [];

      if (response.data && response.data.items) {
        for (const item of response.data.items) {
          if (imagens.length >= 10) break;

          // Preferir thumbnailLink que é sempre uma imagem válida
          // O item.link pode ser uma página HTML
          const imageUrl = item.image?.thumbnailLink || item.link;
          
          // Validar se a URL parece ser uma imagem
          // URLs do Google (gstatic.com, googleusercontent.com) são sempre válidas
          const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(imageUrl) || 
                                  imageUrl.includes('googleusercontent.com') ||
                                  imageUrl.includes('ggpht.com') ||
                                  imageUrl.includes('gstatic.com');

          if (isValidImageUrl) {
            imagens.push({
              url: imageUrl,
              thumbnail: item.image?.thumbnailLink || imageUrl,
              descricao: item.title || `Imagem relacionada a ${query}`,
              fonte: item.displayLink || 'Google Images'
            });
          } else {
            console.log('⚠️ URL ignorada (não é imagem direta):', imageUrl.substring(0, 100));
          }
        }
      }

      console.log('Imagens do Google encontradas:', imagens.length);

      if (imagens.length > 0) {
        return imagens;
      }

      // Fallback: usar Picsum se não encontrar nada
      console.log('Nenhuma imagem encontrada no Google, usando fallback...');
      const imagensFallback = [];
      for (let i = 0; i < 5; i++) {
        const randomId = 300 + Math.floor(Math.random() * 700);
        imagensFallback.push({
          url: `https://picsum.photos/800/600?random=${randomId}`,
          thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
          descricao: `Imagem ${i + 1}`,
          fonte: 'Picsum'
        });
      }
      return imagensFallback;

    } catch (error) {
      console.error('Erro ao buscar imagens no Google:', error.message);

      // Fallback: retornar imagens do Picsum
      try {
        console.log('Usando imagens genéricas de fallback (Picsum)');
        const imagens = [];

        for (let i = 0; i < 5; i++) {
          const randomId = 400 + Math.floor(Math.random() * 600);
          imagens.push({
            url: `https://picsum.photos/800/600?random=${randomId}`,
            thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
            descricao: `Imagem ${i + 1}`,
            fonte: 'Picsum'
          });
        }

        console.log('Imagens fallback geradas:', imagens.length);
        return imagens;
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError.message);
        return [];
      }
    }
  }

  /**
   * Extrai palavras-chave principais de um título para busca de imagens
   */
  static extrairPalavrasChave(titulo) {
    // Palavras a remover (conectores, artigos, etc)
    const stopWords = [
      'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
      'com', 'para', 'por', 'que', 'e', 'um', 'uma', 'uns', 'umas', 'ao', 'à', 'aos', 'às',
      'pelo', 'pela', 'pelos', 'pelas', 'seu', 'sua', 'seus', 'suas', 'após', 'sobre',
      'durante', 'entre', 'sem', 'sob', 'até', 'desde', 'quando', 'onde', 'como', 'porque',
      'mas', 'ou', 'se', 'já', 'mais', 'muito', 'muita', 'muitos', 'muitas', 'todo', 'toda',
      'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
      'qual', 'quais', 'quanto', 'quanta', 'quantos', 'quantas', 'esse', 'essa', 'esses', 'essas',
      'este', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
      'jovem', 'nova', 'novo', 'novas', 'novos', 'brasil', 'brasileira', 'brasileiro', 'brasileiras', 'brasileiros'
    ];

    // Remover pontuação e converter para minúsculas
    let palavras = titulo
      .toLowerCase()
      .replace(/[:\-–—,;.!?()[\]{}'"]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length > 2 && !stopWords.includes(p));

    // Priorizar nomes próprios (começam com maiúscula no título original)
    const palavrasOriginais = titulo.split(/\s+/);
    const nomeProprio = [];

    for (let i = 0; i < palavrasOriginais.length; i++) {
      const palavra = palavrasOriginais[i];
      // Se começa com maiúscula e não é a primeira palavra (que sempre é maiúscula)
      if (i > 0 && palavra.length > 2 && palavra[0] === palavra[0].toUpperCase()) {
        nomeProprio.push(palavra);
        // Se próxima palavra também é maiúscula, adicionar (nome composto)
        if (i + 1 < palavrasOriginais.length &&
          palavrasOriginais[i + 1][0] === palavrasOriginais[i + 1][0].toUpperCase()) {
          nomeProprio.push(palavrasOriginais[i + 1]);
          i++; // Pular próxima
        }
      }
    }

    // Se encontrou nome próprio, usar ele + primeiras palavras relevantes
    if (nomeProprio.length > 0) {
      const nomeCompleto = nomeProprio.join(' ');
      const palavrasExtras = palavras.slice(0, 2).join(' ');
      return `${nomeCompleto} ${palavrasExtras}`.trim().substring(0, 100);
    }

    // Caso contrário, pegar as 3-4 primeiras palavras relevantes
    return palavras.slice(0, 4).join(' ').substring(0, 100);
  }

  /**
   * Cria uma matéria baseada em texto colado (Instagram, Facebook, etc)
   */
  static async criarMateriaPorTexto(texto, categoria = 'Notícias', linkReferencia = '') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    // Buscar imagens baseadas no texto
    console.log('Buscando imagens baseadas no texto fornecido');

    // Limpar o texto de metadados e ruído
    let textoLimpo = texto
      .replace(/\d+,?\d* likes,/g, '') // Remove "5,044 likes,"
      .replace(/\d+,?\d* comments/g, '') // Remove "818 comments"
      .replace(/@\w+/g, '') // Remove @mentions
      .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove datas
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    const palavrasParaImagem = textoLimpo.substring(0, 300);
    console.log('Palavras-chave para busca de imagens:', palavrasParaImagem.substring(0, 100) + '...');

    const imagensSugeridas = await this.buscarImagensGoogle(palavrasParaImagem);

    const prompt = `Você é um jornalista sênior do portal G1, especializado em notícias do mundo gospel.
    
⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo G1 baseada EXCLUSIVAMENTE no texto fornecido abaixo.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS cite a fonte de maneira robótica. Se precisar citar, faça naturalmente: "Em publicação nas redes sociais, afirmou..."
- ❌ JAMAIS descreva a mídia de forma técnica ("A imagem mostra...", "O vídeo exibe..."). Descreva diretamente: "No vídeo, o pastor aparece..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ❌ JAMAIS termine com perguntas ou chamadas para ação ("E você, o que acha?")

✅ O QUE VOCÊ DEVE FAZER:
1. ✅ Use APENAS as informações que estão no texto original fornecido
2. ✅ Reorganize essas informações em estrutura jornalística profissional
3. ✅ Melhore a fluidez e conectivos entre as frases
4. ✅ Use sinônimos mantendo o sentido exato
5. ✅ Torne o texto mais humanizado e próximo do leitor
6. ✅ Se houver citações no original, mantenha-as exatamente como estão
7. ✅ Se NÃO houver citações, NÃO invente nenhuma
8. ✅ Transforme "Segundo o post, Pereira afirmou" em "O pastor Marcos Pereira afirmou"

📏 TAMANHO DO CONTEÚDO:
- Escreva APENAS com base no que foi fornecido
- Se o texto original é curto, a matéria será curta (200-400 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTILO JORNALÍSTICO G1 - HUMANIZADO:
- Escreva como se você estivesse cobrindo o fato presencialmente
- Use uma narrativa envolvente, com parágrafos bem conectados
- Mantenha a objetividade, mas com fluidez (evite frases robóticas)
- Use conectivos variados para dar fluidez ao texto
- Organize em: Lide (o que, quem, quando, onde), Contexto, Detalhes e Repercussão

CATEGORIA: ${categoria}
${linkReferencia ? `LINK DE REFERÊNCIA: ${linkReferencia}` : ''}

TEXTO FORNECIDO (USE APENAS ISSO):
${texto}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e claro (estilo G1)

2. DESCRIÇÃO (máximo 160 caracteres):
   - Resumo objetivo e instigante do conteúdo

3. CONTEÚDO EM HTML:
   - Use tags: <p>, <h2>, <h3>, <strong>, <em>, <blockquote>
   - Introdução impactante (Lide)
   - Desenvolvimento fluido com os detalhes disponíveis
   - Citações diretas entre aspas ou em blockquote (SE HOUVER)
   - Conclusão jornalística (impacto ou desdobramento)
   - Use <br> para quebras de linha (apenas uma vez)

⚠️ LEMBRE-SE: É MELHOR uma matéria fiel ao texto fornecido do que uma matéria longa com informações inventadas!

IMPORTANTE: Retorne APENAS um objeto JSON válido no formato:
{
  "titulo": "título da matéria",
  "descricao": "descrição curta",
  "conteudo": "HTML completo em uma única linha"
}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente especializado em criar conteúdo jornalístico gospel de alta qualidade baseado em textos fornecidos, sem inventar informações.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Temperatura 0.3 (baixa) para ser mais fiel ao conteúdo e evitar invenções
    const response = await this.makeRequest(messages, 0.3, 3000);

    // Parse da resposta
    try {
      let jsonStr = response.trim();

      // Remover blocos de código markdown se houver
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      // Remover quebras de linha dentro do JSON
      jsonStr = jsonStr.replace(/\n/g, ' ');

      // Tentar parsear
      const resultado = JSON.parse(jsonStr);

      // Extrair palavras-chave do título e buscar imagens
      const palavrasChave = this.extrairPalavrasChave(resultado.titulo);
      console.log('🔍 Título completo:', resultado.titulo);
      console.log('🔑 Palavras-chave extraídas:', palavrasChave);
      console.log('📸 Buscando imagens no Google...');

      const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

      // Adicionar imagens sugeridas (prioriza as baseadas no título)
      resultado.imagensSugeridas = imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas;

      return resultado;
    } catch (error) {
      console.error('Erro ao parsear JSON:', error);
      console.log('Resposta da IA:', response);

      // Tentar extrair manualmente
      const tituloMatch = response.match(/"titulo":\s*"([^"]+)"/);
      const descricaoMatch = response.match(/"descricao":\s*"([^"]+)"/);
      const conteudoMatch = response.match(/"conteudo":\s*"([\s\S]+?)"\s*}/);

      if (tituloMatch && descricaoMatch && conteudoMatch) {
        // Extrair palavras-chave e buscar imagens
        const palavrasChave = this.extrairPalavrasChave(tituloMatch[1]);
        console.log('🔍 Título extraído:', tituloMatch[1]);
        console.log('🔑 Palavras-chave:', palavrasChave);
        const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

        return {
          titulo: tituloMatch[1],
          descricao: descricaoMatch[1],
          conteudo: conteudoMatch[1],
          imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
        };
      }

      throw new Error('Não foi possível processar a resposta da IA');
    }
  }

  /**
   * Cria uma matéria completa baseada em um tema
   */
  static async criarMateria(tema, categoria = 'Notícias', palavrasChave = '', pesquisarInternet = false, links = []) {
    console.log('🎬 INÍCIO criarMateria');
    console.log('Tema:', tema.substring(0, 100));
    console.log('Categoria:', categoria);
    console.log('PesquisarInternet:', pesquisarInternet);
    console.log('Links:', links);

    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log('✅ IA está ativa');

    // Coletar informações adicionais
    let informacoesAdicionais = '';
    let imagensSugeridas = [];
    console.log('📋 Variáveis inicializadas');

    // Pesquisar na internet se solicitado
    if (pesquisarInternet) {
      console.log('Pesquisando notícias atuais:', tema);

      // Buscar notícias atuais do Google News
      const noticias = await this.buscarNoticiasAtuais(tema + ' gospel evangélico');
      if (noticias.length > 0) {
        informacoesAdicionais += '\n\nNOTÍCIAS ATUAIS (Google News):\n';
        noticias.forEach((n, i) => {
          informacoesAdicionais += `${i + 1}. ${n.titulo}\n`;
          informacoesAdicionais += `   ${n.descricao}\n`;
          informacoesAdicionais += `   Data: ${n.data}\n\n`;
        });
      }

      // Buscar também no DuckDuckGo como fallback
      const resultados = await this.pesquisarInternet(tema + ' gospel evangélico');
      if (resultados.length > 0) {
        informacoesAdicionais += '\n\nINFORMAÇÕES ADICIONAIS:\n';
        resultados.forEach((r, i) => {
          informacoesAdicionais += `${i + 1}. ${r.titulo}\n${r.snippet}\n\n`;
        });
      }

      // Buscar imagens sugeridas
      console.log('Buscando imagens sugeridas:', tema);
      const imagensGoogle = await this.buscarImagensGoogle(tema);
      if (imagensGoogle.length > 0) {
        imagensSugeridas = imagensGoogle;
      } else {
        // Fallback para Unsplash
        const imagensUnsplash = await this.buscarImagensSugeridas(tema);
        if (imagensUnsplash.length > 0) {
          imagensSugeridas = imagensUnsplash;
        }
      }
    }

    // Extrair conteúdo dos links fornecidos
    let conteudoExtraido = '';
    let imagemExtraida = null;
    if (links && links.length > 0) {
      console.log('Extraindo conteúdo de', links.length, 'links');

      for (const link of links) {
        const resultado = await this.extrairConteudoURL(link);
        if (resultado && resultado.texto) {
          conteudoExtraido += `\n${resultado.texto}\n\n`;

          // Se encontrou imagem e ainda não tem uma, guardar
          if (resultado.imagem && !imagemExtraida) {
            imagemExtraida = resultado.imagem;
            console.log('📸 Imagem destaque encontrada no link:', imagemExtraida);
          }
        }
      }

      // Verificar se a extração falhou (retornou mensagem de erro)
      if (conteudoExtraido.includes('Não foi possível extrair o conteúdo automaticamente')) {
        throw new Error('Não foi possível extrair o conteúdo do link automaticamente. Por favor, use a aba "Por Link" e cole o texto manualmente no campo opcional.');
      }

      // Se tem conteúdo extraído, adicionar com destaque
      if (conteudoExtraido && conteudoExtraido.length > 100) {
        informacoesAdicionais += '\n\n⚠️ IMPORTANTE - USE ESTE CONTEÚDO COMO BASE PRINCIPAL:\n';
        informacoesAdicionais += `Fonte: ${links[0]}\n${conteudoExtraido}`;

        // Buscar imagens baseadas no conteúdo extraído
        if (!pesquisarInternet) {
          console.log('Buscando imagens baseadas no conteúdo extraído');

          // Extrair palavras-chave mais relevantes do conteúdo
          let textoLimpo = conteudoExtraido
            .replace(/📱 CONTEÚDO DO INSTAGRAM:/g, '')
            .replace(/TEXTO DA POSTAGEM:/g, '')
            .replace(/AUTOR:/g, '')
            .replace(/COMENTÁRIOS DESTACADOS:/g, '')
            .replace(/\d+,?\d* likes,/g, '') // Remove "5,044 likes,"
            .replace(/\d+,?\d* comments/g, '') // Remove "818 comments"
            .replace(/@\w+/g, '') // Remove @mentions
            .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove datas
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();

          // Pegar as primeiras palavras significativas (após limpeza)
          const palavrasParaImagem = textoLimpo.substring(0, 300);

          console.log('Palavras-chave para busca de imagens:', palavrasParaImagem.substring(0, 100) + '...');

          const imagensGoogle = await this.buscarImagensGoogle(palavrasParaImagem);
          if (imagensGoogle.length > 0) {
            imagensSugeridas = imagensGoogle;
          }

          // Se extraiu imagem do artigo, adicionar como primeira sugestão
          if (imagemExtraida) {
            console.log('✅ Adicionando imagem extraída do artigo como primeira sugestão');
            imagensSugeridas.unshift({
              url: imagemExtraida,
              thumbnail: imagemExtraida,
              descricao: 'Imagem destaque do artigo original',
              fonte: 'Artigo Original'
            });
          }
        }
      } else if (links.length > 0) {
        // Se não conseguiu extrair nada útil
        throw new Error('Não foi possível extrair conteúdo suficiente do link. Por favor, use a aba "Por Link" e cole o texto manualmente.');
      }
    }

    console.log('📝 Conteúdo extraído:', conteudoExtraido.length, 'caracteres');
    console.log('🖼️ Imagem extraída:', imagemExtraida ? 'SIM' : 'NÃO');
    console.log('📸 Imagens sugeridas até agora:', imagensSugeridas.length);

    // Ajustar prompt baseado se tem conteúdo extraído ou não
    let promptInstrucao = '';
    console.log('🔨 Construindo prompt...');
    if (conteudoExtraido) {
      promptInstrucao = `Você é um jornalista sênior do portal G1, especializado em notícias do mundo gospel.
      
⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo G1 baseada EXCLUSIVAMENTE no conteúdo fornecido abaixo.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ NÃO adicione informações sobre "velório", "sepultamento", "horários" se NÃO foram citados
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS cite a fonte de maneira robótica. Se precisar citar, faça naturalmente: "Em publicação nas redes sociais, afirmou..."
- ❌ JAMAIS descreva a mídia de forma técnica ("A imagem mostra...", "O vídeo exibe..."). Descreva diretamente: "No vídeo, o pastor aparece..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ❌ JAMAIS termine com perguntas ou chamadas para ação ("E você, o que acha?")

✅ O QUE VOCÊ DEVE FAZER:
1. ✅ Use APENAS as informações que estão no texto original fornecido
2. ✅ Reorganize essas informações em estrutura jornalística profissional
3. ✅ Melhore a fluidez e conectivos entre as frases
4. ✅ Use sinônimos mantendo o sentido exato
5. ✅ Torne o texto mais humanizado e próximo do leitor
6. ✅ Se houver citações no original, mantenha-as exatamente como estão
7. ✅ Se NÃO houver citações, NÃO invente nenhuma
8. ✅ Transforme "Segundo o post, Pereira afirmou" em "O pastor Marcos Pereira afirmou"
9. ✅ Transforme "A publicação obteve comentários" em "A declaração gerou debate nas redes sociais"

📏 TAMANHO DO CONTEÚDO:
- Escreva APENAS com base no que foi fornecido
- Se o texto original é curto, a matéria será curta (200-400 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTILO JORNALÍSTICO G1 - HUMANIZADO:
- Escreva como se você estivesse cobrindo o fato presencialmente
- Use uma narrativa envolvente, com parágrafos bem conectados
- Mantenha a objetividade, mas com fluidez (evite frases robóticas)
- Use conectivos variados para dar fluidez ao texto
- Organize em: Lide (o que, quem, quando, onde), Contexto, Detalhes e Repercussão`;
    } else {
      promptInstrucao = `Você é um jornalista sênior do portal G1, especializado em notícias do mundo gospel.
      
⚠️ IMPORTANTE: Crie uma matéria jornalística sobre o tema abaixo.

🚨 REGRAS IMPORTANTES:
- ✅ Use informações gerais e conhecimento público sobre o tema
- ✅ Mantenha um tom jornalístico profissional e humanizado
- ✅ Se você NÃO tem informações específicas sobre o tema, seja genérico mas factual
- ❌ NÃO invente números específicos, datas ou eventos que você não tem certeza
- ❌ NÃO invente declarações ou citações de pessoas específicas
- ❌ NÃO especule sobre quantidades ("500 pessoas", "milhares de fiéis") sem base
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas"
- ❌ JAMAIS use meta-linguagem: "Segundo informações...", "Baseado em..."
- ❌ JAMAIS termine com perguntas ou chamadas para ação ("E você, o que acha?")

✅ O QUE VOCÊ PODE FAZER:
1. ✅ Escrever sobre o tema de forma geral e contextual
2. ✅ Usar conhecimento público sobre o assunto
3. ✅ Manter tom jornalístico profissional
4. ✅ Ser objetivo e direto
5. ✅ Se mencionar pessoas, use apenas informações públicas conhecidas

📏 TAMANHO DO CONTEÚDO:
- Matéria de tamanho médio (300-500 palavras)
- Não force expansão artificial
- Seja conciso e direto

ESTILO JORNALÍSTICO G1 - HUMANIZADO:
- Escreva como se você estivesse cobrindo o fato presencialmente
- Use uma narrativa envolvente, com parágrafos bem conectados
- Mantenha a objetividade, mas com fluidez (evite frases robóticas)
- Use conectivos variados para dar fluidez ao texto
- Organize em: Lide (o que, quem, quando, onde), Contexto, Detalhes e Repercussão`;
    }

    const prompt = `${promptInstrucao}

TEMA: ${tema}
CATEGORIA: ${categoria}
${palavrasChave ? `PALAVRAS-CHAVE: ${palavrasChave}` : ''}
${informacoesAdicionais ? `\n${informacoesAdicionais}` : ''}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e claro (estilo G1)
   - Direto ao ponto

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Breve introdução reforçando os principais fatos
   - Linguagem simples e direta

3. CONTEÚDO HTML:

   a) LIDE (1-2 parágrafos):
      - Fato principal de forma clara e impactante
      - O que, quem, quando, onde (baseado nas informações disponíveis)

   b) DESENVOLVIMENTO (conforme conteúdo disponível):
      - Detalhes e contexto
      - Use <h3> para subtítulos APENAS se fizer sentido
      - Mantenha parágrafos curtos (3-4 linhas)

   c) CITAÇÕES (SE HOUVER):
      - Use <blockquote> para citações que existem no conteúdo
      - NÃO invente citações se não houver

   d) CONCLUSÃO (1 parágrafo):
      - Encerramento jornalístico
      - Impacto ou repercussão (se mencionado)
      - EVITE: "hora de repensar", "chamado à reflexão"
      - PREFIRA: "A notícia repercutiu", "O caso comoveu"

FORMATAÇÃO HTML:
- Use <p>texto</p> para CADA parágrafo
- Use <br> (UMA quebra apenas) entre parágrafos para espaçamento
- Use <h3>Subtítulo</h3> para subtítulos (se necessário)
- Use <blockquote>citação</blockquote> para citações (se houver)
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><br><p>texto2</p><br><h3>título</h3><br><p>texto3</p>


⚠️ LEMBRE-SE: É MELHOR uma matéria fiel ao conteúdo disponível do que uma matéria longa com informações inventadas!

TAGS HTML PERMITIDAS: <p>, <h2>, <h3>, <strong>, <em>, <blockquote>, <ul>, <li>, <br>

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha com <br> entre parágrafos"}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente especializado em criar conteúdo jornalístico gospel de alta qualidade.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    console.log('🤖 Fazendo requisição para a IA...');
    // Temperatura 0.3 (baixa) para ser mais fiel ao conteúdo e evitar invenções
    const response = await this.makeRequest(messages, 0.3, 3000);
    console.log('✅ Resposta recebida da IA (primeiros 200 chars):', response.substring(0, 200));

    try {
      // Limpar a resposta removendo markdown code blocks se existirem
      let cleanResponse = response.trim();

      // Remover ```json e ``` se existirem
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      // Tentar extrair JSON da resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Tentar parsear diretamente primeiro
        try {
          const parsed = JSON.parse(jsonStr);

          // Validar se tem os campos necessários
          if (parsed.titulo && parsed.descricao && parsed.conteudo) {
            // Extrair palavras-chave do título e buscar imagens
            const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
            console.log('🔍 Título completo:', parsed.titulo);
            console.log('🔑 Palavras-chave extraídas:', palavrasChave);
            console.log('📸 Buscando imagens no Google...');

            const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

            // Adicionar embed do Instagram se houver link de referência
            let conteudoFinal = parsed.conteudo;
            console.log('🔗 Links recebidos:', links);

            // Verificar se o conteúdo já contém um embed do Instagram
            const jaTemEmbed = conteudoFinal.includes('instagram-media') || conteudoFinal.includes('instagram.com/p/');

            if (!jaTemEmbed && links && links.length > 0 && links[0].includes('instagram.com')) {
              console.log('📱 Adicionando embed do Instagram:', links[0]);
              const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${links[0]}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;

              // Adicionar embed no final do conteúdo
              conteudoFinal += embedCode;
              console.log('✅ Embed adicionado ao conteúdo');
            } else if (jaTemEmbed) {
              console.log('ℹ️ Conteúdo já contém embed do Instagram, pulando adição');
            } else {
              console.log('⚠️ Nenhum link do Instagram encontrado');
            }

            // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
            const resultado = {
              ...parsed,
              conteudo: conteudoFinal,
              imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
            };

            // Log para debug
            console.log('📝 Conteúdo final contém embed?', conteudoFinal.includes('instagram-media'));
            console.log('📏 Tamanho do conteúdo:', conteudoFinal.length);

            return resultado;
          }
        } catch (parseError) {
          // Se falhar, tentar limpar quebras de linha dentro das strings
          console.log('Primeira tentativa de parse falhou, tentando limpar...');

          // Remover TODAS as quebras de linha do JSON
          jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');

          // Limpar múltiplos espaços
          jsonStr = jsonStr.replace(/\s+/g, ' ');

          // Tentar parsear novamente
          try {
            const parsed = JSON.parse(jsonStr);

            // Validar se tem os campos necessários
            if (parsed.titulo && parsed.descricao && parsed.conteudo) {
              // Extrair palavras-chave do título e buscar imagens
              const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
              console.log('🔍 Título completo (2ª tentativa):', parsed.titulo);
              console.log('🔑 Palavras-chave extraídas:', palavrasChave);
              console.log('📸 Buscando imagens no Google...');

              const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

              // Adicionar embed do Instagram se houver link de referência
              let conteudoFinal = parsed.conteudo;
              console.log('🔗 Links recebidos (2ª tentativa):', links);

              // Verificar se o conteúdo já contém um embed do Instagram
              const jaTemEmbed = conteudoFinal.includes('instagram-media') || conteudoFinal.includes('instagram.com/p/');

              if (!jaTemEmbed && links && links.length > 0 && links[0].includes('instagram.com')) {
                console.log('📱 Adicionando embed do Instagram (2ª tentativa):', links[0]);
                const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${links[0]}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;

                // Adicionar embed no final do conteúdo
                conteudoFinal += embedCode;
                console.log('✅ Embed adicionado ao conteúdo (2ª tentativa)');
              } else if (jaTemEmbed) {
                console.log('ℹ️ Conteúdo já contém embed do Instagram (2ª tentativa), pulando adição');
              } else {
                console.log('⚠️ Nenhum link do Instagram encontrado (2ª tentativa)');
              }

              // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
              const resultado = {
                ...parsed,
                conteudo: conteudoFinal,
                imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
              };

              // Log para debug
              console.log('📝 Conteúdo final contém embed? (2ª tentativa)', conteudoFinal.includes('instagram-media'));
              console.log('📏 Tamanho do conteúdo: (2ª tentativa)', conteudoFinal.length);

              return resultado;
            }
          } catch (secondError) {
            console.error('Segunda tentativa falhou:', secondError.message);

            // Última tentativa: extrair manualmente
            try {
              const tituloMatch = jsonStr.match(/"titulo"\s*:\s*"([^"]+)"/);
              const descricaoMatch = jsonStr.match(/"descricao"\s*:\s*"([^"]+)"/);
              const conteudoMatch = jsonStr.match(/"conteudo"\s*:\s*"(.+)"\s*\}/);

              if (tituloMatch && descricaoMatch && conteudoMatch) {
                // Extrair palavras-chave e buscar imagens
                const palavrasChave = this.extrairPalavrasChave(tituloMatch[1]);
                console.log('🔍 Título extraído manualmente:', tituloMatch[1]);
                console.log('🔑 Palavras-chave:', palavrasChave);
                console.log('📸 Buscando imagens no Google...');

                const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

                return {
                  titulo: tituloMatch[1],
                  descricao: descricaoMatch[1],
                  conteudo: conteudoMatch[1],
                  imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
                };
              }
            } catch (manualError) {
              console.error('Extração manual falhou:', manualError.message);
            }
          }
        }
      }

      throw new Error('Resposta da IA não está no formato esperado');
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error.message);
      console.error('Resposta recebida (primeiros 500 chars):', response.substring(0, 500));
      throw new Error('Erro ao processar resposta da IA');
    }
  }

  /**
   * Corrige erros de português em um texto
   */
  static async corrigirTexto(texto, tipo = 'conteudo') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const tipoTexto = {
      'titulo': 'título',
      'descricao': 'descrição',
      'conteudo': 'conteúdo'
    }[tipo] || 'texto';

    const prompt = `Você é um revisor de textos especializado em português brasileiro.

          Corrija o seguinte ${tipoTexto}, mantendo o sentido original:

          ${texto}

          REGRAS:
          - Corrija erros de ortografia, gramática e pontuação
          - Melhore a clareza e fluidez do texto
          - Mantenha o tom e estilo original
          - Se for HTML, preserve todas as tags
          - Não adicione informações novas
          - Retorne APENAS o texto corrigido, sem explicações

          TEXTO CORRIGIDO:`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um revisor profissional de textos em português brasileiro.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.makeRequest(messages, 0.3, 2000);
  }

  /**
   * Gera sugestões de título baseado no conteúdo
   */
  static async sugerirTitulos(conteudo, quantidade = 3) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const prompt = `Com base no seguinte conteúdo, sugira ${quantidade} títulos atrativos e informativos (máximo 80 caracteres cada):

          ${conteudo.substring(0, 500)}...

          Retorne APENAS os títulos, um por linha, sem numeração.`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em criar títulos jornalísticos atrativos.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.makeRequest(messages, 0.8, 500);
    return response.split('\n').filter(t => t.trim()).slice(0, quantidade);
  }

  /**
   * Gera uma descrição/resumo baseado no conteúdo
   */
  static async gerarDescricao(conteudo) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const prompt = `Crie uma descrição curta e atrativa (máximo 160 caracteres) para o seguinte conteúdo:

          ${conteudo.substring(0, 500)}...

          Retorne APENAS a descrição, sem explicações.`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em criar descrições concisas e atrativas.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.makeRequest(messages, 0.7, 200);
  }

  /**
   * Processa múltiplos posts do Instagram e gera matérias
   * @param {Array} posts - Array de posts do Instagram
          * @param {string} categoria - Categoria das matérias
          */
  static async processarPostsEmLote(posts, categoria = 'Notícias') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log(`🚀 Processando ${posts.length} posts em lote...`);
    console.log('📊 Posts recebidos:', JSON.stringify(posts, null, 2));
    const materias = [];
    const erros = [];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      try {
        const postId = post.shortcode || post.id || post.url || `post-${i}`;
        console.log(`\n📝 Processando post ${i + 1}/${posts.length}: ${postId}`);
        console.log('📄 Dados do post:', JSON.stringify(post, null, 2));

        // Verificar se o post tem conteúdo suficiente
        if (!post.caption || post.caption.trim().length < 50) {
          console.log(`⚠️ Post ${postId} ignorado: texto muito curto (${post.caption?.length || 0} caracteres)`);
          erros.push({
            post: post,
            erro: 'Texto da postagem muito curto (mínimo 50 caracteres)'
          });
          continue;
        }

        // Validar qualidade do caption (evitar apenas hashtags/emojis)
        const captionLimpo = post.caption.replace(/[#@\u{1F300}-\u{1F9FF}]/gu, '').trim();
        if (captionLimpo.length < 50) {
          console.log(`⚠️ Post ${postId} ignorado: caption sem conteúdo significativo (apenas hashtags/emojis)`);
          erros.push({
            post: post,
            erro: 'Caption sem conteúdo textual suficiente (apenas hashtags/emojis)'
          });
          continue;
        }

        // Log do conteúdo que será enviado para a IA
        console.log('📋 Caption do post (primeiros 300 chars):', post.caption.substring(0, 300));
        console.log('📏 Tamanho do caption:', post.caption.length, 'caracteres');
        console.log('🧹 Caption limpo (sem hashtags/emojis):', captionLimpo.length, 'caracteres');

        // Criar matéria usando o prompt do estilo G1 (mesmo usado em "Reescrever Matéria")
        const materia = await this.gerarMateriaEstiloG1(
          post.caption, // conteúdo do post
          categoria,
          post.url // link do post como referência
        );

        // Priorizar imagem do Instagram se disponível
        let imagensSugeridas = materia.imagensSugeridas || [];

        // Se o post tem thumbnail, tentar baixar e adicionar como primeira opção
        if (post.thumbnail) {
          console.log(`📸 Baixando imagem do Instagram: ${post.thumbnail.substring(0, 80)}...`);

          try {
            // Baixar imagem diretamente no serviço ao invés de chamar API
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');
            const sharp = require('sharp');
            const { Media } = require('../models');

            // Baixar a imagem
            const response = await axios.get(post.thumbnail, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://www.instagram.com/',
                'Origin': 'https://www.instagram.com'
              },
              timeout: 15000
            });

            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const randomStr = Math.round(Math.random() * 1E9);
            const webpFilename = `instagram-${timestamp}-${randomStr}.webp`;
            const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
            const webpPath = path.join(uploadDir, webpFilename);

            // Criar diretório se não existir
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Converter para WebP e salvar
            await sharp(response.data)
              .webp({ quality: 85 })
              .toFile(webpPath);

            // Pegar tamanho do arquivo
            const stats = fs.statSync(webpPath);
            const fileSize = stats.size;

            const publicUrl = `/uploads/${webpFilename}`;
            console.log(`✅ Imagem baixada e salva: ${publicUrl}`);

            // Salvar na biblioteca de mídia
            try {
              const media = await Media.create({
                nome: webpFilename,
                nomeOriginal: `Instagram - ${materia.titulo.substring(0, 50)}`,
                tipo: 'imagem',
                mimeType: 'image/webp',
                tamanho: fileSize,
                url: publicUrl,
                userId: 3 // ID do admin (atualizado para 3 pois 1 não existe mais)
              });
              console.log(`✅ Imagem salva na biblioteca de mídia: ID ${media.id}`);
            } catch (dbError) {
              console.error('⚠️ Erro ao salvar na biblioteca, mas arquivo foi salvo:', dbError.message);
            }

            imagensSugeridas.unshift({
              url: publicUrl,
              descricao: 'Imagem original do post do Instagram',
              origem: 'instagram',
              local: true
            });
          } catch (error) {
            console.log(`⚠️ Erro ao baixar imagem: ${error.message}, usando URL direta`);
            imagensSugeridas.unshift({
              url: post.thumbnail,
              descricao: 'Imagem original do post do Instagram',
              origem: 'instagram'
            });
          }
        }

        console.log(`🖼️ Total de imagens disponíveis: ${imagensSugeridas.length} (Instagram: ${post.thumbnail ? 'Sim' : 'Não'})`);

        // Adicionar informações do post original
        materias.push({
          ...materia,
          imagensSugeridas, // Imagens com Instagram em primeiro
          instagramPostId: post.id || post.url, // ID do post para tracking
          postOriginal: {
            url: post.url,
            shortcode: post.shortcode,
            likes: post.likes,
            comments: post.comments,
            timestamp: post.timestamp,
            thumbnail: post.thumbnail
          },
          status: 'gerada'
        });

        console.log(`✅ Matéria ${i + 1} gerada com sucesso: ${materia.titulo}`);

        // Aguardar 2 segundos entre requisições para não sobrecarregar a API
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const postId = post.shortcode || post.id || post.url || `post-${i}`;
        console.error(`❌ Erro ao processar post ${postId}:`, error.message);
        console.error('Stack trace:', error.stack);
        erros.push({
          post: post,
          erro: error.message
        });
      }
    }

    console.log(`\n✅ Processamento concluído: ${materias.length} matérias geradas, ${erros.length} erros`);

    return {
      materias,
      erros,
      total: posts.length,
      sucesso: materias.length,
      falhas: erros.length
    };
  }

  /**
   * Expandir conteúdo com IA - gera mais informações baseadas no texto fornecido
   */
  static async expandirConteudo(conteudo) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    if (!conteudo || conteudo.trim().length < 20) {
      throw new Error('Conteúdo muito curto para expandir (mínimo 20 caracteres)');
    }

    console.log('🔄 Expandindo conteúdo com IA...');

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente jornalístico que ajuda a organizar e estruturar melhor informações já fornecidas, sem inventar novos fatos.'
      },
      {
        role: 'user',
        content: `Você recebeu as seguintes informações sobre uma matéria:

${conteudo}

Sua tarefa é REORGANIZAR e MELHORAR a estrutura dessas informações, tornando-as mais claras e organizadas para criar uma matéria jornalística.

⚠️ REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:

1. ✅ MANTENHA TODOS os fatos exatamente como foram fornecidos
2. ✅ APENAS reorganize e melhore a estrutura do texto
3. ✅ Adicione conectivos e transições entre as informações
4. ✅ Separe em parágrafos lógicos (lide, desenvolvimento, repercussão)
5. ❌ NÃO invente detalhes que não foram mencionados
6. ❌ NÃO adicione nomes de lugares, datas ou números que não existem no texto original
7. ❌ NÃO especule sobre "onde foi gravado", "quantas visualizações teve", etc
8. ❌ NÃO adicione análises de "especialistas" ou "analistas" que não foram citados
9. ❌ NÃO expanda citações ou declarações além do que foi dito

FORMATO DE SAÍDA:
- Texto corrido, bem estruturado
- Parágrafos separados por quebras de linha duplas
- NÃO use formatação HTML
- NÃO adicione título
- Máximo 3-4 parágrafos

Exemplo CORRETO:
Entrada: "Pastor anuncia projeto social. Vai ajudar 100 famílias. Começa em janeiro."
Saída: "Um pastor anunciou um novo projeto social que vai beneficiar 100 famílias. A iniciativa está prevista para começar em janeiro."

Exemplo ERRADO (NÃO FAÇA ISSO):
"Um pastor da Igreja Batista Central, localizada no bairro Jardim das Flores, anunciou durante o culto de domingo à noite um ambicioso projeto social que pretende beneficiar 100 famílias carentes da região. Segundo especialistas em assistência social..."

Agora reorganize o conteúdo fornecido acima:`
      }
    ];

    try {
      // Temperatura baixa (0.3) para respostas mais conservadoras e fiéis ao original
      // Tokens limitados (800) para evitar expansões excessivas
      const response = await this.makeRequest(messages, 0.3, 800);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      const conteudoExpandido = response.trim();
      console.log('✅ Conteúdo reorganizado com sucesso');
      return conteudoExpandido;
    } catch (error) {
      console.error('❌ Erro ao expandir conteúdo:', error);
      throw error;
    }
  }

  /**
   * Gera matéria no estilo jornalístico G1 a partir de conteúdo
   * Usa o mesmo prompt do "Reescrever Matéria (Estilo G1)"
   */
  static async gerarMateriaEstiloG1(conteudoOriginal, categoria = 'Notícias', linkReferencia = null) {
    console.log('📝 Gerando matéria no estilo G1...');

    if (!conteudoOriginal || conteudoOriginal.trim().length < 50) {
      throw new Error('Conteúdo muito curto para gerar matéria (mínimo 50 caracteres)');
    }

    // Extrair texto limpo se vier com HTML
    const textoLimpo = conteudoOriginal
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista profissional do G1 que cria matérias mantendo TODOS os fatos originais, sem inventar informações, com linguagem humanizada e natural.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo G1 baseada EXCLUSIVAMENTE no conteúdo abaixo.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ NÃO adicione informações sobre "velório", "sepultamento", "horários" se NÃO foram citados
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica

✅ O QUE VOCÊ DEVE FAZER:
1. ✅ Use APENAS as informações que estão no texto original
2. ✅ Reorganize essas informações em estrutura jornalística
3. ✅ Melhore a fluidez e conectivos entre as frases
4. ✅ Use sinônimos mantendo o sentido exato
5. ✅ Torne o texto mais humanizado e próximo do leitor
6. ✅ Se houver citações no original, mantenha-as exatamente como estão
7. ✅ Se NÃO houver citações, NÃO invente nenhuma

📏 TAMANHO DO CONTEÚDO:
- Escreva APENAS com base no que foi fornecido
- Se o texto original é curto, a matéria será curta (200-300 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e claro (estilo G1)
   - Baseado APENAS no fato principal mencionado
   - Use verbos emotivos quando apropriado: "comoveu", "abalou", "emocionou"

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Breve introdução reforçando os principais fatos DO TEXTO ORIGINAL
   - Linguagem simples e direta

3. CONTEÚDO HTML:

   a) LIDE (1-2 parágrafos): Fato principal de forma HUMANA
      - Escreva o QUE aconteceu baseado no texto
      - Use narrativa envolvente MAS sem inventar detalhes

   b) DESENVOLVIMENTO (1-3 parágrafos conforme o conteúdo disponível):
      - Use <h3> para subtítulos APENAS se fizer sentido
      - Mantenha parágrafos curtos (3-4 linhas)
      - Desenvolva APENAS os pontos mencionados no original

   c) CITAÇÕES (SE HOUVER no texto original):
      - Use <blockquote> para citações que já existem
      - NÃO crie citações novas
      - Se NÃO há citações no original, NÃO adicione nenhuma

   d) CONCLUSÃO (1 parágrafo):
      - Encerramento respeitoso baseado no contexto
      - EVITE: "hora de repensar", "chamado à reflexão"
      - PREFIRA: "A notícia repercutiu", "O caso comoveu"

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- Use <h3>Subtítulo</h3> APENAS se necessário
- Use <blockquote>citação</blockquote> APENAS para citações que JÁ EXISTEM
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM HUMANIZADA (ESTILO G1):
- ✅ Tom próximo, emotivo mas respeitoso
- ✅ Parágrafos curtos e diretos
- ✅ Use conectivos variados (além disso, enquanto isso, por outro lado)
- ✅ Varie o tamanho das frases (curtas, médias, longas)
- ❌ Evite jargões técnicos ou linguagem rebuscada

CONTEÚDO ORIGINAL (USE APENAS ISSO):
${textoLimpo}

CATEGORIA: ${categoria}

⚠️ LEMBRE-SE: É MELHOR uma matéria curta e fiel ao original do que uma matéria longa com informações inventadas!

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha"}`
      }
    ];

    try {
      // Log do conteúdo que será enviado para a IA
      console.log('📄 Conteúdo do post (primeiros 200 chars):', textoLimpo.substring(0, 200));
      console.log('📏 Tamanho total do conteúdo:', textoLimpo.length, 'caracteres');

      // Temperatura 0.2 (MUITO baixa) para ser EXTREMAMENTE fiel ao original e evitar qualquer invenção
      const response = await this.makeRequest(messages, 0.2, 3000);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      // Limpar a resposta removendo markdown code blocks se existirem
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      // Tentar extrair JSON da resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      let jsonStr = jsonMatch[0];

      // Tentar parsear
      try {
        const parsed = JSON.parse(jsonStr);

        // Validar se tem os campos necessários
        if (!parsed.titulo || !parsed.descricao || !parsed.conteudo) {
          throw new Error('JSON não contém todos os campos necessários (titulo, descricao, conteudo)');
        }

        // Limpar tags vazias e adicionar espaçamento moderado
        let conteudoLimpo = parsed.conteudo.trim()
          .replace(/>\s+</g, '><')
          .replace(/<p>\s*<\/p>/gi, '')
          .replace(/<p>[\s\n\r]*<\/p>/gi, '')
          .replace(/<p><\/p>/gi, '')
          .replace(/<\/p><p><\/p><p>/gi, '</p><p>')
          .replace(/<\/p><p>\s*<\/p><p>/gi, '</p><p>')
          .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
          .replace(/\s+<\//g, '</')
          .replace(/<\/p><p>/gi, '</p><br><p>')
          .replace(/<\/h3><p>/gi, '</h3><br><p>')
          .replace(/<\/blockquote><p>/gi, '</blockquote><br><p>');

        // Adicionar embed do Instagram se houver link de referência
        if (linkReferencia && linkReferencia.includes('instagram.com')) {
          const jaTemEmbed = conteudoLimpo.includes('instagram-media') || conteudoLimpo.includes('instagram.com/p/');

          if (!jaTemEmbed) {
            console.log('📱 Adicionando embed do Instagram:', linkReferencia);
            const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${linkReferencia}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;
            conteudoLimpo += embedCode;
          }
        }

        // Buscar imagens baseadas no título
        const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
        console.log('🔍 Título:', parsed.titulo);
        console.log('🔑 Palavras-chave extraídas:', palavrasChave);
        console.log('📸 Buscando imagens no Google...');

        const imagensSugeridas = await this.buscarImagensGoogle(palavrasChave);

        console.log('✅ Matéria gerada com sucesso no estilo G1');

        return {
          titulo: parsed.titulo,
          descricao: parsed.descricao,
          conteudo: conteudoLimpo,
          imagensSugeridas: imagensSugeridas
        };

      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError.message);

        // Tentar limpar e parsear novamente
        jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ');

        try {
          const parsed = JSON.parse(jsonStr);

          if (!parsed.titulo || !parsed.descricao || !parsed.conteudo) {
            throw new Error('JSON não contém todos os campos necessários');
          }

          // Buscar imagens
          const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
          const imagensSugeridas = await this.buscarImagensGoogle(palavrasChave);

          return {
            titulo: parsed.titulo,
            descricao: parsed.descricao,
            conteudo: parsed.conteudo,
            imagensSugeridas: imagensSugeridas
          };

        } catch (secondError) {
          console.error('Segunda tentativa de parse falhou:', secondError.message);
          throw new Error('Não foi possível processar a resposta da IA');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao gerar matéria estilo G1:', error);
      throw error;
    }
  }

  /**
   * Reescrever matéria no estilo jornalístico G1
   */
  static async reescreverMateriaG1(conteudoHTML) {
    console.log('📝 Reescrevendo matéria no estilo G1...');

    // Extrair texto do HTML
    const textoLimpo = conteudoHTML
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!textoLimpo || textoLimpo.length < 50) {
      throw new Error('Conteúdo muito curto para reescrever');
    }

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista profissional do G1 que reescreve matérias mantendo TODOS os fatos originais, sem inventar informações, com linguagem humanizada e natural.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA: Reescreva a matéria abaixo no estilo jornalístico do G1, mantendo TODOS os fatos e contexto da matéria original.

🎯 REGRA PRINCIPAL - MANTENHA O CONTEXTO:
- ✅ Mantenha TODOS os nomes, lugares, datas e fatos mencionados no texto original
- ✅ NÃO saia do assunto principal da matéria
- ✅ Se a matéria fala sobre um falecimento, mantenha o foco nisso
- ✅ Se menciona uma igreja/organização específica, mantenha o nome exato
- ✅ Se cita pessoas, mantenha os nomes e cargos exatos

🚫 NUNCA INVENTE FATOS NOVOS:
1. ❌ NÃO invente números, datas, horários ou locais que não foram mencionados
2. ❌ NÃO adicione eventos que não foram citados (velório, sepultamento, etc)
3. ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis")
4. ❌ NÃO invente declarações de pessoas não mencionadas
5. ❌ NÃO mude nomes de pessoas ou organizações

✅ PODE FAZER:
1. ✅ Reorganizar as informações em melhor estrutura jornalística
2. ✅ Adicionar contexto genérico sobre o tema (sem inventar fatos)
3. ✅ Usar sinônimos e variar a linguagem mantendo o sentido
4. ✅ Melhorar conectivos e fluidez do texto
5. ✅ Tornar o texto mais humanizado e próximo do leitor

ESTRUTURA OBRIGATÓRIA:
1. **Lide** (1-2 parágrafos): Fato principal de forma HUMANA e impactante
   - Exemplo: "Pastora evangélica morre e comove fiéis de sua igreja"
   - Use verbos emotivos: "comoveu", "abalou", "emocionou"
   
2. **Desenvolvimento** (2-3 parágrafos): Detalhes e contexto
   - Use <h3> para subtítulos quando apropriado
   - Mantenha parágrafos curtos (3-4 linhas)
   
3. **Conclusão** (1 parágrafo): Encerramento respeitoso

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- NÃO adicione espaços ou quebras de linha entre as tags
- Use <h3>Subtítulo</h3> para subtítulos
- Use <blockquote>citação</blockquote> para citações diretas
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM HUMANIZADA (ESTILO G1):
- ✅ "Pastora evangélica morre e deixa comunidade em luto"
- ✅ "O falecimento comoveu fiéis da igreja onde ela atuava"
- ✅ "Conhecida por seu trabalho com a comunidade"
- ✅ Tom próximo, emotivo mas respeitoso
- ✅ Parágrafos curtos e diretos
- ❌ Evite: "está de luto", "manifestaram apoio" (muito formal)
- ❌ Evite: jargões técnicos ou linguagem rebuscada

TEXTO ORIGINAL:
${textoLimpo}

EXEMPLO DE FORMATAÇÃO CORRETA (SEM ESPAÇOS ENTRE TAGS):
<p>A comunidade gospel está em luto com o falecimento da pastora Ivaneide, que atuava na Obra Restauração Saquassú. Conhecida por sua dedicação ao evangelho, ela deixa um legado de fé que marcou a vida de muitos fiéis.</p><p>Sua trajetória foi marcada pelo amor às pessoas e compromisso com o Reino de Deus. O ministério da pastora se destacou pela compaixão e pelo exemplo de vida cristã.</p><h3>Homenagens</h3><p>O pastor Nilson Luiz e a equipe da Obra Restauração Saquassú expressaram solidariedade à família. "Sua missão na terra foi cumprida com excelência", destacaram em nota.</p><p>Mensagens de condolências têm sido compartilhadas por fiéis que foram impactados por seu trabalho.</p>

RETORNE APENAS O HTML (sem título ou descrição):`
      }
    ];

    try {
      // Temperatura baixa (0.4) para ser mais fiel ao original e evitar invenções
      const response = await this.makeRequest(messages, 0.4, 2500);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      // Limpar tags vazias e adicionar espaçamento moderado
      let conteudoLimpo = response.trim()
        // Remover quebras de linha e espaços dentro das tags
        .replace(/>\s+</g, '><')
        // Remover <p> vazios (com ou sem espaços/quebras)
        .replace(/<p>\s*<\/p>/gi, '')
        .replace(/<p>[\s\n\r]*<\/p>/gi, '')
        .replace(/<p><\/p>/gi, '')
        // Limpar padrões específicos problemáticos: </p><p></p><p>
        .replace(/<\/p><p><\/p><p>/gi, '</p><p>')
        .replace(/<\/p><p>\s*<\/p><p>/gi, '</p><p>')
        // Remover múltiplos <br> seguidos
        .replace(/(<br\s*\/?>){2,}/gi, '<br>')
        // Remover espaços antes de tags de fechamento
        .replace(/\s+<\//g, '</')
        // ADICIONAR um <br> entre parágrafos para espaçamento moderado
        .replace(/<\/p><p>/gi, '</p><br><p>')
        .replace(/<\/h3><p>/gi, '</h3><br><p>')
        .replace(/<\/blockquote><p>/gi, '</blockquote><br><p>');

      console.log('✅ Matéria reescrita com sucesso no estilo G1');
      return conteudoLimpo;
    } catch (error) {
      console.error('❌ Erro ao reescrever matéria:', error);
      throw error;
    }
  }

  /**
   * Baixa vídeo do Instagram temporariamente
   */
  static async baixarVideoInstagram(url) {
    try {
      console.log('📥 Baixando vídeo do Instagram:', url);
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const timestamp = Date.now();
      const videoPath = path.join(tempDir, `instagram_${timestamp}.mp4`);

      // Método 1: instagram-url-direct (Nova biblioteca robusta)
      try {
        console.log('🔄 Tentando método 1: instagram-url-direct');
        // Lazy load da biblioteca para evitar erro se não estiver instalada
        let instagramLib;
        try {
          instagramLib = require("instagram-url-direct");
        } catch (e) {
          console.log('⚠️ Biblioteca instagram-url-direct não encontrada');
        }

        if (instagramLib && instagramLib.instagramGetUrl) {
          const links = await instagramLib.instagramGetUrl(url);

          if (links.url_list && links.url_list.length > 0) {
            const videoUrl = links.url_list[0];
            console.log('✅ URL do vídeo encontrada via instagram-url-direct');

            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            fs.writeFileSync(videoPath, videoResponse.data);
            console.log('✅ Vídeo salvo com sucesso:', videoPath);
            return videoPath;
          }
        }
      } catch (e) {
        console.log('❌ Método 1 (instagram-url-direct) falhou:', e.message);
      }

      // Método 2: API Cobalt (Fallback)
      try {
        console.log('🔄 Tentando método 2: Cobalt API');
        const cobaltEndpoints = [
          'https://api.cobalt.tools/api/json',
          'https://cobalt.api.wuk.sh/api/json',
          'https://co.wuk.sh/api/json'
        ];

        for (const endpoint of cobaltEndpoints) {
          try {
            const cobaltResponse = await axios.post(endpoint, {
              url: url,
              vCodec: 'h264',
              vQuality: '720',
              aFormat: 'mp3',
              filenamePattern: 'basic'
            }, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 15000
            });

            if (cobaltResponse.data && cobaltResponse.data.url) {
              console.log('✅ URL do vídeo obtida via Cobalt');
              const videoUrl = cobaltResponse.data.url;

              const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
              });

              fs.writeFileSync(videoPath, videoResponse.data);
              console.log('✅ Vídeo salvo via Cobalt:', videoPath);
              return videoPath;
            }
          } catch (innerErr) {
            // Silently fail for each endpoint
          }
        }
      } catch (e) {
        console.log('❌ Método 2 (Cobalt) falhou:', e.message);
      }

      // Método 3: Insta-fetcher (Fallback antigo)
      try {
        console.log('🔄 Tentando método 3: insta-fetcher');
        const ig = new igApi();
        const postData = await ig.fetchPost(url);

        let videoUrl = null;
        if (postData.links) {
          for (const link of postData.links) {
            if (link.type === 'video' || link.url.includes('.mp4')) {
              videoUrl = link.url;
              break;
            }
          }
        }

        if (videoUrl) {
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          fs.writeFileSync(videoPath, videoResponse.data);
          console.log('✅ Vídeo salvo via insta-fetcher:', videoPath);
          return videoPath;
        }
      } catch (e) {
        console.log('❌ Método 3 (insta-fetcher) falhou:', e.message);
      }

      throw new Error('Não foi possível baixar o vídeo por nenhum método.');
    } catch (error) {
      console.error('❌ Erro fatal ao baixar vídeo:', error.message);
      throw new Error('Não foi possível baixar o vídeo do Instagram. Por favor, cole o texto manualmente.');
    }
  }

  /**
   * Extrai áudio do vídeo usando ffmpeg
   */
  static async extrairAudioDoVideo(videoPath) {
    return new Promise((resolve, reject) => {
      const audioPath = videoPath.replace('.mp4', '.mp3');
      console.log('🔊 Extraindo áudio para:', audioPath);

      ffmpeg(videoPath)
        .toFormat('mp3')
        .on('end', () => {
          console.log('✅ Áudio extraído com sucesso');
          resolve(audioPath);
        })
        .on('error', (err) => {
          console.error('❌ Erro ao extrair áudio:', err.message);
          reject(err);
        })
        .save(audioPath);
    });
  }

  /**
   * Transcreve áudio usando Groq (Whisper V3) - Mais rápido e barato/grátis
   */
  static async transcreverAudio(audioPath) {
    try {
      console.log('🗣️ Transcrevendo áudio com Whisper (via Groq)...');

      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('model', 'whisper-large-v3'); // Modelo superior da Groq
      formData.append('language', 'pt');
      formData.append('response_format', 'json');

      // Usar chave da Groq fornecida especificamente para áudio
      // Isso evita conflito com a chave do Together usada para texto
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error('GROQ_API_KEY não configurada no arquivo .env');
      }

      // Usar endpoint da Groq que é compatível com OpenAI e muito rápido
      const apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

      const response = await axios.post(apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 120000 // 2 minutos timeout
      });

      if (response.data && response.data.text) {
        console.log('✅ Transcrição concluída:', response.data.text.substring(0, 50) + '...');
        return response.data.text;
      } else {
        throw new Error('Resposta da API sem texto');
      }
    } catch (error) {
      console.error('❌ Erro na transcrição:', error.response?.data || error.message);

      // Fallback para OpenAI se a Groq falhar (caso a chave seja da OpenAI)
      if (error.response?.status === 401) {
        try {
          console.log('⚠️ Falha na Groq (401), tentando endpoint OpenAI...');
          const apiKey = await SystemConfig.getConfig('ia_api_key');
          const formData = new FormData();
          formData.append('file', fs.createReadStream(audioPath));
          formData.append('model', 'whisper-1');
          formData.append('language', 'pt');

          const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 120000
          });
          return response.data.text;
        } catch (e2) {
          throw error; // Lança o erro original se o fallback falhar
        }
      }

      throw error;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  static async limparArquivosTemporarios(videoPath, audioPath) {
    try {
      if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      console.log('🧹 Arquivos temporários limpos');
    } catch (e) {
      console.error('Erro ao limpar arquivos:', e.message);
    }
  }

  /**
   * Processo completo de vídeo: Baixar -> Extrair Áudio -> Transcrever
   */
  static async processarVideoInstagram(url) {
    let videoPath = null;
    let audioPath = null;

    try {
      // 1. Baixar vídeo
      videoPath = await this.baixarVideoInstagram(url);

      // 2. Extrair áudio
      audioPath = await this.extrairAudioDoVideo(videoPath);

      // 3. Transcrever
      const transcricao = await this.transcreverAudio(audioPath);

      // 4. Limpar arquivos temporários
      this.limparArquivosTemporarios(videoPath, audioPath);

      console.log('✅ Processamento de vídeo concluído com sucesso');
      return transcricao;
    } catch (error) {
      // Limpar arquivos em caso de erro
      this.limparArquivosTemporarios(videoPath, audioPath);

      console.error('❌ Erro ao processar vídeo:', error.message);
      throw error;
    }
  }
}

module.exports = AIService;
