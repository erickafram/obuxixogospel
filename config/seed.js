const mongoose = require('mongoose');
require('dotenv').config();
const Article = require('../models/Article');
const Category = require('../models/Category');
const { connectDB } = require('./database-memory');

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
  // G1 - Jornalismo
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
    conteudo: '<p>O Ministério da Saúde lançou hoje uma nova campanha nacional de vacinação que deve imunizar cerca de 90 milhões de brasileiros contra gripe e covid-19.</p><p>A campanha começará na próxima semana em todos os postos de saúde do país.</p>',
    imagem: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    categoria: 'g1',
    subcategoria: 'Saúde',
    tags: ['saúde', 'vacinação', 'covid']
  },
  {
    titulo: 'Chuvas intensas causam transtornos em várias regiões do país',
    descricao: 'Defesa Civil emite alertas e orienta população sobre medidas preventivas',
    conteudo: '<p>Fortes chuvas atingiram diversas regiões do Brasil nesta semana, causando alagamentos e deslizamentos. A Defesa Civil emitiu alertas para áreas de risco.</p>',
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
    conteudo: '<p>O governo federal anunciou investimentos de R$ 5 bilhões em tecnologia e inovação, com foco em inteligência artificial e startups.</p>',
    imagem: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    categoria: 'g1',
    subcategoria: 'Tecnologia',
    tags: ['tecnologia', 'IA', 'inovação']
  },
  {
    titulo: 'Meio Ambiente: Desmatamento na Amazônia cai 30% em 2024',
    descricao: 'Dados do INPE mostram redução significativa no último ano',
    conteudo: '<p>O desmatamento na Amazônia apresentou queda de 30% em 2024, segundo dados do INPE. A redução é atribuída ao aumento da fiscalização.</p>',
    imagem: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800',
    categoria: 'g1',
    subcategoria: 'Meio Ambiente',
    tags: ['amazônia', 'desmatamento', 'meio ambiente']
  },

  // GE - Esportes
  {
    titulo: 'Flamengo vence clássico e assume liderança do Brasileirão',
    descricao: 'Rubro-negro bate rival por 3 a 1 no Maracanã lotado',
    conteudo: '<p>O Flamengo venceu o clássico carioca por 3 a 1 no Maracanã e assumiu a liderança isolada do Campeonato Brasileiro. Os gols foram marcados por Pedro (2) e Gabigol.</p>',
    imagem: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    categoria: 'ge',
    subcategoria: 'Futebol',
    tags: ['futebol', 'brasileirão', 'flamengo']
  },
  {
    titulo: 'Seleção Brasileira convoca novos talentos para amistosos',
    descricao: 'Técnico anuncia lista com surpresas para jogos preparatórios',
    conteudo: '<p>O técnico da Seleção Brasileira divulgou a convocação para os próximos amistosos internacionais, com a inclusão de jovens promessas do futebol nacional.</p>',
    imagem: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    categoria: 'ge',
    subcategoria: 'Seleção',
    tags: ['seleção', 'futebol', 'convocação']
  },
  {
    titulo: 'Tênis: Brasileiro conquista título em torneio internacional',
    descricao: 'Tenista vence final em três sets e faz história no circuito',
    conteudo: '<p>O tenista brasileiro conquistou seu primeiro título em torneio ATP após vencer a final em três sets emocionantes.</p>',
    imagem: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    categoria: 'ge',
    subcategoria: 'Tênis',
    tags: ['tênis', 'brasil', 'ATP']
  },
  {
    titulo: 'Fórmula 1: GP do Brasil promete emoção no fim de semana',
    descricao: 'Interlagos recebe etapa decisiva do campeonato mundial',
    conteudo: '<p>O GP do Brasil de Fórmula 1 acontece neste fim de semana em Interlagos, com expectativa de casa cheia e disputa acirrada pelo título.</p>',
    imagem: 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=800',
    categoria: 'ge',
    subcategoria: 'Fórmula 1',
    tags: ['F1', 'automobilismo', 'interlagos']
  },
  {
    titulo: 'Vôlei: Brasil garante vaga nas Olimpíadas de Paris',
    descricao: 'Seleção feminina vence sul-coreanas e confirma classificação',
    conteudo: '<p>A seleção brasileira feminina de vôlei garantiu vaga nas Olimpíadas de Paris após vitória sobre a Coreia do Sul por 3 sets a 0.</p>',
    imagem: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
    categoria: 'ge',
    subcategoria: 'Vôlei',
    tags: ['vôlei', 'olimpíadas', 'seleção']
  },
  {
    titulo: 'Basquete: NBB tem rodada decisiva para playoffs',
    descricao: 'Times brigam pelas últimas vagas na fase final do campeonato',
    conteudo: '<p>O Novo Basquete Brasil chega à reta final da fase de classificação com disputa acirrada pelas vagas nos playoffs.</p>',
    imagem: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    categoria: 'ge',
    subcategoria: 'Basquete',
    tags: ['basquete', 'NBB', 'playoffs']
  },

  // GShow - Entretenimento
  {
    titulo: 'Nova novela das 9 estreia com recorde de audiência',
    descricao: 'Trama de época conquista público e crítica na primeira semana',
    conteudo: '<p>A nova novela das 9 da Globo estreou com números expressivos de audiência. A trama de época, ambientada no século XIX, conquistou o público.</p>',
    imagem: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
    categoria: 'gshow',
    subcategoria: 'Novelas',
    tags: ['novela', 'TV', 'entretenimento']
  },
  {
    titulo: 'BBB 24: Conheça os participantes da nova edição',
    descricao: 'Reality show apresenta elenco diverso e promete muitas emoções',
    conteudo: '<p>O Big Brother Brasil 24 apresentou oficialmente seus participantes. A edição promete muitas surpresas e dinâmicas inéditas.</p>',
    imagem: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    categoria: 'gshow',
    subcategoria: 'Reality',
    tags: ['BBB', 'reality', 'TV']
  },
  {
    titulo: 'The Voice Brasil anuncia novos técnicos para próxima temporada',
    descricao: 'Programa musical terá mudanças no time de jurados',
    conteudo: '<p>O The Voice Brasil anunciou mudanças no time de técnicos para a próxima temporada, trazendo novos nomes da música brasileira.</p>',
    imagem: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    categoria: 'gshow',
    subcategoria: 'Música',
    tags: ['the voice', 'música', 'TV']
  },
  {
    titulo: 'Estreia: Nova série brasileira chega ao GloboPlay',
    descricao: 'Produção nacional promete conquistar público do streaming',
    conteudo: '<p>O GloboPlay estreia nova série brasileira com elenco de peso e produção de alto nível. A trama aborda temas contemporâneos.</p>',
    imagem: 'https://images.unsplash.com/photo-1574267432644-f610f5293744?w=800',
    categoria: 'gshow',
    subcategoria: 'Séries',
    tags: ['série', 'globoplay', 'streaming']
  },
  {
    titulo: 'Fantástico celebra 50 anos com especial histórico',
    descricao: 'Programa dominical relembra momentos marcantes',
    conteudo: '<p>O Fantástico comemora 50 anos no ar com um especial que relembra os principais momentos da história do jornalismo e entretenimento brasileiro.</p>',
    imagem: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    categoria: 'gshow',
    subcategoria: 'TV',
    tags: ['fantástico', 'TV', 'aniversário']
  },
  {
    titulo: 'Festival de Cinema do Rio anuncia programação completa',
    descricao: 'Evento traz produções nacionais e internacionais',
    conteudo: '<p>O Festival de Cinema do Rio divulgou sua programação completa com mais de 200 filmes de diversos países, incluindo estreias mundiais.</p>',
    imagem: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    categoria: 'gshow',
    subcategoria: 'Cinema',
    tags: ['cinema', 'festival', 'cultura']
  },

  // Quem - Celebridades
  {
    titulo: 'Atriz brasileira é indicada ao Emmy Internacional',
    descricao: 'Performance em série nacional conquista reconhecimento mundial',
    conteudo: '<p>A atriz brasileira recebeu indicação ao Emmy Internacional por sua atuação em série nacional. É a primeira indicação da carreira.</p>',
    imagem: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    categoria: 'quem',
    subcategoria: 'Prêmios',
    tags: ['celebridade', 'emmy', 'prêmio']
  },
  {
    titulo: 'Cantor anuncia turnê mundial com shows no Brasil',
    descricao: 'Artista passará por 10 cidades brasileiras em 2024',
    conteudo: '<p>O cantor anunciou sua turnê mundial que incluirá 10 cidades brasileiras. Os shows começam em março de 2024.</p>',
    imagem: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    categoria: 'quem',
    subcategoria: 'Música',
    tags: ['música', 'show', 'turnê']
  },
  {
    titulo: 'Casal de famosos anuncia chegada do primeiro filho',
    descricao: 'Atores compartilham notícia nas redes sociais',
    conteudo: '<p>O casal de atores anunciou nas redes sociais que está esperando o primeiro filho. A notícia emocionou fãs e amigos.</p>',
    imagem: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    categoria: 'quem',
    subcategoria: 'Famosos',
    tags: ['celebridade', 'bebê', 'família']
  },
  {
    titulo: 'Apresentador lança livro de memórias sobre carreira na TV',
    descricao: 'Obra revela bastidores de 30 anos de televisão',
    conteudo: '<p>O apresentador lançou livro de memórias que revela bastidores de sua carreira de 30 anos na televisão brasileira.</p>',
    imagem: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    categoria: 'quem',
    subcategoria: 'Literatura',
    tags: ['livro', 'TV', 'biografia']
  },

  // Valor - Economia
  {
    titulo: 'Bolsa brasileira atinge maior patamar em 5 anos',
    descricao: 'Ibovespa fecha em alta com otimismo dos investidores',
    conteudo: '<p>A bolsa de valores brasileira atingiu o maior patamar dos últimos 5 anos, impulsionada pelo otimismo com reformas econômicas.</p>',
    imagem: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    categoria: 'valor',
    subcategoria: 'Mercados',
    tags: ['bolsa', 'economia', 'investimentos']
  },
  {
    titulo: 'Startups brasileiras recebem investimentos recordes',
    descricao: 'Setor de tecnologia atrai R$ 10 bilhões no primeiro semestre',
    conteudo: '<p>As startups brasileiras receberam investimentos recordes de R$ 10 bilhões no primeiro semestre, consolidando o país como hub de inovação.</p>',
    imagem: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    categoria: 'valor',
    subcategoria: 'Startups',
    tags: ['startups', 'investimento', 'tecnologia']
  },
  {
    titulo: 'Banco Central mantém taxa de juros estável',
    descricao: 'Copom decide por unanimidade manter Selic em 10,5%',
    conteudo: '<p>O Comitê de Política Monetária do Banco Central decidiu por unanimidade manter a taxa Selic em 10,5% ao ano.</p>',
    imagem: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
    categoria: 'valor',
    subcategoria: 'Juros',
    tags: ['selic', 'juros', 'banco central']
  },
  {
    titulo: 'Setor de energia renováveis cresce 40% no Brasil',
    descricao: 'Investimentos em solar e eólica batem recorde',
    conteudo: '<p>O setor de energias renováveis cresceu 40% no Brasil, com investimentos recordes em energia solar e eólica.</p>',
    imagem: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
    categoria: 'valor',
    subcategoria: 'Energia',
    tags: ['energia', 'sustentabilidade', 'investimento']
  }
];

const seedDatabase = async () => {
  try {
    // Limpar banco de dados
    await Article.deleteMany({});
    await Category.deleteMany({});
    console.log('🗑️  Banco de dados limpo');

    // Inserir categorias
    await Category.insertMany(categories);
    console.log('✅ Categorias inseridas');

    // Inserir artigos um por um para gerar slugs
    const slugify = require('slugify');
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
    console.log('✅ Artigos inseridos');

    console.log('🎉 Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
};

connectDB().then(() => seedDatabase());
