const { Notification, InstagramProfile } = require('../models');

/**
 * Listar notificações não lidas
 */
exports.getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { isRead: false },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Listar todas as notificações
 */
exports.getAllNotifications = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      notifications,
      total: count,
      hasMore: count > (parseInt(offset) + parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Marcar notificação como lida
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificação não encontrada'
      });
    }

    await notification.update({ isRead: true });

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Marcar todas como lidas
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { isRead: false } }
    );

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    console.error('Erro ao marcar todas notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Deletar notificação
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificação não encontrada'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notificação deletada'
    });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Limpar notificações antigas (mais de 30 dias)
 */
exports.cleanOldNotifications = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await Notification.destroy({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: thirtyDaysAgo
        },
        isRead: true
      }
    });

    res.json({
      success: true,
      message: `${deleted} notificações antigas foram removidas`
    });
  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Contar notificações não lidas
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { isRead: false }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Erro ao contar notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
