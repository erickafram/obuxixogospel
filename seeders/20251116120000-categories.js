'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Inserir categorias padrão do portal gospel
    await queryInterface.bulkInsert('categories', [
      {
        nome: 'Notícias',
        slug: 'noticias',
        cor: '#3B82F6',
        icone: 'newspaper',
        descricao: 'Notícias do mundo gospel e evangélico',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Música',
        slug: 'musica',
        cor: '#8B5CF6',
        icone: 'music',
        descricao: 'Lançamentos, clipes e novidades da música gospel',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Ministério',
        slug: 'ministerio',
        cor: '#10B981',
        icone: 'church',
        descricao: 'Pastores, pregadores e líderes cristãos',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Eventos',
        slug: 'eventos',
        cor: '#F59E0B',
        icone: 'calendar',
        descricao: 'Congressos, conferências e eventos gospel',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Testemunhos',
        slug: 'testemunhos',
        cor: '#EF4444',
        icone: 'heart',
        descricao: 'Histórias de fé e transformação',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Estudo Bíblico',
        slug: 'estudo-biblico',
        cor: '#6366F1',
        icone: 'book',
        descricao: 'Estudos, reflexões e ensinamentos bíblicos',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Família',
        slug: 'familia',
        cor: '#EC4899',
        icone: 'users',
        descricao: 'Casamento, filhos e vida familiar cristã',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Jovens',
        slug: 'jovens',
        cor: '#14B8A6',
        icone: 'star',
        descricao: 'Conteúdo para juventude cristã',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};
