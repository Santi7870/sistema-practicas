const { Notificacion, Usuario } = require('../models');

/**
 * @desc    Obtener notificaciones del usuario
 * @route   GET /api/notificaciones
 * @access  Private
 */
const obtenerNotificaciones = async (req, res) => {
  try {
    const { limite = 20, pagina = 1 } = req.query;

    const offset = (pagina - 1) * limite;

    const { count, rows: notificaciones } = await Notificacion.findAndCountAll(
      {
        where: { usuarioId: req.usuario.id },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limite),
        offset: offset,
      }
    );

    res.json({
      success: true,
      data: {
        notificaciones,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / limite),
        },
      },
    });
  } catch (error) {
    console.error('Error en obtenerNotificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener notificaciones no leídas
 * @route   GET /api/notificaciones/no-leidas
 * @access  Private
 */
const obtenerNoLeidas = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: {
        usuarioId: req.usuario.id,
        leida: false,
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      cantidad: notificaciones.length,
      data: notificaciones,
    });
  } catch (error) {
    console.error('Error en obtenerNoLeidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones no leídas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Marcar notificación como leída
 * @route   PUT /api/notificaciones/:notificacionId/marcar-leida
 * @access  Private
 */
const marcarComoLeida = async (req, res) => {
  try {
    const { notificacionId } = req.params;

    const notificacion = await Notificacion.findOne({
      where: {
        id: notificacionId,
        usuarioId: req.usuario.id,
      },
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada.',
      });
    }

    await notificacion.update({ leida: true });

    res.json({
      success: true,
      message: 'Notificación marcada como leída.',
      data: notificacion,
    });
  } catch (error) {
    console.error('Error en marcarComoLeida:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída.',
      error: error.message,
    });
  }
};

/**
 * @desc    Marcar todas las notificaciones como leídas
 * @route   PUT /api/notificaciones/marcar-todas-leidas
 * @access  Private
 */
const marcarTodasLeidas = async (req, res) => {
  try {
    const resultado = await Notificacion.update(
      { leida: true },
      {
        where: {
          usuarioId: req.usuario.id,
          leida: false,
        },
      }
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas.',
      cantidadActualizada: resultado[0],
    });
  } catch (error) {
    console.error('Error en marcarTodasLeidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas las notificaciones como leídas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Eliminar notificación
 * @route   DELETE /api/notificaciones/:notificacionId
 * @access  Private
 */
const eliminarNotificacion = async (req, res) => {
  try {
    const { notificacionId } = req.params;

    const notificacion = await Notificacion.findOne({
      where: {
        id: notificacionId,
        usuarioId: req.usuario.id,
      },
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada.',
      });
    }

    await notificacion.destroy();

    res.json({
      success: true,
      message: 'Notificación eliminada.',
    });
  } catch (error) {
    console.error('Error en eliminarNotificacion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerNotificaciones,
  obtenerNoLeidas,
  marcarComoLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
};