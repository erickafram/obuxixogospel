'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('articles', 'instagram_post_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'ID do post do Instagram de origem'
    });

    await queryInterface.addIndex('articles', ['instagram_post_id']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('articles', 'instagram_post_id');
  }
};
