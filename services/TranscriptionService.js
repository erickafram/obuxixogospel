/**
 * TranscriptionService - Serviço para transcrição de vídeos do YouTube
 * Usa youtube-transcript-plus para buscar legendas sem baixar o vídeo
 */

class TranscriptionService {
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
   * Busca a transcrição de um vídeo do YouTube
   * @param {string} youtubeUrl - URL ou ID do vídeo do YouTube
   * @param {string} lang - Idioma preferido (padrão: 'pt')
   * @returns {Promise<{textoTranscricao: string, idioma: string, origem: string, segmentos: Array}>}
   */
  static async transcreverYoutubeVideo(youtubeUrl, lang = 'pt') {
    try {
      console.log('🎬 Iniciando transcrição do vídeo:', youtubeUrl);
      
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('URL do YouTube inválida. Não foi possível extrair o ID do vídeo.');
      }
      
      console.log('📹 ID do vídeo:', videoId);
      
      // Importar dinamicamente o youtube-transcript-plus
      const { fetchTranscript } = await import('youtube-transcript-plus');
      
      // Tentar buscar em português primeiro
      let transcript = null;
      let idiomaUsado = lang;
      
      const idiomas = [lang, 'pt-BR', 'pt', 'en', 'es'];
      
      for (const idioma of idiomas) {
        try {
          console.log(`🔍 Tentando buscar legendas em: ${idioma}`);
          transcript = await fetchTranscript(videoId, {
            lang: idioma,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          });
          
          if (transcript && transcript.length > 0) {
            idiomaUsado = idioma;
            console.log(`✅ Legendas encontradas em: ${idioma}`);
            break;
          }
        } catch (langError) {
          console.log(`⚠️ Legendas não disponíveis em ${idioma}:`, langError.message);
        }
      }
      
      if (!transcript || transcript.length === 0) {
        throw new Error('Nenhuma legenda/transcrição disponível para este vídeo. Verifique se o vídeo possui legendas ativadas.');
      }
      
      // Unificar os segmentos em um texto único
      const textoTranscricao = transcript
        .map(seg => seg.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`📝 Transcrição obtida: ${textoTranscricao.length} caracteres`);
      console.log(`📊 Total de segmentos: ${transcript.length}`);
      
      return {
        textoTranscricao,
        idioma: idiomaUsado,
        origem: 'legenda',
        segmentos: transcript,
        videoId,
        duracao: transcript.length > 0 ? 
          Math.round(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration) : 0
      };
      
    } catch (error) {
      console.error('❌ Erro ao transcrever vídeo:', error);
      throw error;
    }
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
