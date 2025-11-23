'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { QueryTypes } = Sequelize;
    
    // Verificar se a configuração já existe
    const existing = await queryInterface.sequelize.query(
      "SELECT * FROM configuracoes_sistema WHERE chave = 'amp_habilitado'",
      { type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      // Inserir configuração AMP
      await queryInterface.sequelize.query(`
        INSERT INTO configuracoes_sistema (chave, valor, descricao, created_at, updated_at)
        VALUES 
        ('amp_habilitado', 'true', 'Habilitar páginas AMP (Accelerated Mobile Pages)', NOW(), NOW()),
        ('amp_analytics_id', '', 'ID do Google Analytics para páginas AMP', NOW(), NOW()),
        ('amp_adsense_id', '', 'ID do Google AdSense para páginas AMP', NOW(), NOW())
      `);
      console.log('✅ Configurações AMP adicionadas com sucesso!');
    } else {
      console.log('⚠️ Configurações AMP já existem, pulando...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DELETE FROM configuracoes_sistema 
      WHERE chave IN ('amp_habilitado', 'amp_analytics_id', 'amp_adsense_id')
    `);
  }
};
