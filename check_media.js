const { Media } = require('./models');

async function checkRecentMedia() {
    try {
        const media = await Media.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });
        console.log('Recent Media:', media.map(m => ({
            id: m.id,
            nome: m.nome,
            url: m.url,
            createdAt: m.createdAt
        })));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRecentMedia();
