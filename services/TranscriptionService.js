/**
 * TranscriptionService - Serviço para transcrição de vídeos do YouTube
 * Usa múltiplas estratégias para contornar bloqueios de IP em servidores cloud
 */

const axios = require('axios');

class TranscriptionService {
  // Lista de instâncias Invidious públicas com API habilitada
  // Fonte: https://api.invidious.io/instances.json
  static INVIDIOUS_INSTANCES = [
    'https://yewtu.be',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://inv.perditum.com',
    'https://invidious.f5.si'
  ];

  /**
   * Extrai o ID do vídeo de uma URL do YouTube
   * @param {string} url - URL do YouTube
   * @returns {string|null} - ID do vídeo ou null se inválido
   */
  static extractVideoId(url) {
    if (!url) return null;
    
    // Padrões de URL do YouTube (incluindo Shorts)
    const patterns = [
      // YouTube Shorts
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      // URLs padrão
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      // URL com parâmetros extras
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      // ID direto
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log(`🔗 ID extraído: ${match[1]} (padrão: ${pattern.source.substring(0, 30)}...)`);
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Busca legendas via Invidious (scraping da página de legendas)
   * @param {string} videoId - ID do vídeo
   * @param {string} lang - Idioma preferido
   * @returns {Promise<{text: string, lang: string}|null>}
   */
  static async fetchViaInvidious(videoId, lang = 'pt') {
    const idiomas = [lang, 'pt', 'en', 'es'];
    
    for (const instance of this.INVIDIOUS_INSTANCES) {
      for (const idioma of idiomas) {
        try {
          console.log(`🔄 Tentando ${instance} (${idioma})...`);
          
          // Tentar baixar legenda diretamente via URL de caption do Invidious
          const captionUrl = `${instance}/api/v1/captions/${videoId}?label=${idioma}`;
          
          const response = await axios.get(captionUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            },
            validateStatus: (status) => status < 500
          });
          
          if (response.status === 200 && response.data) {
            const text = this.parseCaptionData(response.data);
            if (text && text.length > 50) {
              console.log(`✅ Legendas obtidas via ${instance}: ${idioma}`);
              return { text, lang: idioma, source: 'invidious', instance };
            }
          }
        } catch (error) {
          // Silencioso, tentar próximo
        }
      }
      
      // Tentar via API de vídeo (se disponível)
      try {
        const videoInfoUrl = `${instance}/api/v1/videos/${videoId}`;
        const videoResponse = await axios.get(videoInfoUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status < 500
        });
        
        if (videoResponse.status !== 200) continue;
        
        const captions = videoResponse.data.captions || [];
        
        if (captions.length === 0) {
          console.log(`⚠️ Nenhuma legenda em ${instance}`);
          continue;
        }
        
        console.log(`📋 Legendas: ${captions.map(c => c.label || c.language_code).join(', ')}`);
        
        // Encontrar a melhor legenda
        let selectedCaption = null;
        for (const idioma of idiomas) {
          selectedCaption = captions.find(c => 
            (c.language_code && c.language_code.startsWith(idioma)) ||
            (c.label && c.label.toLowerCase().includes(idioma))
          );
          if (selectedCaption) break;
        }
        
        if (!selectedCaption && captions.length > 0) {
          selectedCaption = captions[0];
        }
        
        if (!selectedCaption) continue;
        
        console.log(`✅ Usando: ${selectedCaption.label || selectedCaption.language_code}`);
        
        // Baixar a legenda
        let captionUrl = selectedCaption.url;
        if (!captionUrl.startsWith('http')) {
          captionUrl = `${instance}${captionUrl}`;
        }
        
        const captionResponse = await axios.get(captionUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const captionText = this.parseCaptionData(captionResponse.data);
        
        if (captionText && captionText.length > 50) {
          return {
            text: captionText,
            lang: selectedCaption.language_code || 'auto',
            source: 'invidious',
            instance
          };
        }
        
      } catch (error) {
        console.log(`⚠️ Falha em ${instance}: ${error.message}`);
      }
    }
    
    return null;
  }

  /**
   * Extrai metadados do vídeo (título, descrição, canal) via scraping ou API
   * @param {string} videoId - ID do vídeo
   * @returns {Promise<{titulo: string, descricao: string, canal: string}|null>}
   */
  static async fetchVideoMetadata(videoId) {
    try {
      console.log(`📋 Buscando metadados do vídeo...`);
      
      // Tentar via Invidious primeiro (mais confiável em servidores)
      for (const instance of this.INVIDIOUS_INSTANCES) {
        try {
          const response = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            validateStatus: (status) => status < 500
          });
          
          if (response.status === 200 && response.data) {
            const data = response.data;
            console.log(`✅ Metadados obtidos via ${instance}`);
            return {
              titulo: data.title || '',
              descricao: data.description || '',
              canal: data.author || '',
              duracao: data.lengthSeconds || 0,
              visualizacoes: data.viewCount || 0,
              dataPublicacao: data.published ? new Date(data.published * 1000).toISOString() : null
            };
          }
        } catch (e) {
          // Tentar próxima instância
        }
      }
      
      // Fallback: scraping da página do YouTube
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': 'CONSENT=YES+cb'
        }
      });
      
      const html = response.data;
      
      // Extrair título
      let titulo = '';
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        titulo = titleMatch[1].replace(' - YouTube', '').trim();
      }
      
      // Extrair descrição do meta tag
      let descricao = '';
      const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
      if (descMatch) {
        descricao = this.decodeHtmlEntities(descMatch[1]);
      }
      
      // Tentar extrair do JSON embutido
      const jsonMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (jsonMatch) {
        try {
          const playerData = JSON.parse(jsonMatch[1]);
          if (playerData.videoDetails) {
            titulo = playerData.videoDetails.title || titulo;
            descricao = playerData.videoDetails.shortDescription || descricao;
          }
        } catch (e) {}
      }
      
      // Extrair canal
      let canal = '';
      const canalMatch = html.match(/"ownerChannelName":"([^"]+)"/);
      if (canalMatch) {
        canal = canalMatch[1];
      }
      
      if (titulo) {
        console.log(`✅ Metadados extraídos via scraping`);
        console.log(`   📺 Título: ${titulo.substring(0, 50)}...`);
        return { titulo, descricao, canal };
      }
      
    } catch (error) {
      console.log(`⚠️ Erro ao buscar metadados: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Busca legendas via scraping da página do YouTube
   * Extrai o JSON de legendas embutido na página
   * @param {string} videoId - ID do vídeo
   * @param {string} lang - Idioma preferido
   * @returns {Promise<{text: string, lang: string}|null>}
   */
  static async fetchViaYouTubeScraping(videoId, lang = 'pt') {
    try {
      console.log(`🔍 Tentando scraping da página do YouTube...`);
      
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
          'Cookie': 'CONSENT=YES+cb'
        }
      });
      
      const html = response.data;
      
      // Extrair o JSON de playerCaptionsTracklistRenderer
      const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      
      if (captionsMatch) {
        try {
          const captionTracks = JSON.parse(captionsMatch[1]);
          console.log(`📋 Legendas encontradas: ${captionTracks.map(c => c.languageCode).join(', ')}`);
          
          // Encontrar a melhor legenda
          const idiomas = [lang, 'pt', 'en', 'es'];
          let selectedTrack = null;
          
          for (const idioma of idiomas) {
            selectedTrack = captionTracks.find(t => 
              t.languageCode === idioma || 
              t.languageCode.startsWith(idioma)
            );
            if (selectedTrack) break;
          }
          
          if (!selectedTrack && captionTracks.length > 0) {
            selectedTrack = captionTracks[0];
          }
          
          if (selectedTrack && selectedTrack.baseUrl) {
            console.log(`✅ Baixando legenda: ${selectedTrack.languageCode}`);
            
            // Baixar a legenda
            const captionResponse = await axios.get(selectedTrack.baseUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            const text = this.parseCaptionData(captionResponse.data);
            if (text && text.length > 50) {
              return { text, lang: selectedTrack.languageCode, source: 'youtube-scraping' };
            }
          }
        } catch (parseError) {
          console.log(`⚠️ Erro ao parsear legendas: ${parseError.message}`);
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Scraping do YouTube falhou: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Busca legendas diretamente do YouTube via timedtext API
   * @param {string} videoId - ID do vídeo
   * @param {string} lang - Idioma preferido
   * @returns {Promise<{text: string, lang: string}|null>}
   */
  static async fetchViaTimedText(videoId, lang = 'pt') {
    const idiomas = [lang, 'pt', 'en', 'es'];
    
    for (const idioma of idiomas) {
      try {
        console.log(`🔍 Tentando timedtext API para: ${idioma}`);
        
        // URL direta da API de legendas do YouTube
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${idioma}&fmt=srv3`;
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        
        if (response.data && response.data.length > 100) {
          const text = this.parseCaptionData(response.data);
          if (text && text.length > 50) {
            console.log(`✅ Legendas obtidas via timedtext: ${idioma}`);
            return { text, lang: idioma, source: 'timedtext' };
          }
        }
      } catch (error) {
        console.log(`⚠️ timedtext falhou para ${idioma}: ${error.message}`);
      }
    }
    
    return null;
  }

  /**
   * Busca legendas via youtube-transcript-plus (funciona localmente)
   * @param {string} videoId - ID do vídeo
   * @param {string} lang - Idioma preferido
   * @returns {Promise<{text: string, lang: string, segments: Array}|null>}
   */
  static async fetchViaLibrary(videoId, lang = 'pt') {
    try {
      const { fetchTranscript } = await import('youtube-transcript-plus');
      const idiomas = [lang, 'pt-BR', 'pt', 'en', 'es'];
      
      for (const idioma of idiomas) {
        try {
          console.log(`🔍 Tentando youtube-transcript-plus: ${idioma}`);
          const transcript = await fetchTranscript(videoId, {
            lang: idioma,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          });
          
          if (transcript && transcript.length > 0) {
            const text = transcript.map(seg => seg.text).join(' ').replace(/\s+/g, ' ').trim();
            console.log(`✅ Legendas via biblioteca: ${idioma}`);
            return { text, lang: idioma, source: 'library', segments: transcript };
          }
        } catch (e) {
          console.log(`⚠️ Biblioteca falhou para ${idioma}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ youtube-transcript-plus não disponível: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Parse de dados de legenda (XML/VTT/JSON)
   * @param {string} data - Dados da legenda
   * @returns {string} - Texto extraído
   */
  static parseCaptionData(data) {
    if (!data) return '';
    
    let text = '';
    
    // Tentar parse como XML (formato YouTube)
    if (data.includes('<transcript>') || data.includes('<text')) {
      const textMatches = data.match(/<text[^>]*>([^<]*)<\/text>/gi) || [];
      text = textMatches
        .map(match => {
          const content = match.replace(/<[^>]+>/g, '');
          return this.decodeHtmlEntities(content);
        })
        .join(' ');
    }
    // Tentar parse como VTT
    else if (data.includes('WEBVTT') || data.includes('-->')) {
      const lines = data.split('\n');
      const textLines = lines.filter(line => 
        line.trim() && 
        !line.includes('-->') && 
        !line.includes('WEBVTT') &&
        !line.match(/^\d+$/) &&
        !line.match(/^\d{2}:\d{2}/)
      );
      text = textLines.join(' ');
    }
    // Tentar parse como JSON
    else if (data.startsWith('{') || data.startsWith('[')) {
      try {
        const json = JSON.parse(data);
        if (Array.isArray(json)) {
          text = json.map(item => item.text || item.content || '').join(' ');
        } else if (json.events) {
          text = json.events
            .filter(e => e.segs)
            .map(e => e.segs.map(s => s.utf8).join(''))
            .join(' ');
        }
      } catch (e) {
        text = data;
      }
    }
    // Texto puro
    else {
      text = data;
    }
    
    // Limpar o texto
    return text
      .replace(/\s+/g, ' ')
      .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
      .replace(/♪/g, '')
      .trim();
  }

  /**
   * Decodifica entidades HTML
   * @param {string} text - Texto com entidades HTML
   * @returns {string} - Texto decodificado
   */
  static decodeHtmlEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&nbsp;': ' '
    };
    
    return text.replace(/&[#\w]+;/g, match => entities[match] || match);
  }

  /**
   * Busca a transcrição de um vídeo do YouTube usando múltiplas estratégias
   * @param {string} youtubeUrl - URL ou ID do vídeo do YouTube
   * @param {string} lang - Idioma preferido (padrão: 'pt')
   * @returns {Promise<{textoTranscricao: string, idioma: string, origem: string, videoId: string}>}
   */
  static async transcreverYoutubeVideo(youtubeUrl, lang = 'pt') {
    console.log('🎬 Iniciando transcrição do vídeo:', youtubeUrl);
    
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('URL do YouTube inválida. Não foi possível extrair o ID do vídeo.');
    }
    
    console.log('📹 ID do vídeo:', videoId);
    
    let result = null;
    
    // Estratégia 1: Scraping direto do YouTube (extrai JSON de legendas da página)
    console.log('\n📡 Estratégia 1: YouTube Scraping...');
    result = await this.fetchViaYouTubeScraping(videoId, lang);
    
    // Estratégia 2: Invidious API (proxy alternativo)
    if (!result) {
      console.log('\n📡 Estratégia 2: Invidious API...');
      result = await this.fetchViaInvidious(videoId, lang);
    }
    
    // Estratégia 3: YouTube timedtext API direta
    if (!result) {
      console.log('\n📡 Estratégia 3: YouTube timedtext API...');
      result = await this.fetchViaTimedText(videoId, lang);
    }
    
    // Estratégia 4: youtube-transcript-plus (funciona melhor localmente)
    if (!result) {
      console.log('\n📡 Estratégia 4: youtube-transcript-plus...');
      result = await this.fetchViaLibrary(videoId, lang);
    }
    
    if (!result || !result.text || result.text.length < 50) {
      throw new Error(
        'Não foi possível obter a transcrição deste vídeo. ' +
        'Possíveis causas: vídeo sem legendas, legendas desativadas, ou vídeo privado/restrito.'
      );
    }
    
    // Buscar metadados do vídeo (título, descrição, canal)
    console.log('\n📋 Buscando metadados do vídeo...');
    const metadata = await this.fetchVideoMetadata(videoId);
    
    console.log(`\n✅ Transcrição obtida com sucesso!`);
    console.log(`   📊 Fonte: ${result.source}`);
    console.log(`   🌐 Idioma: ${result.lang}`);
    console.log(`   📝 Caracteres: ${result.text.length}`);
    if (metadata) {
      console.log(`   📺 Título: ${metadata.titulo?.substring(0, 50)}...`);
      console.log(`   👤 Canal: ${metadata.canal}`);
    }
    
    return {
      textoTranscricao: result.text,
      idioma: result.lang,
      origem: result.source,
      segmentos: result.segments || [],
      videoId,
      duracao: 0,
      // Metadados do vídeo
      tituloVideo: metadata?.titulo || '',
      descricaoVideo: metadata?.descricao || '',
      canalVideo: metadata?.canal || ''
    };
  }

  /**
   * Obtém informações básicas do vídeo (título, thumbnail, etc.)
   * @param {string} youtubeUrl - URL do vídeo
   * @returns {Promise<{titulo: string, thumbnail: string, videoId: string}>}
   */
  static async obterInfoVideo(youtubeUrl) {
    try {
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('URL do YouTube inválida');
      }
      
      // Thumbnail padrão do YouTube
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const thumbnailHQ = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      return {
        videoId,
        thumbnail,
        thumbnailHQ,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
      
    } catch (error) {
      console.error('❌ Erro ao obter info do vídeo:', error);
      throw error;
    }
  }

  /**
   * Valida se uma URL é do YouTube
   * @param {string} url - URL para validar
   * @returns {boolean}
   */
  static isValidYoutubeUrl(url) {
    return this.extractVideoId(url) !== null;
  }
}

module.exports = TranscriptionService;
