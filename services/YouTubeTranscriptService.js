/**
 * YouTubeTranscriptService - Serviço para transcrever vídeos do YouTube e gerar matérias
 * Usa youtube-transcript-plus para obter legendas/transcrições sem baixar o vídeo
 */

const { fetchTranscript } = require('youtube-transcript-plus');
const AIService = require('./AIService');
const axios = require('axios');
const cheerio = require('cheerio');

// User agents para rotação
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

class YouTubeTranscriptService {
  
  /**
   * Extrai o ID do vídeo de uma URL do YouTube
   */
  static extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Obtém metadados do vídeo (título, descrição, canal) via scraping
   */
  static async getVideoMetadata(videoId) {
    try {
      console.log(`📋 Obtendo metadados do vídeo: ${videoId}`);
      
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);
      
      // Extrair título
      let title = $('meta[name="title"]').attr('content') || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('title').text().replace(' - YouTube', '');
      
      // Extrair descrição
      let description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || '';
      
      // Extrair canal/autor
      let channel = '';
      const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
      if (channelMatch) {
        channel = channelMatch[1];
      } else {
        // Fallback: tentar extrair do link do canal
        const channelLink = $('link[itemprop="name"]').attr('content');
        if (channelLink) channel = channelLink;
      }
      
      console.log(`✅ Metadados obtidos - Título: ${title?.substring(0, 50)}...`);
      console.log(`   Canal: ${channel}`);
      
      return {
        title: title || '',
        description: description || '',
        channel: channel || ''
      };
    } catch (error) {
      console.error('⚠️ Erro ao obter metadados do vídeo:', error.message);
      return { title: '', description: '', channel: '' };
    }
  }

  /**
   * Método alternativo para obter transcrição via scraping direto do YouTube
   * Usado como fallback quando o pacote youtube-transcript-plus falha
   */
  static async getTranscriptDirect(videoId) {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    console.log('🔄 Tentando método alternativo de transcrição (scraping direto)...');
    
    try {
      // Primeiro, obter a página do vídeo para extrair os dados de caption
      const videoPageResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 20000
      });

      const html = videoPageResponse.data;
      
      // Extrair ytInitialPlayerResponse completo
      // Usar uma abordagem mais robusta para extrair o JSON
      let captionTracks = null;
      
      const playerResponseStart = html.indexOf('var ytInitialPlayerResponse = ');
      if (playerResponseStart !== -1) {
        const jsonStart = html.indexOf('{', playerResponseStart);
        if (jsonStart !== -1) {
          // Encontrar o final do JSON contando chaves
          let braceCount = 0;
          let jsonEnd = jsonStart;
          
          for (let i = jsonStart; i < html.length && i < jsonStart + 500000; i++) {
            if (html[i] === '{') braceCount++;
            if (html[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
          
          if (jsonEnd > jsonStart) {
            try {
              const jsonStr = html.substring(jsonStart, jsonEnd);
              const playerResponse = JSON.parse(jsonStr);
              captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
              if (captionTracks) {
                console.log(`📄 captionTracks encontrado via ytInitialPlayerResponse: ${captionTracks.length} legendas`);
              }
            } catch (e) {
              console.log(`⚠️ Erro ao parsear ytInitialPlayerResponse: ${e.message}`);
            }
          }
        }
      }
      
      // Fallback: buscar captionTracks diretamente
      if (!captionTracks) {
        console.log('🔍 Buscando captionTracks diretamente no HTML...');
        const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*[,}]/);
        
        if (captionMatch) {
          try {
            captionTracks = JSON.parse(captionMatch[1]);
            console.log(`📄 captionTracks encontrado diretamente: ${captionTracks.length} legendas`);
          } catch (e) {
            console.log(`⚠️ Erro ao parsear captionTracks: ${e.message}`);
          }
        }
      }
      
      if (!captionTracks || captionTracks.length === 0) {
        console.log('❌ Nenhuma legenda encontrada no HTML');
        console.log(`   HTML size: ${html.length} bytes`);
        
        // Verificar se o vídeo existe mas não tem legendas
        if (html.includes('videoDetails')) {
          throw new Error('Este vídeo não possui legendas/closed captions disponíveis');
        } else {
          throw new Error('Não foi possível acessar os dados do vídeo');
        }
      }
      
      // Priorizar português, depois inglês, depois qualquer uma
      let selectedTrack = captionTracks.find(t => t.languageCode === 'pt' || t.languageCode === 'pt-BR');
      if (!selectedTrack) {
        selectedTrack = captionTracks.find(t => t.languageCode === 'en' || t.languageCode === 'en-US');
      }
      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }
      
      console.log(`📝 Legenda encontrada: ${selectedTrack.languageCode}`);
      
      // Baixar o arquivo de legendas
      const captionUrl = selectedTrack.baseUrl;
      const captionResponse = await axios.get(captionUrl, {
        headers: {
          'User-Agent': userAgent
        },
        timeout: 15000
      });
      
      // Parsear XML das legendas
      const captionXml = captionResponse.data;
      const textMatches = captionXml.match(/<text[^>]*>([^<]*)<\/text>/g);
      
      if (!textMatches || textMatches.length === 0) {
        throw new Error('Não foi possível extrair texto das legendas');
      }
      
      // Extrair e limpar o texto
      const segments = textMatches.map(match => {
        const text = match.replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, ' ')
          .trim();
        return { text };
      });
      
      const fullText = segments.map(s => s.text).join(' ');
      
      console.log(`✅ Transcrição obtida via método alternativo: ${fullText.length} caracteres`);
      
      return {
        segments,
        fullText
      };
    } catch (error) {
      console.error('❌ Método alternativo falhou:', error.message);
      throw error;
    }
  }

  /**
   * Obtém a transcrição de um vídeo do YouTube
   */
  static async getTranscript(videoUrl) {
    const videoId = this.extractVideoId(videoUrl);
    
    if (!videoId) {
      throw new Error('URL do YouTube inválida. Forneça uma URL válida do YouTube.');
    }

    console.log(`📹 Obtendo transcrição do vídeo: ${videoId}`);
    
    // Obter metadados do vídeo primeiro
    const metadata = await this.getVideoMetadata(videoId);
    
    // Selecionar user agent aleatório
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    let transcript = null;
    let fullText = '';

    // Método 1: Tentar com youtube-transcript-plus
    try {
      console.log('📥 Tentando método 1 (youtube-transcript-plus)...');
      console.log(`   User-Agent: ${userAgent.substring(0, 50)}...`);
      
      // Tentar português primeiro
      try {
        console.log('   Tentando idioma: pt');
        transcript = await fetchTranscript(videoId, { lang: 'pt', userAgent });
        console.log(`   ✓ PT funcionou: ${transcript.length} segmentos`);
      } catch (ptError) {
        console.log(`   ✗ PT falhou: ${ptError.message}`);
        try {
          console.log('   Tentando idioma: en');
          transcript = await fetchTranscript(videoId, { lang: 'en', userAgent });
          console.log(`   ✓ EN funcionou: ${transcript.length} segmentos`);
        } catch (enError) {
          console.log(`   ✗ EN falhou: ${enError.message}`);
          console.log('   Tentando sem especificar idioma');
          transcript = await fetchTranscript(videoId, { userAgent });
          console.log(`   ✓ Sem idioma funcionou: ${transcript.length} segmentos`);
        }
      }

      if (transcript && transcript.length > 0) {
        fullText = transcript.map(segment => segment.text).join(' ');
        console.log(`✅ Transcrição obtida (método 1): ${fullText.length} caracteres`);
      }
    } catch (method1Error) {
      console.log(`⚠️ Método 1 falhou completamente: ${method1Error.message}`);
      console.log(`   Stack: ${method1Error.stack?.substring(0, 200)}`);
    }

    // Método 2: Fallback via scraping direto
    if (!fullText || fullText.length < 100) {
      console.log(`🔄 Método 1 retornou ${fullText.length} caracteres, tentando método 2...`);
      try {
        const directResult = await this.getTranscriptDirect(videoId);
        if (directResult && directResult.fullText) {
          fullText = directResult.fullText;
          transcript = directResult.segments;
          console.log(`✅ Transcrição obtida (método 2): ${fullText.length} caracteres`);
        }
      } catch (method2Error) {
        console.log(`⚠️ Método 2 falhou: ${method2Error.message}`);
        console.log(`   Stack: ${method2Error.stack?.substring(0, 200)}`);
      }
    }

    // Se nenhum método funcionou
    if (!fullText || fullText.length < 50) {
      const errorMsg = `Este vídeo não possui legendas/transcrição disponíveis ou houve erro ao acessá-las. Caracteres obtidos: ${fullText.length}. Tente outro vídeo com legendas ativadas.`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
      
    return {
      videoId,
      text: fullText,
      segments: transcript || [],
      duration: transcript && transcript.length > 0 ? (transcript[transcript.length - 1].offset || 0) + (transcript[transcript.length - 1].duration || 0) : 0,
      metadata: metadata
    };
  }

  /**
   * Analisa a transcrição e identifica possíveis tópicos para matérias
   * @param {string} transcriptText - Texto da transcrição
   * @param {object} metadata - Metadados do vídeo (título, descrição, canal)
   */
  static async analyzeTopics(transcriptText, metadata = {}) {
    console.log('🔍 Analisando tópicos da transcrição...');
    
    // Construir contexto com metadados do vídeo
    let videoContext = '';
    if (metadata.title) {
      videoContext += `TÍTULO DO VÍDEO: ${metadata.title}\n`;
    }
    if (metadata.channel) {
      videoContext += `CANAL/AUTOR: ${metadata.channel}\n`;
    }
    if (metadata.description) {
      videoContext += `DESCRIÇÃO DO VÍDEO: ${metadata.description}\n`;
    }

    const messages = [
      {
        role: 'system',
        content: 'Você é um editor de notícias experiente especializado em identificar pautas jornalísticas em conteúdos de vídeo. Você SEMPRE usa as informações corretas sobre quem está falando no vídeo, baseando-se no título, canal e descrição fornecidos.'
      },
      {
        role: 'user',
        content: `Analise a transcrição abaixo e identifique os principais tópicos/assuntos que podem se tornar matérias jornalísticas separadas.

⚠️ INFORMAÇÕES IMPORTANTES DO VÍDEO (USE ESTAS INFORMAÇÕES PARA IDENTIFICAR CORRETAMENTE QUEM ESTÁ FALANDO):
${videoContext}

Para cada tópico identificado, forneça:
1. Um título sugestivo para a matéria (USANDO O NOME CORRETO da pessoa que está falando, conforme o título/descrição do vídeo)
2. Um breve resumo do que será abordado
3. Os trechos relevantes da transcrição

⚠️ REGRA CRÍTICA: Use SEMPRE o nome correto da pessoa mencionada no título ou descrição do vídeo. Por exemplo, se o título diz "HERNANDES DIAS LOPES", a matéria deve mencionar "Hernandes Dias Lopes" e NÃO outro nome.

TRANSCRIÇÃO:
${transcriptText.substring(0, 15000)}

Responda em formato JSON:
{
  "topics": [
    {
      "title": "Título sugestivo da matéria (com nome correto)",
      "summary": "Breve resumo do assunto",
      "relevantContent": "Trechos da transcrição relacionados a este tópico",
      "speaker": "Nome da pessoa principal que está falando (extraído do título/descrição)"
    }
  ]
}

Identifique entre 1 e 5 tópicos principais. Se o vídeo trata de um único assunto, retorne apenas 1 tópico.`
      }
    ];

    try {
      const response = await AIService.makeRequest(messages, 0.5, 3000);
      
      // Extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`✅ ${parsed.topics.length} tópico(s) identificado(s)`);
      
      return parsed.topics;
    } catch (error) {
      console.error('❌ Erro ao analisar tópicos:', error);
      
      // Fallback: retornar um único tópico com toda a transcrição
      return [{
        title: 'Matéria baseada no vídeo',
        summary: 'Conteúdo extraído da transcrição do vídeo',
        relevantContent: transcriptText.substring(0, 5000)
      }];
    }
  }

  /**
   * Gera uma matéria no estilo G1/Metrópoles a partir de um tópico
   */
  static async generateArticle(topic, categoria = 'noticias') {
    console.log(`📝 Gerando matéria: ${topic.title}`);

    // Construir conteúdo com contexto do speaker
    let conteudo = topic.relevantContent || topic.summary;
    
    // Se temos informação sobre quem está falando, adicionar ao contexto
    if (topic.speaker) {
      conteudo = `PESSOA QUE ESTÁ FALANDO: ${topic.speaker}\n\nCONTEÚDO:\n${conteudo}`;
      console.log(`👤 Speaker identificado: ${topic.speaker}`);
    }
    
    // Usar o mesmo método do AIService para gerar matéria estilo G1
    const materia = await AIService.gerarMateriaEstiloG1(conteudo, categoria);
    
    return materia;
  }

  /**
   * Gera múltiplas matérias a partir de uma transcrição
   */
  static async generateMultipleArticles(transcriptText, categoria = 'noticias', maxArticles = 3) {
    console.log(`📰 Gerando até ${maxArticles} matérias da transcrição...`);

    // Primeiro, analisar os tópicos
    const topics = await this.analyzeTopics(transcriptText);
    
    // Limitar ao número máximo de matérias
    const topicsToProcess = topics.slice(0, maxArticles);
    
    const articles = [];
    
    for (let i = 0; i < topicsToProcess.length; i++) {
      const topic = topicsToProcess[i];
      console.log(`\n📄 Gerando matéria ${i + 1}/${topicsToProcess.length}: ${topic.title}`);
      
      try {
        const article = await this.generateArticle(topic, categoria);
        articles.push({
          ...article,
          topicTitle: topic.title,
          topicSummary: topic.summary
        });
        
        // Pequena pausa entre requisições para não sobrecarregar a API
        if (i < topicsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Erro ao gerar matéria "${topic.title}":`, error.message);
        articles.push({
          error: true,
          errorMessage: error.message,
          topicTitle: topic.title,
          topicSummary: topic.summary
        });
      }
    }

    console.log(`\n✅ ${articles.filter(a => !a.error).length} matéria(s) gerada(s) com sucesso`);
    
    return articles;
  }

  /**
   * Processo completo: transcrever vídeo e gerar matérias
   */
  static async processVideo(videoUrl, categoria = 'noticias', maxArticles = 3) {
    console.log('\n🎬 Iniciando processamento do vídeo...');
    console.log(`URL: ${videoUrl}`);
    console.log(`Categoria: ${categoria}`);
    console.log(`Máximo de matérias: ${maxArticles}`);

    // 1. Obter transcrição
    const transcript = await this.getTranscript(videoUrl);
    
    if (transcript.text.length < 100) {
      throw new Error('Transcrição muito curta para gerar matérias. O vídeo precisa ter mais conteúdo falado.');
    }

    // 2. Gerar matérias
    const articles = await this.generateMultipleArticles(transcript.text, categoria, maxArticles);

    return {
      videoId: transcript.videoId,
      transcriptLength: transcript.text.length,
      transcript: transcript.text,
      articles
    };
  }
}

module.exports = YouTubeTranscriptService;
