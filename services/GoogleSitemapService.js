const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Service to interact with Google Search Console API
 * specifically for Sitemap management.
 */
class GoogleSitemapService {
    constructor() {
        this.auth = null;
        this.webmasters = null;
        this.enabled = false;
        this.siteUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
        // Define sitemaps to manage
        this.sitemaps = [
            `${this.siteUrl}/sitemap.xml`,
            `${this.siteUrl}/news-sitemap.xml`
        ];
    }

    /**
     * Initialize the service with credentials
     */
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
                    console.log('✅ Google Sitemap Service: Credentials found at', keyPath);
                    break;
                }
            }

            if (!keyPath) {
                console.error('⚠️ Google Sitemap Service: Credentials file NOT found. Checked:', possiblePaths);
                this.enabled = false;
                return false;
            }

            // Load credentials
            const key = require(keyPath);

            // Authenticate with Search Console scope
            this.auth = new google.auth.GoogleAuth({
                credentials: key,
                scopes: ['https://www.googleapis.com/auth/webmasters']
            });

            this.webmasters = google.webmasters({
                version: 'v3',
                auth: this.auth
            });

            this.enabled = true;
            console.log('✅ Google Sitemap Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing Google Sitemap Service:', error.message);
            this.enabled = false;
            return false;
        }
    }

    /**
     * Delete and Resubmit Sitemaps to force Google to refresh
     */
    async refreshSitemaps() {
        if (!this.enabled) {
            const initialized = await this.initialize();
            if (!initialized) return { success: false, message: 'Service not enabled' };
        }

        const results = [];

        for (const sitemapUrl of this.sitemaps) {
            try {
                console.log(`🔄 Refreshing sitemap: ${sitemapUrl}`);

                // 1. Delete the sitemap (if it exists)
                try {
                    await this.webmasters.sitemaps.delete({
                        siteUrl: this.siteUrl,
                        feedpath: sitemapUrl
                    });
                    console.log(`   - Deleted: ${sitemapUrl}`);
                } catch (deleteError) {
                    // Ignore 404s (sitemap didn't exist yet)
                    if (deleteError.code !== 404) {
                        console.warn(`   - Warning deleting ${sitemapUrl}: ${deleteError.message}`);
                    }
                }

                // 2. Submit the sitemap
                await this.webmasters.sitemaps.submit({
                    siteUrl: this.siteUrl,
                    feedpath: sitemapUrl
                });
                console.log(`   - Submitted: ${sitemapUrl}`);

                results.push({ sitemap: sitemapUrl, status: 'success' });

            } catch (error) {
                console.error(`❌ Error processing ${sitemapUrl}:`, error.message);
                results.push({ sitemap: sitemapUrl, status: 'error', error: error.message });
            }
        }

        return { success: true, results };
    }
}

const googleSitemapService = new GoogleSitemapService();
module.exports = googleSitemapService;
