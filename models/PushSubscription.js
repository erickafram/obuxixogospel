module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    keys_p256dh: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keys_auth: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'push_subscriptions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PushSubscription;
};
