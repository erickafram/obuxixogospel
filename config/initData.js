const Article = require('../models/Article');
const Category = require('../models/Category');
const slugify = require('slugify');

const categories = [
  {
    nome: 'G1',
    slug: 'g1',
    cor: '#C1121F',
    icone: '📰',
    descricao: 'Jornalismo e notícias'
  },
  {
    nome: 'GE',
    slug: 'ge',
    cor: '#28A745',
    icone: '⚽',
    descricao: 'Esportes'
  },
  {
    nome: 'GShow',
    slug: 'gshow',
    cor: '#FF8C42',
    icone: '🎬',
    descricao: 'Entretenimento'
  },
  {
    nome: 'Quem',
    slug: 'quem',
    cor: '#8B3A62',
    icone: '⭐',
    descricao: 'Celebridades'
  },
  {
    nome: 'Valor',
    slug: 'valor',
    cor: '#1F4788',
    icone: '💰',
    descricao: 'Economia e negócios'
  },
  {
    nome: 'GloboPlay',
    slug: 'globoplay',
    cor: '#7B2CBF',
    icone: '📺',
    descricao: 'Streaming'
  }
];

const articles = [
  // G1 - Jornalismo (8 notícias)
  {
    titulo: 'Brasil registra crescimento econômico acima do esperado no último trimestre',
    descricao: 'PIB cresce 2,5% e supera projeções de analistas do mercado financeiro',
    conteudo: '<p>O Brasil apresentou um crescimento econômico de 2,5% no último trimestre, superando as expectativas do mercado que projetavam alta de 1,8%. Os dados divulgados pelo IBGE mostram recuperação em diversos setores.</p><p>Segundo especialistas, o resultado reflete a retomada do consumo das famílias e investimentos em infraestrutura. O setor de serviços foi o principal responsável pelo crescimento.</p>',
    imagem: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
    categoria: 'g1',
    subcategoria: 'Economia',
    tags: ['economia', 'PIB', 'crescimento'],
    destaque: true
  },
  {
    titulo: 'Ministério da Saúde anuncia nova campanha de vacinação nacional',
    descricao: 'Campanha visa imunizar 90 milhões de brasileiros contra gripe e covid',
    conteudo: '<p>O Ministério da Saúde lançou hoje uma nova campanha nacional de vacinação que deve imunizar cerca de 90 milhões de brasileiros contra gripe e covid-19.</p>',
    imagem: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    categoria: 'g1',
    subcategoria: 'Saúde',
    tags: ['saúde', 'vacinação', 'covid']
  },
  {
    titulo: 'Chuvas intensas causam transtornos em várias regiões do país',
    descricao: 'Defesa Civil emite alertas e orienta população sobre medidas preventivas',
    conteudo: '<p>Fortes chuvas atingiram diversas regiões do Brasil nesta semana, causando alagamentos e deslizamentos.</p>',
    imagem: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800',
    categoria: 'g1',
    subcategoria: 'Brasil',
    tags: ['clima', 'chuvas', 'defesa civil']
  },
  {
    titulo: 'Educação: MEC divulga calendário do ENEM 2024',
    descricao: 'Provas serão realizadas em novembro com novidades no formato',
    conteudo: '<p>O Ministério da Educação divulgou o calendário oficial do ENEM 2024. As provas acontecerão nos dias 5 e 12 de novembro.</p>',
    imagem: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    categoria: 'g1',
    subcategoria: 'Educação',
    tags: ['educação', 'enem', 'vestibular']
  },
  {
    titulo: 'Tecnologia: Brasil investe em inteligência artificial e inovação',
    descricao: 'Governo anuncia R$ 5 bilhões para desenvolvimento tecnológico',
    conteudo: '<p>O governo federal anunciou investimentos de R$ 5 bilhões em tecnologia e inovação.</p>',
    imagem: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    categoria: 'g1',
    subcategoria: 'Tecnologia',
    tags: ['tecnologia', 'IA', 'inovação']
  },
  {
    titulo: 'Meio Ambiente: Desmatamento na Amazônia cai 30% em 2024',
    descricao: 'Dados do INPE mostram redução significativa no último ano',
    conteudo: '<p>O desmatamento na Amazônia apresentou queda de 30% em 2024, segundo dados do INPE.</p>',
    imagem: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800',
    categoria: 'g1',
    subcategoria: 'Meio Ambiente',
    tags: ['amazônia', 'desmatamento', 'meio ambiente']
  },
  {
    titulo: 'Política: Congresso aprova reforma tributária em votação histórica',
    descricao: 'Mudanças prometem simplificar sistema de impostos no Brasil',
    conteudo: '<p>O Congresso Nacional aprovou a reforma tributária em sessão histórica.</p>',
    imagem: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
    categoria: 'g1',
    subcategoria: 'Política',
    tags: ['política', 'reforma', 'tributos']
  },
  {
    titulo: 'Segurança: Operação policial prende quadrilha em 5 estados',
    descricao: 'Grupo criminoso atuava em fraudes bancárias há mais de 2 anos',
    conteudo: '<p>Uma operação conjunta das polícias Federal e Civil resultou na prisão de 15 pessoas.</p>',
    imagem: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800',
    categoria: 'g1',
    subcategoria: 'Segurança',
    tags: ['segurança', 'polícia', 'crime']
  },

  // GE - Esportes (8 notícias)
  {
    titulo: 'Flamengo vence clássico e assume liderança do Brasileirão',
    descricao: 'Rubro-negro bate rival por 3 a 1 no Maracanã lotado',
    conteudo: '<p>O Flamengo venceu o clássico carioca por 3 a 1 no Maracanã e assumiu a liderança isolada do Campeonato Brasileiro.</p>',
    imagem: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    categoria: 'ge',
    subcategoria: 'Futebol',
    tags: ['futebol', 'brasileirão', 'flamengo']
  },
  {
    titulo: 'Seleção Brasileira convoca novos talentos para amistosos',
    descricao: 'Técnico anuncia lista com surpresas para jogos preparatórios',
    conteudo: '<p>O técnico da Seleção Brasileira divulgou a convocação para os próximos amistosos internacionais.</p>',
    imagem: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    categoria: 'ge',
    subcategoria: 'Seleção',
    tags: ['seleção', 'futebol', 'convocação']
  },
  {
    titulo: 'Tênis: Brasileiro conquista título em torneio internacional',
    descricao: 'Tenista vence final em três sets e faz história no circuito',
    conteudo: '<p>O tenista brasileiro conquistou seu primeiro título em torneio ATP.</p>',
    imagem: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    categoria: 'ge',
    subcategoria: 'Tênis',
    tags: ['tênis', 'brasil', 'ATP']
  },
  {
    titulo: 'Fórmula 1: GP do Brasil promete emoção no fim de semana',
    descricao: 'Interlagos recebe etapa decisiva do campeonato mundial',
    conteudo: '<p>O GP do Brasil de Fórmula 1 acontece neste fim de semana em Interlagos.</p>',
    imagem: 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=800',
    categoria: 'ge',
    subcategoria: 'Fórmula 1',
    tags: ['F1', 'automobilismo', 'interlagos']
  },
  {
    titulo: 'Vôlei: Brasil garante vaga nas Olimpíadas de Paris',
    descricao: 'Seleção feminina vence sul-coreanas e confirma classificação',
    conteudo: '<p>A seleção brasileira feminina de vôlei garantiu vaga nas Olimpíadas de Paris.</p>',
    imagem: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
    categoria: 'ge',
    subcategoria: 'Vôlei',
    tags: ['vôlei', 'olimpíadas', 'seleção']
  },
  {
    titulo: 'Basquete: NBB tem rodada decisiva para playoffs',
    descricao: 'Times brigam pelas últimas vagas na fase final do campeonato',
    conteudo: '<p>O Novo Basquete Brasil chega à reta final da fase de classificação.</p>',
    imagem: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    categoria: 'ge',
    subcategoria: 'Basquete',
    tags: ['basquete', 'NBB', 'playoffs']
  },
  {
    titulo: 'Palmeiras contrata atacante europeu por R$ 50 milhões',
    descricao: 'Clube paulista anuncia maior contratação da temporada',
    conteudo: '<p>O Palmeiras anunciou a contratação de atacante europeu em negócio recorde.</p>',
    imagem: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
    categoria: 'ge',
    subcategoria: 'Futebol',
    tags: ['futebol', 'palmeiras', 'contratação']
  },
  {
    titulo: 'Surfe: Gabriel Medina conquista etapa do Mundial',
    descricao: 'Brasileiro vence em Pipeline e se aproxima do título',
    conteudo: '<p>Gabriel Medina venceu a etapa de Pipeline do Circuito Mundial de Surfe.</p>',
    imagem: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800',
    categoria: 'ge',
    subcategoria: 'Surfe',
    tags: ['surfe', 'medina', 'mundial']
  },

  // GShow - Entretenimento (8 notícias)
  {
    titulo: 'Nova novela das 9 estreia com recorde de audiência',
    descricao: 'Trama de época conquista público e crítica na primeira semana',
    conteudo: '<p>A nova novela das 9 da Globo estreou com números expressivos de audiência.</p>',
    imagem: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
    categoria: 'gshow',
    subcategoria: 'Novelas',
    tags: ['novela', 'TV', 'entretenimento']
  },
  {
    titulo: 'BBB 24: Conheça os participantes da nova edição',
    descricao: 'Reality show apresenta elenco diverso e promete muitas emoções',
    conteudo: '<p>O Big Brother Brasil 24 apresentou oficialmente seus participantes.</p>',
    imagem: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    categoria: 'gshow',
    subcategoria: 'Reality',
    tags: ['BBB', 'reality', 'TV']
  },
  {
    titulo: 'The Voice Brasil anuncia novos técnicos para próxima temporada',
    descricao: 'Programa musical terá mudanças no time de jurados',
    conteudo: '<p>O The Voice Brasil anunciou mudanças no time de técnicos para a próxima temporada.</p>',
    imagem: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    categoria: 'gshow',
    subcategoria: 'Música',
    tags: ['the voice', 'música', 'TV']
  },
  {
    titulo: 'Estreia: Nova série brasileira chega ao GloboPlay',
    descricao: 'Produção nacional promete conquistar público do streaming',
    conteudo: '<p>O GloboPlay estreia nova série brasileira com elenco de peso.</p>',
    imagem: 'https://images.unsplash.com/photo-1574267432644-f610f5293744?w=800',
    categoria: 'gshow',
    subcategoria: 'Séries',
    tags: ['série', 'globoplay', 'streaming']
  },
  {
    titulo: 'Fantástico celebra 50 anos com especial histórico',
    descricao: 'Programa dominical relembra momentos marcantes',
    conteudo: '<p>O Fantástico comemora 50 anos no ar com um especial histórico.</p>',
    imagem: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    categoria: 'gshow',
    subcategoria: 'TV',
    tags: ['fantástico', 'TV', 'aniversário']
  },
  {
    titulo: 'Festival de Cinema do Rio anuncia programação completa',
    descricao: 'Evento traz produções nacionais e internacionais',
    conteudo: '<p>O Festival de Cinema do Rio divulgou sua programação completa.</p>',
    imagem: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    categoria: 'gshow',
    subcategoria: 'Cinema',
    tags: ['cinema', 'festival', 'cultura']
  },
  {
    titulo: 'Rock in Rio 2024: Line-up completo é divulgado',
    descricao: 'Festival anuncia headliners e atrações nacionais',
    conteudo: '<p>O Rock in Rio divulgou o line-up completo da edição 2024.</p>',
    imagem: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    categoria: 'gshow',
    subcategoria: 'Música',
    tags: ['rock in rio', 'festival', 'música']
  },
  {
    titulo: 'Domingão com Huck tem quadro novo e surpreende audiência',
    descricao: 'Programa dominical inova e conquista público',
    conteudo: '<p>O Domingão com Huck estreou novo quadro que viralizou nas redes sociais.</p>',
    imagem: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800',
    categoria: 'gshow',
    subcategoria: 'TV',
    tags: ['domingão', 'TV', 'luciano huck']
  },

  // Quem - Celebridades (4 notícias)
  {
    titulo: 'Atriz brasileira é indicada ao Emmy Internacional',
    descricao: 'Performance em série nacional conquista reconhecimento mundial',
    conteudo: '<p>A atriz brasileira recebeu indicação ao Emmy Internacional.</p>',
    imagem: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    categoria: 'quem',
    subcategoria: 'Prêmios',
    tags: ['celebridade', 'emmy', 'prêmio']
  },
  {
    titulo: 'Cantor anuncia turnê mundial com shows no Brasil',
    descricao: 'Artista passará por 10 cidades brasileiras em 2024',
    conteudo: '<p>O cantor anunciou sua turnê mundial que incluirá 10 cidades brasileiras.</p>',
    imagem: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    categoria: 'quem',
    subcategoria: 'Música',
    tags: ['música', 'show', 'turnê']
  },
  {
    titulo: 'Casal de famosos anuncia chegada do primeiro filho',
    descricao: 'Atores compartilham notícia nas redes sociais',
    conteudo: '<p>O casal de atores anunciou nas redes sociais que está esperando o primeiro filho.</p>',
    imagem: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    categoria: 'quem',
    subcategoria: 'Famosos',
    tags: ['celebridade', 'bebê', 'família']
  },
  {
    titulo: 'Apresentador lança livro de memórias sobre carreira na TV',
    descricao: 'Obra revela bastidores de 30 anos de televisão',
    conteudo: '<p>O apresentador lançou livro de memórias que revela bastidores de sua carreira.</p>',
    imagem: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    categoria: 'quem',
    subcategoria: 'Literatura',
    tags: ['livro', 'TV', 'biografia']
  },

  // Valor - Economia (4 notícias)
  {
    titulo: 'Bolsa brasileira atinge maior patamar em 5 anos',
    descricao: 'Ibovespa fecha em alta com otimismo dos investidores',
    conteudo: '<p>A bolsa de valores brasileira atingiu o maior patamar dos últimos 5 anos.</p>',
    imagem: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    categoria: 'valor',
    subcategoria: 'Mercados',
    tags: ['bolsa', 'economia', 'investimentos']
  },
  {
    titulo: 'Startups brasileiras recebem investimentos recordes',
    descricao: 'Setor de tecnologia atrai R$ 10 bilhões no primeiro semestre',
    conteudo: '<p>As startups brasileiras receberam investimentos recordes de R$ 10 bilhões.</p>',
    imagem: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    categoria: 'valor',
    subcategoria: 'Startups',
    tags: ['startups', 'investimento', 'tecnologia']
  },
  {
    titulo: 'Banco Central mantém taxa de juros estável',
    descricao: 'Copom decide por unanimidade manter Selic em 10,5%',
    conteudo: '<p>O Comitê de Política Monetária do Banco Central decidiu manter a taxa Selic.</p>',
    imagem: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
    categoria: 'valor',
    subcategoria: 'Juros',
    tags: ['selic', 'juros', 'banco central']
  },
  {
    titulo: 'Setor de energia renováveis cresce 40% no Brasil',
    descricao: 'Investimentos em solar e eólica batem recorde',
    conteudo: '<p>O setor de energias renováveis cresceu 40% no Brasil.</p>',
    imagem: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
    categoria: 'valor',
    subcategoria: 'Energia',
    tags: ['energia', 'sustentabilidade', 'investimento']
  }
];

const initializeData = async () => {
  try {
    // Verificar se já existem dados
    const articleCount = await Article.countDocuments();
    
    if (articleCount > 0) {
      console.log(`📊 Banco já possui ${articleCount} artigos`);
      return;
    }

    console.log('🔄 Inicializando dados...');

    // Inserir categorias
    for (const catData of categories) {
      const exists = await Category.findOne({ slug: catData.slug });
      if (!exists) {
        await Category.create(catData);
      }
    }
    console.log('✅ Categorias criadas');

    // Inserir artigos
    for (const articleData of articles) {
      const article = new Article({
        ...articleData,
        urlAmigavel: slugify(articleData.titulo, {
          lower: true,
          strict: true,
          locale: 'pt'
        }) + '-' + Date.now() + Math.random().toString(36).substring(7)
      });
      await article.save();
    }
    console.log(`✅ ${articles.length} artigos criados`);
    console.log('🎉 Dados inicializados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao inicializar dados:', error.message);
  }
};

module.exports = initializeData;
