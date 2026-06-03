const {
  Usuario,
  Estudiante,
  Docente,
  Inscripcion,
  Documento,
  Convenio,
  Notificacion,
  Paralelo,
} = require('../models');
const {
  ESTADOS_DOCUMENTO,
  ESTADOS_PROCESO,
  TIPOS_DOCUMENTOS,
} = require('../utils/constants');

/**
 * @desc    Obtener todos los estudiantes asignados a este tutor
 * @route   GET /api/docente/estudiantes
 * @access  Private/Docente
 */
const obtenerEstudiantesAsignados = async (req, res) => {
  try {
    // 1. Obtener perfil del docente logueado
    const docente = await Docente.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!docente) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil de docente asociado a este usuario.',
      });
    }

    // 2. Buscar inscripciones activas donde este docente sea el tutor
    const inscripciones = await Inscripcion.findAll({
      where: {
        tutorId: docente.id,
        activa: true,
      },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'email'],
            },
          ],
        },
        {
          model: Convenio,
          as: 'convenio',
          attributes: ['id', 'nombreEmpresa', 'area'],
        },
        {
          model: Documento,
          as: 'documentos',
          attributes: ['id', 'fase', 'tipoDocumento', 'estado'],
        },
        {
          model: Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // 2.5 Buscar si este docente tiene un paralelo asignado actualmente
    const paraleloDocente = await Paralelo.findOne({
      where: { docenteId: docente.id }
    });

    res.json({
      success: true,
      cantidad: inscripciones.length,
      paraleloAsignado: paraleloDocente ? {
        id: paraleloDocente.id,
        nombre: paraleloDocente.nombre,
        tipoPractica: paraleloDocente.tipoPractica
      } : null,
      tipoTutor: docente.tipoTutor,
      data: inscripciones,
    });
  } catch (error) {
    console.error('Error en obtenerEstudiantesAsignados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes asignados.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener expediente detallado de un estudiante asignado a este tutor
 * @route   GET /api/docente/estudiantes/:estudianteId
 * @access  Private/Docente
 */
const obtenerDetalleEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    // 1. Obtener perfil del docente logueado
    const docente = await Docente.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!docente) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil de docente asociado.',
      });
    }

    // 2. Obtener el estudiante con su inscripción asignada a este docente
    const estudiante = await Estudiante.findByPk(estudianteId, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'createdAt'],
        },
        {
          model: Inscripcion,
          as: 'inscripcion',
          where: {
            tutorId: docente.id,
            activa: true,
          },
          required: true, // Forzar a que la inscripción pertenezca a este tutor
          include: [
            {
              model: Convenio,
              as: 'convenio',
            },
            {
              model: Documento,
              as: 'documentos',
            },
            {
              model: Paralelo,
              as: 'paralelo',
              attributes: ['id', 'nombre'],
            },
          ],
        },
      ],
    });

    if (!estudiante) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado o el estudiante no se encuentra asignado bajo su tutoría activa.',
      });
    }

    res.json({
      success: true,
      data: estudiante,
    });
  } catch (error) {
    console.error('Error en obtenerDetalleEstudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle del estudiante.',
      error: error.message,
    });
  }
};

/**
 * @desc    Revisar (Aprobar o Rechazar) un documento de un estudiante tutorado
 * @route   PUT /api/docente/documentos/:documentoId/revisar
 * @access  Private/Docente
 */
const revisarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;
    const { estado, comentario } = req.body; // estado: 'aprobado' o 'rechazado'

    if (!estado || !['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido y debe ser "aprobado" o "rechazado".',
      });
    }

    if (estado === 'rechazado' && !comentario) {
      return res.status(400).json({
        success: false,
        message: 'Es obligatorio proporcionar una observación/comentario al rechazar el documento.',
      });
    }

    // 1. Obtener perfil del docente logueado
    const docente = await Docente.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!docente) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil de docente asociado.',
      });
    }

    // 2. Obtener documento e inscripción para validar la tutoría
    const documento = await Documento.findByPk(documentoId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [
            {
              model: Estudiante,
              as: 'estudiante',
            },
          ],
        },
      ],
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado.',
      });
    }

    // 3. Validar que la inscripción sea activa y pertenezca al docente logueado
    if (!documento.inscripcion || documento.inscripcion.tutorId !== docente.id || !documento.inscripcion.activa) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No está autorizado para calificar documentos de este alumno.',
      });
    }

    if (documento.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Este documento ya ha sido calificado anteriormente.',
      });
    }

    const estudiante = documento.inscripcion.estudiante;

    if (estado === 'aprobado') {
      // APROBAR
      await documento.update({
        estado: 'aprobado',
        fechaRevision: new Date(),
        comentarioAdmin: null,
      });

      // Verificar si todos los documentos de la fase están aprobados para avanzar
      const documentosFase = await Documento.findAll({
        where: {
          inscripcionId: documento.inscripcionId,
          fase: documento.fase,
        },
      });

      const todosAprobados = documentosFase.every((d) => d.estado === 'aprobado');
      let mensajeNotificacion = `Tu documento "${documento.tipoDocumento}" ha sido aprobado por tu tutor ${docente.nombres}.`;
      let siguienteFase = null;

      if (todosAprobados) {
        if (documento.fase === 2) {
          const documentosRequeridos = TIPOS_DOCUMENTOS.FASE_2.length;
          if (documentosFase.length === documentosRequeridos) {
            await estudiante.update({
              estadoProceso: ESTADOS_PROCESO.EN_PROCESO,
            });
            mensajeNotificacion += ' Ya puedes subir el documento de la Fase 3: Respuesta de la empresa.';
            siguienteFase = 3;
          }
        } else if (documento.fase === 3) {
          mensajeNotificacion += ' Ya puedes subir el documento de la Fase 4: Certificado de prácticas realizadas.';
          siguienteFase = 4;
        } else if (documento.fase === 4) {
          await estudiante.update({
            estadoProceso: ESTADOS_PROCESO.FINALIZADO,
          });
          await documento.inscripcion.update({ activa: false });
          mensajeNotificacion = `¡Felicitaciones! Tu tutor ${docente.nombres} ha aprobado tu expediente final de Fase 4. Has completado tus prácticas preprofesionales con éxito.`;
        }
      }

      // Notificar al estudiante
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: 'Documento aprobado por Tutor',
        mensaje: mensajeNotificacion,
        tipo: 'documento_revisado',
        enlace: '/estudiante/mis-practicas',
      });

      return res.json({
        success: true,
        message: 'Documento aprobado exitosamente.',
        data: {
          documento,
          siguienteFase,
        },
      });

    } else {
      // RECHAZAR
      await documento.update({
        estado: 'rechazado',
        fechaRevision: new Date(),
        comentarioAdmin: comentario,
      });

      // Notificar al estudiante
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: 'Documento rechazado por Tutor',
        mensaje: `Tu documento "${documento.tipoDocumento}" ha sido rechazado por tu tutor ${docente.nombres}. Observación: ${comentario}`,
        tipo: 'documento_revisado',
        enlace: '/estudiante/mis-practicas',
      });

      return res.json({
        success: true,
        message: 'Documento rechazado exitosamente con retroalimentación.',
        data: {
          documento,
        },
      });
    }

  } catch (error) {
    console.error('Error en revisarDocumento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calificar el documento.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerEstudiantesAsignados,
  obtenerDetalleEstudiante,
  revisarDocumento,
};
