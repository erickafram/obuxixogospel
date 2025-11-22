/**
 * Testar artigo específico que estava com erro no Google Search Console
 */

const db = require('./models');
const ejs = require('ejs');
const path = require('path');

async function testSpecificArticle() {
    try {
        console.log('🔍 Testando artigo específico...\n');

        // Buscar o artigo pela URL amigável
        const article = await db.Article.findOne({
            where: {
                urlAmigavel: 'afastamento-de-pastora-vereadora-gera-especulacoes-politicas'
            }
        });

        if (!article) {
            console.log('❌ Artigo não encontrado');
            process.exit(1);
        }

        console.log(`📄 Artigo: ${article.titulo}`);
        console.log(`   URL: /noticias/${article.urlAmigavel}\n`);

        const categoryNames = {
            'noticias': 'Notícias',
            'musica': 'Música',
            'eventos': 'Eventos',
            'entrevistas': 'Entrevistas',
            'artigos': 'Artigos',
            'videos': 'Vídeos'
        };

        // Renderizar o template
        const templatePath = path.join(__dirname, 'views', 'partials', 'article-head.ejs');
        const html = await ejs.renderFile(templatePath, {
            article: article.toJSON(),
            categoryNames,
            categories: []
        });

        // Extrair todos os blocos JSON-LD
        const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

        if (!jsonLdMatches) {
            console.log('❌ Nenhum JSON-LD encontrado');
            process.exit(1);
        }

        console.log(`✓ Encontrados ${jsonLdMatches.length} blocos JSON-LD\n`);

        // Validar e exibir cada bloco JSON-LD
        jsonLdMatches.forEach((match, index) => {
            const jsonContent = match
                .replace(/<script type="application\/ld\+json">/, '')
                .replace(/<\/script>/, '')
                .trim();

            try {
                const parsed = JSON.parse(jsonContent);
                console.log(`✅ JSON-LD ${index + 1} - ${parsed['@type']} VÁLIDO`);
                
                // Exibir informações importantes
                if (parsed['@type'] === 'NewsArticle') {
                    console.log(`   Título: ${parsed.headline}`);
                    console.log(`   Descrição: ${parsed.description.substring(0, 80)}...`);
                    console.log(`   Autor: ${parsed.author.name}`);
                    console.log(`   Data: ${parsed.datePublished}`);
                }
                console.log('');
            } catch (jsonError) {
                console.log(`❌ JSON-LD ${index + 1} INVÁLIDO:`);
                console.log(`   Erro: ${jsonError.message}`);
                console.log(`   Linha do erro: ${jsonError.message.match(/position (\d+)/)?.[1] || 'desconhecida'}`);
                console.log('\n   Conteúdo JSON:');
                console.log(jsonContent);
                console.log('\n');
                process.exit(1);
            }
        });

        console.log('='.repeat(60));
        console.log('✅ ARTIGO VALIDADO COM SUCESSO!');
        console.log('   Todos os dados estruturados estão corretos');
        console.log('   Pode solicitar nova inspeção no Google Search Console');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erro ao executar teste:', error);
        process.exit(1);
    }

    process.exit(0);
}

testSpecificArticle();
