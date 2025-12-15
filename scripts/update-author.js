const { Article } = require('../models');

async function updateAuthorName() {
    console.log('🔧 Atualizando autor: Redação Obuxixo -> Ronaldo Dias');

    try {
        const [updatedCount] = await Article.update(
            { autor: 'Ronaldo Dias' }, // Novo nome
            {
                where: {
                    autor: 'Redação Obuxixo Gospel' // Nome antigo (verifiquei no model que o default é esse)
                }
            }
        );

        // Também atualizar variações se houver
        const [updatedCount2] = await Article.update(
            { autor: 'Ronaldo Dias' },
            { where: { autor: 'Redação' } }
        );

        console.log(`✅ Atualizado com sucesso!`);
        console.log(`- Matérias da 'Redação Obuxixo Gospel': ${updatedCount}`);
        console.log(`- Matérias da 'Redação': ${updatedCount2}`);
        console.log(`Total alterado: ${updatedCount + updatedCount2}`);

    } catch (error) {
        console.error('❌ Erro ao atualizar autor:', error);
    } finally {
        process.exit();
    }
}

// Executar
updateAuthorName();
