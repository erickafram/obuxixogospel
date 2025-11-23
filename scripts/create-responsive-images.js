/**
 * Script para criar versões responsivas das imagens
 * Gera 3 tamanhos: small (400px), medium (800px), large (1200px)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZES = {
  small: 400,
  medium: 800,
  large: 1200
};

async function createResponsiveImages() {
  console.log('🚀 Criando versões responsivas das imagens...\n');
  
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  
  // Ler todos os arquivos
  const files = fs.readdirSync(uploadsDir);
  
  // Filtrar apenas WebP e imagens grandes
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ext === '.webp' || ext === '.jpg' || ext === '.jpeg' || ext === '.png';
  });
  
  console.log(`📊 Encontradas ${imageFiles.length} imagens\n`);
  
  let processed = 0;
  let errors = 0;
  
  for (const file of imageFiles) {
    try {
      const inputPath = path.join(uploadsDir, file);
      const fileNameWithoutExt = path.parse(file).name;
      const ext = path.parse(file).ext;
      
      // Pegar metadados da imagem
      const metadata = await sharp(inputPath).metadata();
      
      // Só processar se for maior que 400px
      if (metadata.width <= 400) {
        console.log(`⏭️  Pulando ${file} (já é pequena: ${metadata.width}px)`);
        continue;
      }
      
      console.log(`📸 Processando ${file} (${metadata.width}x${metadata.height})`);
      
      // Criar versões responsivas
      for (const [sizeName, width] of Object.entries(SIZES)) {
        // Pular se a imagem já é menor que o tamanho desejado
        if (metadata.width <= width) {
          console.log(`   ⏭️  Pulando ${sizeName} (imagem menor que ${width}px)`);
          continue;
        }
        
        const outputFileName = `${fileNameWithoutExt}-${sizeName}${ext}`;
        const outputPath = path.join(uploadsDir, outputFileName);
        
        // Verificar se já existe
        if (fs.existsSync(outputPath)) {
          console.log(`   ⏭️  ${sizeName} já existe`);
          continue;
        }
        
        // Redimensionar e converter para WebP
        await sharp(inputPath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ quality: 85 })
          .toFile(outputPath.replace(ext, '.webp'));
        
        const stats = fs.statSync(outputPath.replace(ext, '.webp'));
        console.log(`   ✅ ${sizeName}: ${(stats.size / 1024).toFixed(1)} KB`);
      }
      
      processed++;
      console.log('');
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));
  console.log(`✅ Processadas: ${processed}`);
  console.log(`❌ Erros: ${errors}`);
  console.log('='.repeat(60));
  
  console.log('\n💡 PRÓXIMO PASSO:');
  console.log('Atualizar os templates para usar srcset com as novas imagens.\n');
}

// Executar
createResponsiveImages()
  .then(() => {
    console.log('✅ Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
