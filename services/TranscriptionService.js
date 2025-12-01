/**
 * TranscriptionService - Serviço para transcrição de vídeos do YouTube
 * Usa múltiplas estratégias para contornar bloqueios de IP em servidores cloud
 */

const axios = require('axios');

class TranscriptionService {
  // Lista de instâncias Invidious públicas (não bloqueadas pelo YouTube)
  static INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.jing.rocks',
    'https://invidious.privacyredirect.com',
    'https://iv.nboeck.de',
    'https://invidious.protokolla.fi',
    'https://inv.tux.pizza',
    'https://invidious.perennialte.ch',
    'https://yt.cdaut.de',
    'https://invidious.drgns.space'
  ];

  /**
   * Extrai o ID do vídeo de uma URL do YouTube
   * @param {string} url - URL do YouTube
   * @returns {string|null} - ID do vídeo ou null se inválido
   */
  static extractVideoId(url) {
    if (!url) return null;
    
    // Padrões de URL do YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // ID direto
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Busca legendas via Invidious API (contorna bloqueio de IP)
   * @param {string} videoId - ID do vídeo
   * @param {string} lang - Idioma preferido
   * @returns {Promise<{text: string, lang: string}|null>}
   */
  static async fetchViaInvidious(videoId, lang = 'pt') {
    const idiomas = [lang, 'pt-BR', 'pt', 'en', 'es', 'auto'];
    
    for (const instance of this.INVIDIOUS_INSTANCES) {
      try {
        console.log(`🔄 Tentando Invidious: ${instance}`);
        
        // Primeiro, obter lista de legendas disponíveis
        const videoInfoUrl = `${instance}/api/v1/videos/${videoId}`;
        const videoResponse = await axios.get(videoInfoUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const captions = videoResponse.data.captions || [];
        
        if (captions.length === 0) {
          console.log(`⚠️ Nenhuma legenda disponível em ${instance}`);
          continue;
        }
        
        console.log(`📋 Legendas disponíveis: ${captions.map(c => c.language_code).join(', ')}`);
        
        // Encontrar a melhor legenda
        let selectedCaption = null;
        for (const idioma of idiomas) {
          selectedCaption = captions.find(c => 
            c.language_code === idioma || 
            c.language_code.startsWith(idioma.split('-')[0])
          );
          if (selectedCaption) break;
        }
        
        // Se não encontrou, usar a primeira disponível
        if (!selectedCaption && captions.length > 0) {
          selectedCaption = captions[0];
        }
        
        if (!selectedCaption) continue;
        
        console.log(`✅ Usando legenda: ${selectedCaption.language_code}`);
        
        // Baixar a legenda
        const captionUrl = selectedCaption.url.startsWith('http') 
          ? selectedCaption.url 
          : `${instance}${selectedCaption.url}`;
        
        const captionResponse = await axios.get(captionUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // Parse do XML/VTT da legenda
        const captionText = this.parseCaptionData(captionResponse.data);
        
        if (captionText && captionText.length > 50) {
          return {
            text: captionText,
            lang: selectedCaption.language_code,
            source: 'invidious',
            instance
          };
        }
        
      } catch (error) {
        console.log(`⚠️ Falha em ${instance}: ${error.message}`);
        continue;
      }
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
    
    // Estratégia 1: Invidious API (melhor para servidores cloud)
    console.log('\n📡 Estratégia 1: Invidious API...');
    result = await this.fetchViaInvidious(videoId, lang);
    
    // Estratégia 2: YouTube timedtext API direta
    if (!result) {
      console.log('\n📡 Estratégia 2: YouTube timedtext API...');
      result = await this.fetchViaTimedText(videoId, lang);
    }
    
    // Estratégia 3: youtube-transcript-plus (funciona melhor localmente)
    if (!result) {
      console.log('\n📡 Estratégia 3: youtube-transcript-plus...');
      result = await this.fetchViaLibrary(videoId, lang);
    }
    
    if (!result || !result.text || result.text.length < 50) {
      throw new Error(
        'Não foi possível obter a transcrição deste vídeo. ' +
        'Possíveis causas: vídeo sem legendas, legendas desativadas, ou vídeo privado/restrito.'
      );
    }
    
    console.log(`\n✅ Transcrição obtida com sucesso!`);
    console.log(`   📊 Fonte: ${result.source}`);
    console.log(`   🌐 Idioma: ${result.lang}`);
    console.log(`   📝 Caracteres: ${result.text.length}`);
    
    return {
      textoTranscricao: result.text,
      idioma: result.lang,
      origem: result.source,
      segmentos: result.segments || [],
      videoId,
      duracao: 0
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
