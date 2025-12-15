const { Article, Category, Page } = require('../models');
const GoogleIndexingService = require('../services/GoogleIndexingService');
const { Op } = require('sequelize');

async function indexAll() {
    console.log('🚀 Iniciando indexação em massa para o Google...');

    try {
        const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';

        // 1. Indexar Home e Páginas Estáticas Principais
        const mainPages = [
            '/',
            '/busca',
            '/contato',
            '/sobre-nos' // Exemplo, adicione outras se tiver
        ];

        console.log(`\n📋 Indexando ${mainPages.length} páginas principais...`);
        for (const path of mainPages) {
            const url = `${baseUrl}${path}`;
            await GoogleIndexingService.publishUrl(url);
            await new Promise(r => setTimeout(r, 500)); // Delay pequeno
        }

        // 2. Indexar Categorias
        const categories = await Category.findAll();
        console.log(`\nTb 📋 Indexando ${categories.length} categorias...`);
        for (const cat of categories) {
            const url = `${baseUrl}/categoria/${cat.slug}`;
            await GoogleIndexingService.publishUrl(url);
            await new Promise(r => setTimeout(r, 500));
        }

        // 3. Indexar Artigos (Apenas os publicados)
        // Vamos pegar os 200 mais recentes para não estourar cotas se houver muitos
        const articles = await Article.findAll({
            where: {
                publicado: true,
                dataPublicacao: { [Op.lte]: new Date() }
            },
            order: [['dataPublicacao', 'DESC']],
            limit: 200
        });

        console.log(`\n📰 Indexando ${articles.length} artigos mais recentes...`);
        let successCount = 0;
        let failCount = 0;

        for (const article of articles) {
            if (article.urlAmigavel && article.categoria) {
                // Formato da URL: site.com/categoria/slug
                const url = `${baseUrl}/${article.categoria}/${article.urlAmigavel}`;

                // Enviar normal e AMP (se estiver ativado, vou enviar os dois)
                const result = await GoogleIndexingService.publishUrl(url);

                if (result.success) successCount++;
                else failCount++;

                // Opcional: Enviar versão AMP tb se quiser forçar
                // const ampUrl = `${baseUrl}/amp/${article.categoria}/${article.urlAmigavel}`;
                // await GoogleIndexingService.publishUrl(ampUrl);

                process.stdout.write(`\rProgress: ${successCount + failCount}/${articles.length}`);
                await new Promise(r => setTimeout(r, 600)); // Cota é ~600 requests/min geralmente, vamos ser conservadores
            }
        }

        console.log(`\n\n✅ Concluído!`);
        console.log(`Sucessos: ${successCount}`);
        console.log(`Falhas: ${failCount}`);

        if (failCount > 0) {
            console.log('⚠️ Se houve muitas falhas, verifique se o arquivo service-account.json está correto e se a API Indexing está ativada no Google Cloud.');
        }

    } catch (error) {
        console.error('\n❌ Erro fatal no script:', error);
    } finally {
        process.exit();
    }
}

// Executar
indexAll();
