const { Notificacion } = require('../models');

/**
 * Crear una nueva notificación
 * @param {number} usuarioId - ID del usuario que recibirá la notificación
 * @param {string} tipo - Tipo de notificación
 * @param {string} titulo - Título de la notificación
 * @param {string} mensaje - Mensaje de la notificación
 * @returns {Promise<Notificacion>}
 */
const crearNotificacion = async (usuarioId, tipo, titulo, mensaje, enlace = null) => {
  try {
    const notificacion = await Notificacion.create({
      usuarioId,
      tipo,
      titulo,
      mensaje,
      leida: false,
      enlace,
    });

    console.log(`✉️ Notificación creada para usuario ${usuarioId}: ${titulo}`);
    return notificacion;
  } catch (error) {
    console.error('❌ Error al crear notificación:', error);
    throw error;
  }
};

/**
 * Marcar notificación como leída
 * @param {number} notificacionId - ID de la notificación
 * @returns {Promise<void>}
 */
const marcarComoLeida = async (notificacionId) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { id: notificacionId } }
    );
  } catch (error) {
    console.error('❌ Error al marcar notificación como leída:', error);
    throw error;
  }
};

/**
 * Obtener notificaciones no leídas de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Notificacion[]>}
 */
const obtenerNoLeidas = async (usuarioId) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: {
        usuarioId,
        leida: false,
      },
      order: [['createdAt', 'DESC']],
    });
    return notificaciones;
  } catch (error) {
    console.error('❌ Error al obtener notificaciones no leídas:', error);
    throw error;
  }
};

/**
 * Contar notificaciones no leídas de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<number>}
 */
const contarNoLeidas = async (usuarioId) => {
  try {
    const count = await Notificacion.count({
      where: {
        usuarioId,
        leida: false,
      },
    });
    return count;
  } catch (error) {
    console.error('❌ Error al contar notificaciones no leídas:', error);
    throw error;
  }
};

module.exports = {
  crearNotificacion,
  marcarComoLeida,
  obtenerNoLeidas,
  contarNoLeidas,
};