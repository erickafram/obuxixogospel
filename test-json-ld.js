/**
 * Script para testar a validação do JSON-LD dos artigos
 * Verifica se o JSON está bem formado e sem erros de sintaxe
 */

const db = require('./models');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

async function testJSONLD() {
    try {
        console.log('🔍 Testando JSON-LD dos artigos...\n');

        // Buscar alguns artigos para testar
        const articles = await db.Article.findAll({
            limit: 5,
            order: [['id', 'DESC']]
        });

        if (articles.length === 0) {
            console.log('❌ Nenhum artigo encontrado para testar');
            return;
        }

        console.log(`📝 Testando ${articles.length} artigos...\n`);

        const categoryNames = {
            'noticias': 'Notícias',
            'musica': 'Música',
            'eventos': 'Eventos',
            'entrevistas': 'Entrevistas',
            'artigos': 'Artigos',
            'videos': 'Vídeos'
        };

        let errorsFound = 0;

        for (const article of articles) {
            console.log(`\n📄 Testando: ${article.titulo}`);
            console.log(`   URL: /noticias/${article.urlAmigavel}`);

            try {
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
                    console.log('   ⚠️  Nenhum JSON-LD encontrado');
                    errorsFound++;
                    continue;
                }

                console.log(`   ✓ Encontrados ${jsonLdMatches.length} blocos JSON-LD`);

                // Validar cada bloco JSON-LD
                jsonLdMatches.forEach((match, index) => {
                    const jsonContent = match
                        .replace(/<script type="application\/ld\+json">/, '')
                        .replace(/<\/script>/, '')
                        .trim();

                    try {
                        const parsed = JSON.parse(jsonContent);
                        console.log(`   ✓ JSON-LD ${index + 1} válido (${parsed['@type']})`);
                    } catch (jsonError) {
                        console.log(`   ❌ JSON-LD ${index + 1} INVÁLIDO:`);
                        console.log(`      Erro: ${jsonError.message}`);
                        console.log(`      Conteúdo problemático:`);
                        console.log(jsonContent.substring(0, 200) + '...');
                        errorsFound++;
                    }
                });

            } catch (error) {
                console.log(`   ❌ Erro ao processar: ${error.message}`);
                errorsFound++;
            }
        }

        console.log('\n' + '='.repeat(60));
        if (errorsFound === 0) {
            console.log('✅ TODOS OS TESTES PASSARAM!');
            console.log('   O JSON-LD está válido e pronto para o Google Search Console');
        } else {
            console.log(`❌ ENCONTRADOS ${errorsFound} ERROS`);
            console.log('   Corrija os problemas antes de fazer deploy');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erro ao executar teste:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Executar teste
testJSONLD();
