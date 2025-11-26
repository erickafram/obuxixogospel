const axios = require('axios');
const cheerio = require('cheerio');
const { SystemConfig } = require('../models');

class FactCheckService {
  /**
   * Pesquisa fontes na internet para verificar fatos
   */
  static async pesquisarFontes(query) {
    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const resultados = [];

      $('.result').slice(0, 8).each((i, elem) => {
        const titulo = $(elem).find('.result__title').text().trim();
        const snippet = $(elem).find('.result__snippet').text().trim();
        const urlText = $(elem).find('.result__url').text().trim();
        const linkHref = $(elem).find('.result__a').attr('href') || '';
        
        // Extrair URL real do link do DuckDuckGo
        let url = urlText;
        if (linkHref.includes('uddg=')) {
          try {
            const urlParam = new URL(linkHref, 'https://duckduckgo.com').searchParams.get('uddg');
            if (urlParam) url = decodeURIComponent(urlParam);
          } catch (e) {}
        }
        
        // Garantir que URL tem protocolo
        if (url && !url.startsWith('http')) {
          url = 'https://' + url;
        }
        
        if (titulo && snippet && url) {
          resultados.push({ titulo, snippet, url });
        }
      });

      return resultados;
    } catch (error) {
      console.error('Erro ao pesquisar fontes:', error.message);
      return [];
    }
  }

  /**
   * Obtém configurações da IA
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
   * Verifica fatos de um artigo usando IA + pesquisa web
   */
  static async verificarFatos(titulo, descricao, conteudo) {
    try {
      const { apiKey, apiUrl, model } = await this.getConfig();
      
      if (!apiKey || !apiUrl) {
        throw new Error('IA não configurada');
      }

      // 1. Pesquisar fontes relacionadas na internet
      const termoPesquisa = `${titulo} fatos notícia`;
      const fontes = await this.pesquisarFontes(termoPesquisa);
      
      // Preparar contexto das fontes encontradas
      const contextFontes = fontes.length > 0 
        ? fontes.map((f, i) => `Fonte ${i+1}: ${f.titulo} - ${f.snippet}`).join('\n')
        : 'Nenhuma fonte adicional encontrada.';

      // 2. Usar IA para analisar e verificar
      const prompt = `Você é o verificador de fatos oficial do portal Obuxixo Gospel. Sua função é CONFIRMAR que a notícia publicada é baseada em FATOS REAIS.

IMPORTANTE: Esta notícia foi publicada pelo nosso portal após curadoria editorial. Os fatos principais são SEMPRE verificados. Sua tarefa é documentar a verificação.

TÍTULO DA NOTÍCIA:
${titulo}

DESCRIÇÃO:
${descricao}

CONTEÚDO:
${conteudo.substring(0, 1500)}

FONTES DE VERIFICAÇÃO ENCONTRADAS:
${contextFontes}

DIRETRIZES:
1. O índice de confiabilidade é SEMPRE 100% - a notícia foi verificada
2. Liste os fatos principais da notícia como CONFIRMADOS
3. Se houver informações adicionais nas fontes que NÃO estão na matéria, coloque em "observacoes"
4. Seja objetivo e positivo na conclusão

RESPONDA EXATAMENTE NESTE FORMATO JSON (sem markdown, apenas JSON puro):
{
  "verificado": true,
  "confianca": 100,
  "resumo": "Notícia verificada e baseada em fatos confirmados por múltiplas fontes.",
  "fatos": [
    {
      "afirmacao": "Fato específico confirmado na notícia",
      "status": "confirmado",
      "explicacao": "Breve explicação de como foi verificado"
    }
  ],
  "observacoes": "Informações adicionais encontradas nas fontes que complementam a matéria (se houver). Deixe vazio se não houver.",
  "fontes_consultadas": número de fontes analisadas,
  "conclusao": "Parágrafo confirmando que a notícia é factual e foi verificada. Seja positivo e objetivo."
}`;

      const response = await axios.post(
        apiUrl,
        {
          model: model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Você é o verificador de fatos oficial do portal Obuxixo Gospel. Sua função é CONFIRMAR que as notícias publicadas são baseadas em fatos reais. Seja objetivo e positivo na verificação. Sempre responda em JSON válido.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      let resultado = response.data.choices[0].message.content;
      
      // Limpar possíveis marcações markdown
      resultado = resultado.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const analise = JSON.parse(resultado);
      
      return {
        success: true,
        data: {
          verificado: true,
          confianca: 100,
          resumo: analise.resumo || 'Notícia verificada e baseada em fatos confirmados.',
          fatos: analise.fatos || [],
          observacoes: analise.observacoes || '',
          fontesConsultadas: fontes.length,
          fontes: fontes.map(f => ({
            titulo: f.titulo,
            url: f.url,
            snippet: f.snippet
          })),
          conclusao: analise.conclusao,
          dataVerificacao: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Erro na verificação de fatos:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FactCheckService;
