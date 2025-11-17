const googleIndexing = require('../services/GoogleIndexingService');

async function test() {
  console.log('🧪 Testando Google Indexing API...\n');
  
  // Inicializar
  console.log('📡 Inicializando serviço...');
  const initialized = await googleIndexing.initialize();
  
  if (!initialized) {
    console.log('\n❌ Falha ao inicializar');
    console.log('📝 Siga as instruções em: GOOGLE-INDEXING-API.md');
    return;
  }
  
  console.log('✅ Serviço inicializado com sucesso\n');
  
  // Testar com URL de exemplo
  const testUrl = 'https://www.obuxixogospel.com.br/';
  console.log(`📤 Solicitando indexação de: ${testUrl}`);
  console.log('⏳ Aguarde...\n');
  
  const result = await googleIndexing.requestIndexing(testUrl);
  
  if (result.success) {
    console.log('✅ Sucesso! Google foi notificado.');
    console.log('\n📊 Resposta da API:');
    console.log(JSON.stringify(result.data, null, 2));
    console.log('\n⏰ Aguarde 2-6 horas para a página ser indexada.');
  } else {
    console.log('❌ Erro ao solicitar indexação');
    console.log('Detalhes:', result.error);
    
    if (result.code === 403) {
      console.log('\n💡 Dica: Verifique se a Service Account foi adicionada no Search Console');
    }
  }
  
  console.log('\n✅ Teste concluído!');
}

// Rodar teste
test().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
