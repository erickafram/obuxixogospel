/**
 * Script para sincronizar as tabelas de formulários
 * Execute com: node scripts/sync-forms.js
 */

const { sequelize, Form, FormSubmission, Page } = require('../models');

async function syncForms() {
  try {
    console.log('🔄 Sincronizando tabelas de formulários...');
    
    // Sincronizar apenas as tabelas de Form e FormSubmission
    await Form.sync({ alter: true });
    console.log('✅ Tabela "forms" sincronizada');
    
    await FormSubmission.sync({ alter: true });
    console.log('✅ Tabela "form_submissions" sincronizada');
    
    // Atualizar tabela Page para incluir formId
    await Page.sync({ alter: true });
    console.log('✅ Tabela "pages" atualizada com campo formId');
    
    console.log('\n🎉 Sincronização concluída com sucesso!');
    console.log('\nAgora você pode:');
    console.log('1. Acessar /dashboard/formularios para criar formulários');
    console.log('2. Vincular formulários às páginas em /dashboard/paginas');
    console.log('3. Ver submissões em /dashboard/formularios/:id/submissoes');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
    process.exit(1);
  }
}

syncForms();
