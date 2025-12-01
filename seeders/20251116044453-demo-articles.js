'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const timestamp = Date.now();
    
    // Verificar se já existem artigos demo
    const [existing] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM articles WHERE autor = 'Redação Obuxixo Gospel'`
    );
    
    if (existing[0].count > 0) {
      console.log('Artigos demo já existem, pulando seed...');
      return;
    }
    
    await queryInterface.bulkInsert('articles', [
      // Notícias (g1)
      {
        titulo: 'Congresso de Missões reúne milhares de jovens em São Paulo',
        descricao: 'Evento promove reflexão sobre o chamado missionário e a evangelização mundial',
        conteudo: '<p>O maior congresso de missões do Brasil reuniu mais de 15 mil jovens cristãos em São Paulo neste fim de semana. O evento, que acontece anualmente, tem como objetivo despertar o chamado missionário entre a juventude evangélica.</p><p>Durante três dias, os participantes assistiram a palestras, workshops e momentos de adoração focados no tema da evangelização mundial. Missionários de diversos países compartilharam suas experiências e desafios no campo.</p>',
        imagem: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        categoria: 'g1',
        subcategoria: 'Eventos',
        url_amigavel: 'congresso-de-missoes-reune-milhares-de-jovens-em-sao-paulo-' + timestamp,
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 1250,
        destaque: true,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Igreja inaugura centro de acolhimento para moradores de rua',
        descricao: 'Projeto social oferece alimentação, banho e apoio espiritual para população vulnerável',
        conteudo: '<p>Uma igreja evangélica no centro da cidade inaugurou um centro de acolhimento que funcionará 24 horas por dia para atender moradores de rua. O espaço oferece refeições, banho, roupas limpas e acompanhamento espiritual.</p>',
        imagem: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800',
        categoria: 'g1',
        subcategoria: 'Ação Social',
        url_amigavel: 'igreja-inaugura-centro-de-acolhimento-para-moradores-de-rua-' + (timestamp + 1),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 890,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Pastores se reúnem para oração pela paz no país',
        descricao: 'Líderes evangélicos de diferentes denominações promovem vigília nacional',
        conteudo: '<p>Pastores e líderes evangélicos de todo o Brasil se reuniram em Brasília para uma vigília de oração pela paz e unidade do país. O evento contou com a participação de representantes de mais de 50 denominações.</p>',
        imagem: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800',
        categoria: 'g1',
        subcategoria: 'Política',
        url_amigavel: 'pastores-se-reunem-para-oracao-pela-paz-no-pais-' + (timestamp + 2),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 670,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },

      // Música (ge)
      {
        titulo: 'Fernandinho lança novo álbum com participações especiais',
        descricao: 'Cantor gospel apresenta trabalho com 12 faixas inéditas e feat com grandes nomes',
        conteudo: '<p>O cantor Fernandinho lançou seu novo álbum de estúdio com 12 faixas inéditas. O trabalho conta com participações especiais de Aline Barros, Preto no Branco e Thalles Roberto.</p><p>O disco explora diferentes estilos musicais, do pop ao rock gospel, mantendo a essência de adoração que marca a carreira do artista.</p>',
        imagem: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
        categoria: 'ge',
        subcategoria: 'Lançamentos',
        url_amigavel: 'fernandinho-lanca-novo-album-com-participacoes-especiais-' + (timestamp + 3),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 2100,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Prêmio Promessas anuncia indicados de 2025',
        descricao: 'Cerimônia de premiação acontecerá em junho no Rio de Janeiro',
        conteudo: '<p>A organização do Prêmio Promessas divulgou a lista de indicados para a edição 2025. Ao todo, são 25 categorias que contemplam os principais artistas e produções da música gospel brasileira.</p>',
        imagem: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        categoria: 'ge',
        subcategoria: 'Premiações',
        url_amigavel: 'premio-promessas-anuncia-indicados-de-2025-' + (timestamp + 4),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 1580,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },

      // Eventos (gshow)
      {
        titulo: 'Festival Promessas 2025 anuncia line-up completo',
        descricao: 'Maior festival gospel da América Latina traz mais de 30 atrações',
        conteudo: '<p>O Festival Promessas 2025 anunciou seu line-up completo com mais de 30 atrações nacionais e internacionais. O evento acontecerá em agosto no Allianz Parque, em São Paulo.</p>',
        imagem: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
        categoria: 'gshow',
        subcategoria: 'Festivais',
        url_amigavel: 'festival-promessas-2025-anuncia-line-up-completo-' + (timestamp + 5),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 3200,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Conferência de Jovens espera 50 mil participantes',
        descricao: 'Evento em Goiânia terá pregadores internacionais e shows',
        conteudo: '<p>A Conferência Nacional de Jovens, que acontecerá em Goiânia no próximo mês, espera receber cerca de 50 mil participantes de todo o Brasil. O evento contará com pregadores internacionais e shows de bandas gospel.</p>',
        imagem: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
        categoria: 'gshow',
        subcategoria: 'Conferências',
        url_amigavel: 'conferencia-de-jovens-espera-50-mil-participantes-' + (timestamp + 6),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 980,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },

      // Ministérios (quem)
      {
        titulo: 'Pastor Cláudio Duarte completa 30 anos de ministério',
        descricao: 'Líder evangélico celebra três décadas dedicadas à pregação do evangelho',
        conteudo: '<p>O pastor Cláudio Duarte celebrou 30 anos de ministério com uma cerimônia especial em Belo Horizonte. Conhecido por suas pregações bem-humoradas, o líder evangélico reuniu milhares de pessoas no evento comemorativo.</p>',
        imagem: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        categoria: 'quem',
        subcategoria: 'Perfil',
        url_amigavel: 'pastor-claudio-duarte-completa-30-anos-de-ministerio-' + (timestamp + 7),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 1450,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },

      // Estudos (valor)
      {
        titulo: 'Novo curso de teologia online tem inscrições abertas',
        descricao: 'Seminário oferece formação completa em teologia bíblica à distância',
        conteudo: '<p>Um renomado seminário teológico abriu inscrições para seu curso de teologia online. O programa oferece formação completa em teologia bíblica, com duração de três anos e certificação reconhecida.</p>',
        imagem: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
        categoria: 'valor',
        subcategoria: 'Educação',
        url_amigavel: 'novo-curso-de-teologia-online-tem-inscricoes-abertas-' + (timestamp + 8),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 720,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Estudo revela crescimento de igrejas evangélicas no Brasil',
        descricao: 'Pesquisa aponta aumento de 15% no número de congregações nos últimos 5 anos',
        conteudo: '<p>Um estudo realizado por instituto de pesquisa revelou que o número de igrejas evangélicas no Brasil cresceu 15% nos últimos cinco anos. O levantamento também mostrou mudanças no perfil dos fiéis.</p>',
        imagem: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
        categoria: 'valor',
        subcategoria: 'Pesquisas',
        url_amigavel: 'estudo-revela-crescimento-de-igrejas-evangelicas-no-brasil-' + (timestamp + 9),
        autor: 'Redação Obuxixo Gospel',
        visualizacoes: 1890,
        destaque: false,
        publicado: true,
        data_publicacao: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('articles', null, {});
  }
};
