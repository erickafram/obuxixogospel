require('dotenv').config();
const { sequelize } = require('./models');
const AIService = require('./services/AIService');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Conexão com banco de dados estabelecida.');

        const textoRobo = `
        O vídeo publicado no perfil oficial do Instagram @cantor_famoso mostra o momento exato em que ele tropeça no palco.
        A publicação já conta com mais de 50 mil curtidas e 2 mil comentários.
        Na legenda, o cantor escreveu: "Acontece nas melhores famílias".
        Segundo informações do site Fuxico, o show aconteceu em São Paulo.
        O vídeo viralizou rapidamente nas redes sociais.
        `;

        console.log('\n--- Testando Reescrever Matéria (Estilo G1) ---');
        console.log('Texto Original:', textoRobo);

        const resultado = await AIService.reescreverMateriaG1(textoRobo);

        console.log('\nResultado G1:');
        console.log(resultado);

        console.log('\n--- Verificações ---');
        if (resultado.includes('@cantor_famoso') || resultado.includes('perfil oficial') || resultado.includes('curtidas')) {
            console.log('❌ FALHA: O texto ainda contém referências robóticas ou de redes sociais.');
        } else {
            console.log('✅ SUCESSO: Referências diretas a redes sociais parecem ter sido removidas.');
        }

        if (resultado.length > textoRobo.length) {
            console.log('✅ SUCESSO: O texto parece ter sido expandido/enriquecido.');
        }

    } catch (error) {
        console.error('Erro no teste:', error);
    } finally {
        await sequelize.close();
    }
}

test();
