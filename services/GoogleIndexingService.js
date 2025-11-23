const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

class GoogleIndexingService {
  constructor() {
    this.auth = null;
    this.indexing = null;
    this.enabled = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Try multiple paths to find the credentials file
      const possiblePaths = [
        path.join(__dirname, '../service-account.json'), // Local dev / standard structure
        path.join(process.cwd(), 'service-account.json'), // Root of execution
        '/home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/service-account.json' // Hardcoded production path
      ];

      let keyPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          keyPath = p;
          console.log('✅ Google Indexing Service: Credentials found at', keyPath);
          break;
        }
      }

      if (!keyPath) {
        console.error('⚠️ Google Indexing Service: Credentials file NOT found. Checked:', possiblePaths);
        this.enabled = false;
        return false;
      }

      // Load credentials
      const key = require(keyPath);

      // Authenticate with Indexing API scope
      this.auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ['https://www.googleapis.com/auth/indexing']
      });

      this.indexing = google.indexing({
        version: 'v3',
        auth: this.auth
      });

      this.enabled = true;
      console.log('✅ Google Indexing Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing Google Indexing Service:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Notifies Google that a URL has been updated or created.
   * @param {string} url - The full URL of the page (e.g., https://www.obuxixogospel.com.br/noticias/titulo-do-post)
   * @returns {Promise<Object>} - The API response
   */
  async publishUrl(url) {
    if (!this.enabled) {
      const initialized = await this.initialize();
      if (!initialized) return { success: false, message: 'Service not enabled' };
    }

    try {
      console.log(`🚀 Indexing API: Publishing URL ${url}`);

      const result = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });

      console.log(`✅ Indexing API Success: ${url}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error(`❌ Indexing API Error for ${url}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notifies Google that a URL has been deleted.
   * @param {string} url - The full URL of the page
   * @returns {Promise<Object>} - The API response
   */
  async removeUrl(url) {
    if (!this.enabled) {
      const initialized = await this.initialize();
      if (!initialized) return { success: false, message: 'Service not enabled' };
    }

    try {
      console.log(`🗑️ Indexing API: Removing URL ${url}`);

      const result = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_DELETED'
        }
      });

      console.log(`✅ Indexing API Removed: ${url}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error(`❌ Indexing API Remove Error for ${url}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GoogleIndexingService();
