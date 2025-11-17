/**
 * Script para converter imagens JPG/PNG para WebP
 * Reduz o tamanho das imagens em até 30-80%
 * 
 * Uso: node scripts/convert-to-webp.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../public/uploads');

// Verificar se sharp está instalado
try {
  require.resolve('sharp');
} catch(e) {
  console.error('❌ Sharp não está instalado!');
  console.log('📦 Instale com: npm install sharp');
  process.exit(1);
}

// Função para converter uma imagem
async function convertToWebP(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Apenas converter JPG, JPEG e PNG
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return null;
  }
  
  const fileName = path.basename(filePath, ext);
  const outputPath = path.join(path.dirname(filePath), `${fileName}.webp`);
  
  // Pular se já existe
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Já existe: ${path.basename(outputPath)}`);
    return null;
  }
  
  try {
    const info = await sharp(filePath)
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);
    
    const originalSize = fs.statSync(filePath).size;
    const newSize = info.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(filePath)} → ${path.basename(outputPath)}`);
    console.log(`   📊 ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (economia de ${savings}%)`);
    
    return { originalSize, newSize, savings };
  } catch (error) {
    console.error(`❌ Erro ao converter ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando conversão de imagens para WebP...\n');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error(`❌ Diretório não encontrado: ${uploadsDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });
  
  if (imageFiles.length === 0) {
    console.log('ℹ️  Nenhuma imagem JPG/PNG encontrada para converter.');
    return;
  }
  
  console.log(`📁 Encontradas ${imageFiles.length} imagens para converter\n`);
  
  let totalOriginal = 0;
  let totalNew = 0;
  let converted = 0;
  
  for (const file of imageFiles) {
    const filePath = path.join(uploadsDir, file);
    const result = await convertToWebP(filePath);
    
    if (result) {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      converted++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA CONVERSÃO');
  console.log('='.repeat(60));
  console.log(`✅ Imagens convertidas: ${converted}/${imageFiles.length}`);
  
  const originalMB = (totalOriginal / 1024 / 1024).toFixed(2);
  const newMB = (totalNew / 1024 / 1024).toFixed(2);
  const savingsMB = ((totalOriginal - totalNew) / 1024 / 1024).toFixed(2);
  const savingsPercent = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);
  
  console.log(`📦 Tamanho original: ${originalMB} MB`);
  console.log(`📦 Tamanho WebP: ${newMB} MB`);
  console.log(`💾 Economia total: ${savingsMB} MB (${savingsPercent}%)`);
  console.log('='.repeat(60));
  
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Teste as imagens WebP no site');
  console.log('2. Se tudo estiver OK, você pode deletar as imagens originais');
  console.log('3. Atualize o código para usar .webp ao invés de .jpg/.png');
}

// Executar
main().catch(console.error);
