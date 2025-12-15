const { Article, Category } = require('../models');

async function fixPoliticaTypo() {
    console.log('🔧 Iniciando correção: politicia -> politica');

    try {
        // 1. Atualizar a Categoria
        const [updatedCategories] = await Category.update(
            { slug: 'politica' }, // Novo valor
            { where: { slug: 'politicia' } } // Onde é o valor antigo
        );

        if (updatedCategories > 0) {
            console.log(`✅ Categoria corrigida: ${updatedCategories} registro(s) atualizado(s).`);
        } else {
            console.log('ℹ️ Categoria "politicia" não encontrada ou já corrigida.');
        }

        // 2. Atualizar os Artigos
        const [updatedArticles] = await Article.update(
            { categoria: 'politica' }, // Novo valor
            { where: { categoria: 'politicia' } } // Onde é o valor antigo
        );

        console.log(`✅ Artigos atualizados: ${updatedArticles} matéria(s) corrigida(s).`);

    } catch (error) {
        console.error('❌ Erro ao atualizar banco:', error);
    } finally {
        process.exit();
    }
}

// Executar
fixPoliticaTypo();
