// Script para testar a função convertToAMP
// Execute: node test_amp_fix.js

// HTML problemático do Google Search Console
const htmlProblematico = `<div class="article-content"><p><a href="/noticias/morre-pastor-valdeci-luiz-o-papa-gospel-aos-61-anos" title="Artistas gospel que morreram em 2025 e você não sabia" class="internal-link target=" _blank"="">Morreu aos 61 anos o pastor Valdeci Luiz</a>, conhecido como Papa Gospel, figura influente nos bastidores do cenário evangélico brasileiro. O <a href="/noticias/artistas-gospel-que-morreram-em-2025-e-voce-nao-sabia" title="Artistas gospel que morreram em 2025 e você não sabia" class="internal-link">falecimento ocorreu em 7 de dezembro de 2025</a>, conforme informações divulgadas.</p></div>`;

function convertToAMP(html) {
  if (!html) return '';
  let ampHtml = html;

  // 12.1. LIMPEZA AGRESSIVA DE LINKS - Remover TODOS os atributos exceto href
  ampHtml = ampHtml.replace(/<a\s+([^>]*)>/gi, (match, attrs) => {
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
    if (!hrefMatch) {
      const hrefAlt = attrs.match(/href\s*=\s*([^\s>]+)/i);
      if (hrefAlt) {
        return `<a href="${hrefAlt[1].replace(/["']/g, '')}">`;
      }
      return match;
    }
    return `<a href="${hrefMatch[1]}">`;
  });

  return ampHtml;
}

console.log('=== HTML ORIGINAL (PROBLEMÁTICO) ===');
console.log(htmlProblematico);
console.log('\n=== HTML CORRIGIDO ===');
console.log(convertToAMP(htmlProblematico));
console.log('\n=== VERIFICAÇÃO ===');
const resultado = convertToAMP(htmlProblematico);
if (resultado.includes('class=') || resultado.includes('title=') || resultado.includes('target=')) {
  console.log('❌ ERRO: Ainda contém atributos proibidos!');
} else {
  console.log('✅ SUCESSO: Links limpos corretamente!');
}
