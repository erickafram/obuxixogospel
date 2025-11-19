const { SystemConfig } = require('./models');

async function checkAmpConfig() {
    try {
        const config = await SystemConfig.findOne({ where: { chave: 'amp_analytics_id' } });
        console.log('AMP Analytics ID in DB:', config ? config.valor : 'Not found');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAmpConfig();
