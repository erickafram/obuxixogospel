module.exports = (sequelize, DataTypes) => {
const Redirect = sequelize.define('Redirect', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  urlAntiga: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      isValidPath(value) {
        if (!value.startsWith('/')) {
          throw new Error('URL antiga deve começar com /');
        }
      }
    }
  },
  urlNova: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidUrl(value) {
        // Aceita URLs relativas (/path) ou absolutas (https://...)
        if (!value.startsWith('/') && !value.startsWith('http')) {
          throw new Error('URL nova deve começar com / ou http');
        }
      }
    }
  },
  tipoRedirecionamento: {
    type: DataTypes.ENUM('301', '302', '307'),
    defaultValue: '301',
    allowNull: false,
    comment: '301=Permanente (SEO), 302=Temporário, 307=Temporário (mantém POST)'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  contadorAcessos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  ultimoAcesso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  criadoPor: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'redirects',
  timestamps: true,
  underscored: false // Manter nomes em camelCase
});

// Método para registrar acesso
Redirect.prototype.registrarAcesso = async function() {
  this.contadorAcessos += 1;
  this.ultimoAcesso = new Date();
  await this.save();
};

// Método estático para buscar redirecionamento ativo
Redirect.buscarPorUrlAntiga = async function(urlAntiga) {
  return await Redirect.findOne({
    where: {
      urlAntiga: urlAntiga,
      ativo: true
    }
  });
};

// Método estático para normalizar URL
Redirect.normalizarUrl = function(url) {
  // Remove query string e hash
  let urlLimpa = url.split('?')[0].split('#')[0];
  
  // Remove trailing slash (exceto para root)
  if (urlLimpa.length > 1 && urlLimpa.endsWith('/')) {
    urlLimpa = urlLimpa.slice(0, -1);
  }
  
  return urlLimpa;
};

return Redirect;
};
