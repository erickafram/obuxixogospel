module.exports = (sequelize, DataTypes) => {
  const InstagramProfile = sequelize.define('InstagramProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    autoPostEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'auto_post_enabled'
    },
    lastAutoPost: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_auto_post'
    },
    autoPostFrequency: {
      type: DataTypes.STRING(20),
      defaultValue: 'daily',
      allowNull: false,
      field: 'auto_post_frequency'
    },
    autoPostTime: {
      type: DataTypes.STRING(5),
      defaultValue: '09:00',
      allowNull: false,
      field: 'auto_post_time'
    },
    postsPerExecution: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false,
      field: 'posts_per_execution'
    }
  }, {
    tableName: 'instagram_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  InstagramProfile.associate = function(models) {
    // Adicionar associações aqui se necessário
  };

  return InstagramProfile;
};
