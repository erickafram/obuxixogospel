module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'profile_id'
    },
    profileUsername: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'profile_username'
    },
    postCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'post_count'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_read'
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Notification.associate = function(models) {
    Notification.belongsTo(models.InstagramProfile, {
      foreignKey: 'profile_id',
      as: 'profile'
    });
  };

  return Notification;
};
