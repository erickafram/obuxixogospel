'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Form extends Model {
    static associate(models) {
      // Um formulário pode ter várias submissões
      Form.hasMany(models.FormSubmission, {
        foreignKey: 'formId',
        as: 'submissions'
      });
      // Um formulário pode estar vinculado a várias páginas
      Form.hasMany(models.Page, {
        foreignKey: 'formId',
        as: 'pages'
      });
    }
  }

  Form.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // JSON com a estrutura dos campos do formulário
    // Exemplo: [{ type: 'text', name: 'nome', label: 'Nome', required: true, placeholder: '' }, ...]
    campos: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('campos');
        try {
          return rawValue ? JSON.parse(rawValue) : [];
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('campos', typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    // Texto do botão de envio
    textoBotao: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Enviar'
    },
    // Mensagem de sucesso após envio
    mensagemSucesso: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Email para receber notificações (opcional)
    emailNotificacao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Form',
    tableName: 'forms',
    underscored: true,
    timestamps: true
  });

  return Form;
};
