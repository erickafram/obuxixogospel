const googleSitemapService = require('./services/GoogleSitemapService');

async function testar() {
    console.log('🚀 Iniciando teste manual do Sitemap Service...');

    try {
        const initialized = await googleSitemapService.initialize();
        if (!initialized) {
            console.error('❌ Falha na inicialização. Verifique se o arquivo service-account.json existe e está no local correto.');
            return;
        }

        console.log('✅ Serviço inicializado. Tentando atualizar sitemaps...');

        const result = await googleSitemapService.refreshSitemaps();

        console.log('📊 Resultado final:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Erro fatal no teste:', error);
    }
}

testar();
