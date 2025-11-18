/**
 * Script para converter imagens JPG antigas para WebP
 * Melhora performance e reduz tamanho dos arquivos
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Media, Article } = require('../models');

async function convertImagesToWebP() {
  console.log('🚀 Iniciando conversão de imagens para WebP...\n');
  
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  
  // Ler todos os arquivos do diretório
  const files = fs.readdirSync(uploadsDir);
  
  // Filtrar apenas JPG e PNG
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
  });
  
  console.log(`📊 Encontradas ${imageFiles.length} imagens para converter\n`);
  
  let converted = 0;
  let errors = 0;
  let totalSaved = 0;
  
  for (const file of imageFiles) {
    try {
      const inputPath = path.join(uploadsDir, file);
      const fileNameWithoutExt = path.parse(file).name;
      const webpFileName = `${fileNameWithoutExt}.webp`;
      const outputPath = path.join(uploadsDir, webpFileName);
      
      // Verificar se já existe WebP
      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  Pulando ${file} (WebP já existe)`);
        continue;
      }
      
      // Pegar tamanho original
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      
      // Converter para WebP
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(outputPath);
      
      // Pegar tamanho novo
      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;
      const saved = originalSize - newSize;
      const savedPercent = ((saved / originalSize) * 100).toFixed(1);
      
      totalSaved += saved;
      
      console.log(`✅ ${file} → ${webpFileName}`);
      console.log(`   ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (economizou ${savedPercent}%)\n`);
      
      // Atualizar banco de dados
      try {
        // Atualizar tabela Media
        await Media.update(
          {
            nome: webpFileName,
            url: `/uploads/${webpFileName}`,
            mimeType: 'image/webp',
            tamanho: newSize
          },
          {
            where: { nome: file }
          }
        );
        
        // Atualizar artigos que usam essa imagem
        const articles = await Article.findAll({
          where: {
            imagemDestaque: `/uploads/${file}`
          }
        });
        
        for (const article of articles) {
          await article.update({
            imagemDestaque: `/uploads/${webpFileName}`
          });
          console.log(`   📝 Artigo atualizado: ${article.titulo.substring(0, 50)}...`);
        }
        
        // Atualizar conteúdo dos artigos
        const articlesWithImageInContent = await Article.findAll();
        for (const article of articlesWithImageInContent) {
          if (article.conteudo && article.conteudo.includes(`/uploads/${file}`)) {
            const newContent = article.conteudo.replace(
              new RegExp(`/uploads/${file}`, 'g'),
              `/uploads/${webpFileName}`
            );
            await article.update({ conteudo: newContent });
            console.log(`   📄 Conteúdo atualizado: ${article.titulo.substring(0, 50)}...`);
          }
        }
        
      } catch (dbError) {
        console.log(`   ⚠️  Erro ao atualizar banco: ${dbError.message}`);
      }
      
      // Deletar arquivo original (opcional - comentado por segurança)
      // fs.unlinkSync(inputPath);
      // console.log(`   🗑️  Arquivo original deletado`);
      
      converted++;
      
    } catch (error) {
      console.error(`❌ Erro ao converter ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA CONVERSÃO');
  console.log('='.repeat(60));
  console.log(`✅ Convertidas: ${converted}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`💾 Total economizado: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
  console.log('='.repeat(60));
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('Os arquivos originais foram mantidos por segurança.');
  console.log('Após verificar que tudo está funcionando, você pode deletá-los manualmente.');
  console.log('\nPara deletar os originais automaticamente, descomente a linha 96 do script.\n');
}

// Executar
convertImagesToWebP()
  .then(() => {
    console.log('✅ Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
