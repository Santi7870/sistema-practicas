const {
  Estudiante,
  Convenio,
  Inscripcion,
  Notificacion,
  Usuario,
} = require('../models');
const {
  ESTADOS_PROCESO,
  ESTADOS_INSCRIPCION,
  ROLES,
} = require('../utils/constants');

/**
 * @desc    Crear inscripción a prácticas
 * @route   POST /api/inscripciones
 * @access  Private/Estudiante
 */
const crearInscripcion = async (req, res) => {
  try {
    const { convenioId, tipoPractica } = req.body;

    if (!convenioId) {
      return res.status(400).json({
        success: false,
        message: 'Por favor selecciona un convenio.',
      });
    }

    // Obtener estudiante
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    // Verificar que el estudiante haya completado sus datos
    if (!estudiante.nombres || !estudiante.codigo || !estudiante.semestre) {
      return res.status(400).json({
        success: false,
        message: 'Debes completar tus datos personales antes de inscribirte.',
      });
    }

    // Regla de Negocio: Semestre mínimo (5to semestre)
    if (estudiante.semestre < 5) {
      return res.status(400).json({
        success: false,
        message: 'Debes estar al menos en el 5to semestre para poder inscribirte a prácticas preprofesionales.',
      });
    }

    // Verificar que el estudiante no tenga ya una inscripción activa (activa: true)
    const inscripcionExistente = await Inscripcion.findOne({
      where: { estudianteId: estudiante.id, activa: true },
    });

    if (inscripcionExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una inscripción activa.',
      });
    }

    // Verificar que el convenio existe y está activo
    const convenio = await Convenio.findByPk(convenioId);

    if (!convenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    if (!convenio.activo) {
      return res.status(400).json({
        success: false,
        message: 'Este convenio no está activo.',
      });
    }

    // Validar modalidad
    if (tipoPractica && !['laboral', 'comunitaria'].includes(tipoPractica)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de práctica inválido. Debe ser laboral o comunitaria.',
      });
    }

    const modalidad = tipoPractica || 'laboral';

    // Regla de Negocio: Prerrequisito Secuencial y Exclusividad
    if (modalidad === 'laboral') {
      const tieneComunitariaAprobada = await Inscripcion.findOne({
        where: {
          estudianteId: estudiante.id,
          tipoPractica: 'comunitaria',
          estadoInscripcion: 'aprobada',
        },
      });

      if (!tieneComunitariaAprobada) {
        return res.status(400).json({
          success: false,
          message: 'Requisito no cumplido: Primero debes realizar y aprobar las Prácticas Comunitarias para poder inscribirte en Prácticas Laborales.',
        });
      }
    } else if (modalidad === 'comunitaria') {
      const tieneComunitariaAprobada = await Inscripcion.findOne({
        where: {
          estudianteId: estudiante.id,
          tipoPractica: 'comunitaria',
          estadoInscripcion: 'aprobada',
        },
      });

      if (tieneComunitariaAprobada) {
        return res.status(400).json({
          success: false,
          message: 'Ya has aprobado tus Prácticas Comunitarias. Por favor inscríbete en la modalidad de Prácticas Laborales.',
        });
      }
    }

    // Verificar disponibilidad de cupos según la modalidad
    if (!convenio.tieneDisponibilidadPorTipo(modalidad)) {
      return res.status(400).json({
        success: false,
        message: `Este convenio no tiene cupos disponibles para prácticas ${modalidad}es.`,
      });
    }

    // Crear inscripción aprobada automáticamente
    const inscripcion = await Inscripcion.create({
      estudianteId: estudiante.id,
      convenioId: convenio.id,
      tipoPractica: modalidad,
      estadoInscripcion: ESTADOS_INSCRIPCION.APROBADA,
      fechaAprobacion: new Date(),
    });

    // Incrementar cupos ocupados de forma segura (ejecutando hooks antes de guardar)
    if (modalidad === 'laboral') {
      convenio.cuposLaboralesOcupados += 1;
    } else {
      convenio.cuposComunitariosOcupados += 1;
    }
    await convenio.save();

    // Actualizar estado del estudiante a Fase 2 (pendiente_inicio) directamente
    await estudiante.update({
      estadoProceso: ESTADOS_PROCESO.PENDIENTE_INICIO,
    });

    // Notificar a administradores
    const admins = await Usuario.findAll({
      where: { rol: ROLES.ADMIN },
    });

    for (const admin of admins) {
      await Notificacion.create({
        usuarioId: admin.id,
        titulo: 'Nueva inscripción aprobada automáticamente',
        mensaje: `${estudiante.nombres} (${estudiante.codigo}) se ha inscrito automáticamente al convenio "${convenio.nombreEmpresa}" al haber cupos disponibles.`,
        tipo: 'aprobacion',
        enlace: `/admin/estudiantes/${estudiante.id}`,
      });
    }

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: req.usuario.id,
      titulo: '¡Inscripción aprobada automáticamente!',
      mensaje: `Tu inscripción al convenio "${convenio.nombreEmpresa}" ha sido aprobada automáticamente. Ya puedes iniciar con la Fase 2 del proceso.`,
      tipo: 'aprobacion',
      enlace: '/estudiante/mis-practicas',
    });

    res.status(201).json({
      success: true,
      message: 'Inscripción aprobada automáticamente. ¡Ya puedes iniciar tus prácticas!',
      data: inscripcion,
    });
  } catch (error) {
    console.error('Error en crearInscripcion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear inscripción.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener la inscripción del estudiante actual
 * @route   GET /api/inscripciones/mi-inscripcion
 * @access  Private/Estudiante
 */
const obtenerMiInscripcion = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    const inscripcion = await Inscripcion.findOne({
      where: { estudianteId: estudiante.id },
      include: [
        {
          model: Convenio,
          as: 'convenio',
        },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una inscripción activa.',
      });
    }

    res.json({
      success: true,
      data: inscripcion,
    });
  } catch (error) {
    console.error('Error en obtenerMiInscripcion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener inscripción.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener inscripción por ID
 * @route   GET /api/inscripciones/:inscripcionId
 * @access  Private/Admin
 */
const obtenerInscripcionPorId = async (req, res) => {
  try {
    const { inscripcionId } = req.params;

    const inscripcion = await Inscripcion.findByPk(inscripcionId, {
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['email'],
            },
          ],
        },
        {
          model: Convenio,
          as: 'convenio',
        },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada.',
      });
    }

    res.json({
      success: true,
      data: inscripcion,
    });
  } catch (error) {
    console.error('Error en obtenerInscripcionPorId:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener inscripción.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aprobar inscripción
 * @route   PUT /api/inscripciones/:inscripcionId/aprobar
 * @access  Private/Admin
 */
const aprobarInscripcion = async (req, res) => {
  try {
    const { inscripcionId } = req.params;

    const inscripcion = await Inscripcion.findByPk(inscripcionId, {
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
        },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada.',
      });
    }

    if (inscripcion.estadoInscripcion !== ESTADOS_INSCRIPCION.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Esta inscripción ya fue procesada.',
      });
    }

    // Aprobar inscripción
    await inscripcion.update({
      estadoInscripcion: ESTADOS_INSCRIPCION.APROBADA,
      fechaAprobacion: new Date(),
    });

    // Actualizar estado del estudiante a PENDIENTE_INICIO (Fase 2)
    await inscripcion.estudiante.update({
      estadoProceso: ESTADOS_PROCESO.PENDIENTE_INICIO,
    });

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: inscripcion.estudiante.usuarioId,
      titulo: '¡Inscripción aprobada!',
      mensaje:
        'Tu inscripción a las prácticas ha sido aprobada. Ahora debes subir los documentos de la Fase 2: Oficio de prácticas y Anexo A.',
      tipo: 'aprobacion',
      enlace: '/estudiante/mis-practicas',
    });

    res.json({
      success: true,
      message: 'Inscripción aprobada exitosamente.',
      data: inscripcion,
    });
  } catch (error) {
    console.error('Error en aprobarInscripcion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar inscripción.',
      error: error.message,
    });
  }
};

/**
 * @desc    Rechazar inscripción
 * @route   PUT /api/inscripciones/:inscripcionId/rechazar
 * @access  Private/Admin
 */
const rechazarInscripcion = async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { comentario } = req.body;

    const inscripcion = await Inscripcion.findByPk(inscripcionId, {
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
        },
        {
          model: Convenio,
          as: 'convenio',
        },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada.',
      });
    }

    if (inscripcion.estadoInscripcion !== ESTADOS_INSCRIPCION.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Esta inscripción ya fue procesada.',
      });
    }

    // Rechazar inscripción
    await inscripcion.update({
      estadoInscripcion: ESTADOS_INSCRIPCION.RECHAZADA,
      comentarioAdmin: comentario || 'Inscripción rechazada',
    });

    // Liberar cupo del convenio según el tipo de práctica de forma segura
    if (inscripcion.tipoPractica === 'laboral') {
      inscripcion.convenio.cuposLaboralesOcupados = Math.max(0, inscripcion.convenio.cuposLaboralesOcupados - 1);
    } else {
      inscripcion.convenio.cuposComunitariosOcupados = Math.max(0, inscripcion.convenio.cuposComunitariosOcupados - 1);
    }
    await inscripcion.convenio.save();

    // Revertir estado del estudiante a SIN_ASIGNAR
    await inscripcion.estudiante.update({
      estadoProceso: ESTADOS_PROCESO.SIN_ASIGNAR,
    });

    // Eliminar la inscripción
    await inscripcion.destroy();

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: inscripcion.estudiante.usuarioId,
      titulo: 'Inscripción rechazada',
      mensaje: `Tu inscripción fue rechazada. Motivo: ${comentario || 'No especificado'}. Puedes volver a inscribirte seleccionando otro convenio.`,
      tipo: 'rechazo',
      enlace: '/dashboard',
    });

    res.json({
      success: true,
      message: 'Inscripción rechazada.',
    });
  } catch (error) {
    console.error('Error en rechazarInscripcion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar inscripción.',
      error: error.message,
    });
  }
};

module.exports = {
  crearInscripcion,
  obtenerMiInscripcion,
  obtenerInscripcionPorId,
  aprobarInscripcion,
  rechazarInscripcion,
};