const { Convenio, Notificacion, Usuario } = require('../models');
const { Op } = require('sequelize');

/**
 * Verifica convenios cuya fecha de vencimiento haya pasado, que no estén eliminados lógicamente,
 * y que no hayan sido notificados aún. Genera notificaciones agrupadas para evitar spam.
 */
const verificarConveniosVencidos = async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hoyStr = `${year}-${month}-${day}`;

    // Buscar convenios vencidos y no notificados
    const conveniosVencidos = await Convenio.findAll({
      where: {
        eliminado: false,
        notificadoVencimiento: false,
        fechaVencimiento: {
          [Op.lt]: hoyStr,
        },
      },
    });

    if (conveniosVencidos.length === 0) {
      return;
    }

    // Buscar todos los administradores del sistema
    const admins = await Usuario.findAll({
      where: { rol: 'admin' },
    });

    if (admins.length === 0) {
      return;
    }

    // Armar el mensaje de la notificación
    let titulo = '';
    let mensaje = '';

    if (conveniosVencidos.length === 1) {
      const conv = conveniosVencidos[0];
      titulo = 'Convenio Expirado';
      mensaje = `El convenio con la empresa "${conv.nombreEmpresa}" se ha vencido y ahora está oculto del catálogo de estudiantes.`;
    } else {
      const nombres = conveniosVencidos.map(c => `"${c.nombreEmpresa}"`).join(', ');
      titulo = 'Convenios Expirados';
      mensaje = `Los convenios con las empresas: ${nombres} se han vencido y ahora están ocultos del catálogo de estudiantes.`;
    }

    // Crear la notificación para cada administrador
    for (const admin of admins) {
      await Notificacion.create({
        usuarioId: admin.id,
        tipo: 'sistema',
        titulo,
        mensaje,
        leida: false,
      });
    }

    // Marcar los convenios como notificados
    const idsVencidos = conveniosVencidos.map(c => c.id);
    await Convenio.update(
      { notificadoVencimiento: true },
      {
        where: {
          id: {
            [Op.in]: idsVencidos,
          },
        },
      }
    );

    console.log(`[Verificador Expiración] Notificaciones generadas con éxito para ${conveniosVencidos.length} convenios.`);
  } catch (error) {
    console.error('Error al verificar convenios vencidos:', error);
  }
};

module.exports = {
  verificarConveniosVencidos,
};
