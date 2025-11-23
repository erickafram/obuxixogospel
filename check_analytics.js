const { SystemConfig } = require('./models');

async function check() {
    try {
        const config = await SystemConfig.findOne({
            where: { chave: 'analytics_google' }
        });
        console.log('VALUE_START');
        console.log(config ? `"${config.valor}"` : 'NULL');
        console.log('VALUE_END');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

check();
