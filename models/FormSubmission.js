'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FormSubmission extends Model {
    static associate(models) {
      // Uma submissão pertence a um formulário
      FormSubmission.belongsTo(models.Form, {
        foreignKey: 'formId',
        as: 'form'
      });
    }
  }

  FormSubmission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    formId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'forms',
        key: 'id'
      }
    },
    // JSON com os dados enviados pelo usuário
    // Exemplo: { nome: 'João', email: 'joao@email.com', mensagem: '...' }
    dados: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('dados');
        try {
          return rawValue ? JSON.parse(rawValue) : {};
        } catch (e) {
          return {};
        }
      },
      set(value) {
        this.setDataValue('dados', typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    // IP do usuário que enviou
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    // User agent do navegador
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Página de origem (slug)
    paginaOrigem: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    // Status: novo, lido, respondido, arquivado
    status: {
      type: DataTypes.ENUM('novo', 'lido', 'respondido', 'arquivado'),
      defaultValue: 'novo',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'FormSubmission',
    tableName: 'form_submissions',
    underscored: true,
    timestamps: true
  });

  return FormSubmission;
};
