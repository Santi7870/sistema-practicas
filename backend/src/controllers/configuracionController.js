const { Configuracion, Inscripcion } = require('../models');

/**
 * @desc    Obtener todas las configuraciones
 * @route   GET /api/admin/configuraciones
 * @access  Private/Admin
 */
const obtenerConfiguraciones = async (req, res) => {
  try {
    const configuraciones = await Configuracion.findAll();
    res.json({
      success: true,
      data: configuraciones,
    });
  } catch (error) {
    console.error('Error en obtenerConfiguraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones.',
      error: error.message,
    });
  }
};

/**
 * @desc    Actualizar una configuración por clave
 * @route   PUT /api/admin/configuraciones/:clave
 * @access  Private/Admin
 */
const actualizarConfiguracion = async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor, propagar } = req.body;

    if (valor === undefined || valor === null || (valor === '' && clave !== 'fecha_limite_requisitos_global')) {
      return res.status(400).json({
        success: false,
        message: 'El valor de la configuración es requerido.',
      });
    }

    const config = await Configuracion.findOne({ where: { clave } });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada.',
      });
    }

    await config.update({ valor });

    // Si la clave es fecha_limite_requisitos_global y se solicita propagar, actualizar las inscripciones pendientes
    if (clave === 'fecha_limite_requisitos_global' && valor && propagar) {
      const limitDate = new Date(valor);
      if (!isNaN(limitDate.getTime())) {
        limitDate.setHours(23, 59, 59, 999);
        await Inscripcion.update(
          { fechaLimiteDocumentos: limitDate },
          { where: { estadoDocumentosRequisitos: 'pendiente_entrega' } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Configuración actualizada con éxito.',
      data: config,
    });
  } catch (error) {
    console.error('Error en actualizarConfiguracion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerConfiguraciones,
  actualizarConfiguracion,
};
