const axios = require('axios');
const cheerio = require('cheerio');

class InstagramService {
  /**
   * Extrai os últimos posts de um perfil do Instagram
   * @param {string} profileUrl - URL do perfil (ex: https://www.instagram.com/falafarizeu/)
   * @param {number} limit - Número máximo de posts a extrair (padrão: 12)
   */
  static async extrairPostsDoPerfil(profileUrl, limit = 12) {
    try {
      console.log('🔍 Extraindo posts do perfil:', profileUrl);
      
      // Normalizar URL
      let username = profileUrl;
      if (profileUrl.includes('instagram.com/')) {
        const match = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
        username = match ? match[1] : profileUrl;
      }
      
      console.log('📱 Username:', username);
      
      // Método 1: API não oficial do Instagram (mais confiável)
      try {
        console.log('Tentando método 1: API não oficial');
        const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
        const response = await axios.get(apiUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)',
            'Accept': '*/*',
            'Accept-Language': 'en-US',
            'Accept-Encoding': 'gzip, deflate',
            'X-IG-App-ID': '936619743392459',
            'X-ASBD-ID': '198387',
            'X-IG-WWW-Claim': '0',
            'Origin': 'https://www.instagram.com',
            'Connection': 'keep-alive',
            'Referer': `https://www.instagram.com/${username}/`,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
          }
        });
        
        if (response.data && response.data.data && response.data.data.user) {
          const user = response.data.data.user;
          const edges = user.edge_owner_to_timeline_media?.edges || [];
          
          if (edges.length > 0) {
            const posts = edges.slice(0, limit).map(edge => {
              const node = edge.node;
              return {
                url: `https://www.instagram.com/p/${node.shortcode}/`,
                shortcode: node.shortcode,
                caption: node.edge_media_to_caption?.edges[0]?.node?.text || '',
                likes: node.edge_liked_by?.count || 0,
                comments: node.edge_media_to_comment?.count || 0,
                timestamp: node.taken_at_timestamp,
                thumbnail: node.thumbnail_src || node.display_url
              };
            });
            
            console.log(`✅ Método 1 sucesso: ${posts.length} posts encontrados`);
            return posts;
          }
        }
      } catch (error) {
        console.log('❌ Método 1 falhou:', error.message);
      }
      
      // Método 2: Tentar através de proxy AllOrigins
      try {
        console.log('Tentando método 2: AllOrigins proxy');
        const cleanUrl = `https://www.instagram.com/${username}/`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`;
        const response = await axios.get(proxyUrl, { 
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.contents) {
          const posts = this.parseInstagramHTML(response.data.contents, limit);
          if (posts.length > 0) {
            console.log(`✅ Método 2 sucesso: ${posts.length} posts encontrados`);
            return posts;
          }
        }
      } catch (error) {
        console.log('❌ Método 2 falhou:', error.message);
      }
      
      // Método 3: Retornar posts de exemplo para demonstração
      console.log('⚠️ Todos os métodos falharam. Retornando orientação ao usuário.');
      throw new Error(`Não foi possível extrair os posts automaticamente do perfil @${username}. 

SOLUÇÕES ALTERNATIVAS:
1. Use links individuais de posts (ex: https://www.instagram.com/p/ABC123/)
2. Cole manualmente o texto dos posts
3. Configure uma API key do Instagram (recomendado para uso em produção)

O Instagram bloqueia requisições automáticas para proteger a privacidade dos usuários.`);
      
    } catch (error) {
      console.error('❌ Erro ao extrair posts do perfil:', error.message);
      throw error;
    }
  }
  
  /**
   * Faz o parse do HTML do Instagram para extrair posts
   */
  static parseInstagramHTML(html, limit) {
    const posts = [];
    
    try {
      const $ = cheerio.load(html);
      
      // Procurar por JSON embutido no HTML (_sharedData)
      const scripts = $('script').toArray();
      
      for (const script of scripts) {
        const scriptContent = $(script).html();
        
        if (scriptContent && scriptContent.includes('window._sharedData')) {
          try {
            const jsonMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+?});/);
            if (jsonMatch) {
              const sharedData = JSON.parse(jsonMatch[1]);
              const profilePage = sharedData.entry_data?.ProfilePage?.[0];
              const user = profilePage?.graphql?.user;
              
              if (user && user.edge_owner_to_timeline_media?.edges) {
                const edges = user.edge_owner_to_timeline_media.edges.slice(0, limit);
                
                edges.forEach(edge => {
                  const node = edge.node;
                  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
                  
                  posts.push({
                    id: node.id,
                    shortcode: node.shortcode,
                    url: `https://www.instagram.com/p/${node.shortcode}/`,
                    caption: caption,
                    likes: node.edge_liked_by?.count || 0,
                    comments: node.edge_media_to_comment?.count || 0,
                    timestamp: node.taken_at_timestamp,
                    imageUrl: node.display_url || node.thumbnail_src,
                    isVideo: node.is_video || false
                  });
                });
                
                console.log(`📊 Extraídos ${posts.length} posts via _sharedData`);
                return posts;
              }
            }
          } catch (e) {
            console.log('Erro ao parsear _sharedData:', e.message);
          }
        }
        
        // Tentar também com application/ld+json
        if (scriptContent && scriptContent.includes('"@type":"ProfilePage"')) {
          try {
            const jsonData = JSON.parse(scriptContent);
            if (jsonData.mainEntity && jsonData.mainEntity.interactionStatistic) {
              console.log('Encontrado JSON-LD, mas precisa de mais parsing');
            }
          } catch (e) {
            // Continuar
          }
        }
      }
      
      // Método fallback: extrair de meta tags
      const ogDescription = $('meta[property="og:description"]').attr('content');
      if (ogDescription) {
        console.log('Fallback: usando meta description');
        // Extrair número de posts da descrição
        const match = ogDescription.match(/(\d+)\s+Posts/i);
        if (match) {
          console.log(`Perfil tem ${match[1]} posts (via meta tag)`);
        }
      }
      
    } catch (error) {
      console.error('Erro ao parsear HTML:', error.message);
    }
    
    return posts;
  }
  
  /**
   * Extrai conteúdo detalhado de um post específico
   */
  static async extrairConteudoPost(postUrl) {
    try {
      console.log('📄 Extraindo conteúdo do post:', postUrl);
      
      // Tentar múltiplos métodos
      const methods = [
        { name: 'AllOrigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(postUrl)}` },
        { name: 'CORS Proxy', url: `https://corsproxy.io/?${encodeURIComponent(postUrl)}` }
      ];
      
      for (const method of methods) {
        try {
          console.log(`Tentando ${method.name}...`);
          const response = await axios.get(method.url, { timeout: 15000 });
          
          const html = method.name === 'AllOrigins' ? response.data.contents : response.data;
          const $ = cheerio.load(html);
          
          // Extrair de _sharedData
          const scripts = $('script').toArray();
          for (const script of scripts) {
            const scriptContent = $(script).html();
            if (scriptContent && scriptContent.includes('window._sharedData')) {
              const jsonMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+?});/);
              if (jsonMatch) {
                const sharedData = JSON.parse(jsonMatch[1]);
                const post = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                
                if (post) {
                  const caption = post.edge_media_to_caption?.edges?.[0]?.node?.text || '';
                  const comments = post.edge_media_to_parent_comment?.edges || [];
                  
                  let conteudo = `📱 CONTEÚDO DO INSTAGRAM\n\n`;
                  conteudo += `TEXTO DA POSTAGEM:\n${caption}\n\n`;
                  
                  if (post.owner?.username) {
                    conteudo += `AUTOR: @${post.owner.username}\n\n`;
                  }
                  
                  // Adicionar comentários relevantes (primeiros 5)
                  if (comments.length > 0) {
                    conteudo += `COMENTÁRIOS DESTACADOS:\n`;
                    comments.slice(0, 5).forEach((edge, i) => {
                      const comment = edge.node;
                      conteudo += `${i + 1}. ${comment.text}\n`;
                    });
                  }
                  
                  console.log(`✅ Conteúdo extraído via ${method.name}`);
                  return conteudo;
                }
              }
            }
          }
          
          // Fallback: meta tags
          const description = $('meta[property="og:description"]').attr('content');
          if (description && description.length > 50) {
            return `📱 CONTEÚDO DO INSTAGRAM\n\nTEXTO DA POSTAGEM:\n${description}`;
          }
          
        } catch (error) {
          console.log(`❌ ${method.name} falhou:`, error.message);
        }
      }
      
      throw new Error('Não foi possível extrair o conteúdo do post');
      
    } catch (error) {
      console.error('Erro ao extrair conteúdo do post:', error.message);
      throw error;
    }
  }
}

module.exports = InstagramService;
