const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Serviço para solicitar indexação automática no Google
 * Usa Google Indexing API para notificar o Google sobre novas páginas
 */
class GoogleIndexingService {
  constructor() {
    this.auth = null;
    this.indexing = null;
    this.enabled = false;
  }

  /**
   * Inicializar serviço com credenciais
   */
  async initialize() {
    try {
      const keyPath = path.join(__dirname, '../config/google-service-account.json');
      
      // Verificar se arquivo de credenciais existe
      if (!fs.existsSync(keyPath)) {
        console.log('⚠️ Google Indexing API: Credenciais não encontradas');
        console.log('📝 Para ativar, siga: GOOGLE-INDEXING-API.md');
        this.enabled = false;
        return false;
      }

      // Carregar credenciais
      const key = require(keyPath);
      
      // Autenticar
      this.auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ['https://www.googleapis.com/auth/indexing']
      });

      this.indexing = google.indexing({
        version: 'v3',
        auth: this.auth
      });

      this.enabled = true;
      console.log('✅ Google Indexing API inicializada');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Google Indexing API:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Solicitar indexação de uma URL
   * @param {string} url - URL completa do artigo
   * @param {string} type - Tipo: 'URL_UPDATED' ou 'URL_DELETED'
   */
  async requestIndexing(url, type = 'URL_UPDATED') {
    if (!this.enabled) {
      console.log('⚠️ Google Indexing API não está ativada');
      return { success: false, reason: 'API não ativada' };
    }

    try {
      const response = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: type
        }
      });

      console.log(`✅ Indexação solicitada: ${url}`);
      return { 
        success: true, 
        data: response.data,
        message: 'Indexação solicitada com sucesso'
      };
    } catch (error) {
      console.error(`❌ Erro ao solicitar indexação de ${url}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Verificar status de indexação de uma URL
   * @param {string} url - URL completa do artigo
   */
  async getIndexingStatus(url) {
    if (!this.enabled) {
      return { success: false, reason: 'API não ativada' };
    }

    try {
      const response = await this.indexing.urlNotifications.getMetadata({
        url: url
      });

      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Solicitar indexação de múltiplas URLs (batch)
   * @param {Array<string>} urls - Array de URLs
   */
  async requestBatchIndexing(urls) {
    if (!this.enabled) {
      return { success: false, reason: 'API não ativada' };
    }

    const results = [];
    
    for (const url of urls) {
      // Aguardar 1 segundo entre requisições (rate limit)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await this.requestIndexing(url);
      results.push({ url, ...result });
    }

    return {
      success: true,
      total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Notificar remoção de URL (para artigos deletados)
   * @param {string} url - URL completa do artigo
   */
  async notifyUrlDeleted(url) {
    return await this.requestIndexing(url, 'URL_DELETED');
  }
}

// Singleton
const googleIndexingService = new GoogleIndexingService();

module.exports = googleIndexingService;
