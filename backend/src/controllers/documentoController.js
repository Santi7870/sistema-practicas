const {
  Documento,
  Inscripcion,
  Estudiante,
  Usuario,
  Notificacion,
  Docente,
} = require('../models');
const {
  TIPOS_DOCUMENTOS,
  ESTADOS_PROCESO,
  ESTADOS_DOCUMENTO,
  ROLES,
} = require('../utils/constants');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Subir documento
 * @route   POST /api/documentos/subir
 * @access  Private/Estudiante
 */
const subirDocumento = async (req, res) => {
  try {
    const { fase, tipoDocumento } = req.body;

    // Validaciones
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Por favor selecciona un archivo.',
      });
    }

    if (!fase || !tipoDocumento) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona la fase y el tipo de documento.',
      });
    }

    // Validar que el tipo de documento corresponda a la fase
    const faseNum = parseInt(fase);
    if (![2, 3, 4].includes(faseNum)) {
      return res.status(400).json({
        success: false,
        message: 'La fase debe ser 2, 3 o 4.',
      });
    }

    if (!TIPOS_DOCUMENTOS[`FASE_${faseNum}`].includes(tipoDocumento)) {
      return res.status(400).json({
        success: false,
        message: `El tipo de documento no corresponde a la fase ${faseNum}.`,
      });
    }

    // Obtener estudiante
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          required: false,
        },
      ],
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    if (!estudiante.inscripcion) {
      return res.status(400).json({
        success: false,
        message: 'No tienes una inscripción activa.',
      });
    }

    // Verificar que el estudiante esté en la fase correcta
    const estadoRequerido = {
      2: ESTADOS_PROCESO.PENDIENTE_INICIO,
      3: ESTADOS_PROCESO.EN_PROCESO,
      4: ESTADOS_PROCESO.EN_PROCESO,
    };

    if (estudiante.estadoProceso !== estadoRequerido[faseNum]) {
      return res.status(400).json({
        success: false,
        message: `No puedes subir documentos de la fase ${faseNum} en tu estado actual.`,
      });
    }

    // Para fase 3 y 4, verificar que los documentos anteriores estén aprobados
    if (faseNum === 3) {
      const docsFase2 = await Documento.findAll({
        where: {
          inscripcionId: estudiante.inscripcion.id,
          fase: 2,
        },
      });

      if (docsFase2.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Primero debes subir los documentos de la Fase 2.',
        });
      }

      if (!docsFase2.every((d) => d.estado === ESTADOS_DOCUMENTO.APROBADO)) {
        return res.status(400).json({
          success: false,
          message:
            'Los documentos de la Fase 2 deben estar aprobados antes de continuar.',
        });
      }
    }

    if (faseNum === 4) {
      const docsFase3 = await Documento.findAll({
        where: {
          inscripcionId: estudiante.inscripcion.id,
          fase: 3,
        },
      });

      if (docsFase3.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Primero debes subir el documento de la Fase 3.',
        });
      }

      if (!docsFase3.every((d) => d.estado === ESTADOS_DOCUMENTO.APROBADO)) {
        return res.status(400).json({
          success: false,
          message:
            'El documento de la Fase 3 debe estar aprobado antes de continuar.',
        });
      }
    }

    // Verificar si ya existe un documento de este tipo y fase
    const documentoExistente = await Documento.findOne({
      where: {
        inscripcionId: estudiante.inscripcion.id,
        fase: faseNum,
        tipoDocumento,
      },
    });

    if (documentoExistente && documentoExistente.estado !== ESTADOS_DOCUMENTO.RECHAZADO) {
      return res.status(400).json({
        success: false,
        message: 'Ya has subido este documento. Espera a que sea revisado.',
      });
    }

    // Si existe un documento rechazado, eliminarlo antes de crear uno nuevo
    if (documentoExistente && documentoExistente.estado === ESTADOS_DOCUMENTO.RECHAZADO) {
      // Eliminar archivo físico antiguo
      try {
        await fs.unlink(documentoExistente.rutaArchivo);
      } catch (err) {
        console.error('Error al eliminar archivo antiguo:', err);
      }
      await documentoExistente.destroy();
    }

    // Crear registro del documento
    const documento = await Documento.create({
      inscripcionId: estudiante.inscripcion.id,
      fase: faseNum,
      tipoDocumento,
      nombreArchivo: req.file.filename,
      rutaArchivo: req.file.path,
      estado: ESTADOS_DOCUMENTO.PENDIENTE,
    });

    // Notificar a administradores
    const admins = await Usuario.findAll({
      where: { rol: ROLES.ADMIN },
    });

    for (const admin of admins) {
      await Notificacion.create({
        usuarioId: admin.id,
        titulo: 'Nuevo documento subido',
        mensaje: `${estudiante.nombres} ha subido el documento "${tipoDocumento}" de la Fase ${faseNum}.`,
        tipo: 'documento_subido',
        enlace: `/admin/estudiantes/${estudiante.id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente. Espera la revisión del administrador.',
      data: documento,
    });
  } catch (error) {
    console.error('Error en subirDocumento:', error);

    // Si hubo error y se subió un archivo, eliminarlo
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Error al eliminar archivo:', err);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error al subir documento.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener mis documentos
 * @route   GET /api/documentos/mis-documentos
 * @access  Private/Estudiante
 */
const obtenerMisDocumentos = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          required: false,
        },
      ],
    });

    if (!estudiante || !estudiante.inscripcion) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const documentos = await Documento.findAll({
      where: { inscripcionId: estudiante.inscripcion.id },
      order: [
        ['fase', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json({
      success: true,
      data: documentos,
    });
  } catch (error) {
    console.error('Error en obtenerMisDocumentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener documentos por inscripción
 * @route   GET /api/documentos/inscripcion/:inscripcionId
 * @access  Private/Admin
 */
const obtenerDocumentosPorInscripcion = async (req, res) => {
  try {
    const { inscripcionId } = req.params;

    const documentos = await Documento.findAll({
      where: { inscripcionId },
      order: [
        ['fase', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json({
      success: true,
      data: documentos,
    });
  } catch (error) {
    console.error('Error en obtenerDocumentosPorInscripcion:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aprobar documento
 * @route   PUT /api/documentos/:documentoId/aprobar
 * @access  Private/Admin
 */
const aprobarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

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

    if (documento.estado !== ESTADOS_DOCUMENTO.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Este documento ya fue procesado.',
      });
    }

    // Aprobar documento
    await documento.update({
      estado: ESTADOS_DOCUMENTO.APROBADO,
      fechaRevision: new Date(),
      comentarioAdmin: null,
    });

    const estudiante = documento.inscripcion.estudiante;

    // Verificar si todos los documentos de la fase están aprobados para avanzar
    const documentosFase = await Documento.findAll({
      where: {
        inscripcionId: documento.inscripcionId,
        fase: documento.fase,
      },
    });

    const todosAprobados = documentosFase.every(
      (d) => d.estado === ESTADOS_DOCUMENTO.APROBADO
    );

    let mensajeNotificacion = `Tu documento "${documento.tipoDocumento}" ha sido aprobado.`;
    let siguienteFase = null;

    if (todosAprobados) {
      // Cambiar estado según la fase
      if (documento.fase === 2) {
        // Todos los docs de Fase 2 aprobados -> pasar a EN_PROCESO (Fase 3)
        const documentosRequeridos = TIPOS_DOCUMENTOS.FASE_2.length;
        if (documentosFase.length === documentosRequeridos) {
          await estudiante.update({
            estadoProceso: ESTADOS_PROCESO.EN_PROCESO,
          });
          mensajeNotificacion += ' Ya puedes subir el documento de la Fase 3: Respuesta de la empresa.';
          siguienteFase = 3;
        }
      } else if (documento.fase === 3) {
        // Fase 3 aprobada -> continuar en EN_PROCESO para Fase 4
        mensajeNotificacion += ' Ya puedes subir el documento de la Fase 4: Certificado de prácticas realizadas.';
        siguienteFase = 4;
      } else if (documento.fase === 4) {
        // Fase 4 aprobada -> FINALIZADO
        await estudiante.update({
          estadoProceso: ESTADOS_PROCESO.FINALIZADO,
        });
        // Desactivar la inscripción actual para archivarla
        await documento.inscripcion.update({ activa: false });
        mensajeNotificacion = '¡Felicitaciones! Has completado exitosamente todas las fases de las prácticas preprofesionales.';
      }
    }

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: estudiante.usuarioId,
      titulo: 'Documento aprobado',
      mensaje: mensajeNotificacion,
      tipo: 'documento_revisado',
      enlace: '/estudiante/mis-practicas',
    });

    res.json({
      success: true,
      message: 'Documento aprobado exitosamente.',
      data: {
        documento,
        siguienteFase,
      },
    });
  } catch (error) {
    console.error('Error en aprobarDocumento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar documento.',
      error: error.message,
    });
  }
};

/**
 * @desc    Rechazar documento
 * @route   PUT /api/documentos/:documentoId/rechazar
 * @access  Private/Admin
 */
const rechazarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;
    const { comentario } = req.body;

    if (!comentario) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona un comentario explicando el rechazo.',
      });
    }

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

    if (documento.estado !== ESTADOS_DOCUMENTO.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Este documento ya fue procesado.',
      });
    }

    // Rechazar documento
    await documento.update({
      estado: ESTADOS_DOCUMENTO.RECHAZADO,
      comentarioAdmin: comentario,
      fechaRevision: new Date(),
    });

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: documento.inscripcion.estudiante.usuarioId,
      titulo: 'Documento rechazado',
      mensaje: `Tu documento "${documento.tipoDocumento}" fue rechazado. Motivo: ${comentario}. Por favor, corrige y vuelve a subirlo.`,
      tipo: 'documento_revisado',
      enlace: '/estudiante/mis-practicas',
    });

    res.json({
      success: true,
      message: 'Documento rechazado. El estudiante ha sido notificado.',
      data: documento,
    });
  } catch (error) {
    console.error('Error en rechazarDocumento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar documento.',
      error: error.message,
    });
  }
};

/**
 * @desc    Eliminar documento
 * @route   DELETE /api/documentos/:documentoId
 * @access  Private/Admin
 */
const eliminarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

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

    // Eliminar archivo físico
    try {
      await fs.unlink(documento.rutaArchivo);
    } catch (err) {
      console.error('Error al eliminar archivo físico:', err);
    }

    // Eliminar registro
    await documento.destroy();

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: documento.inscripcion.estudiante.usuarioId,
      titulo: 'Documento eliminado',
      mensaje: `El documento "${documento.tipoDocumento}" ha sido eliminado por el administrador. Debes volver a subirlo.`,
      tipo: 'sistema',
      enlace: '/estudiante/mis-practicas',
    });

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente.',
    });
  } catch (error) {
    console.error('Error en eliminarDocumento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento.',
      error: error.message,
    });
  }
};

/**
 * @desc    Descargar documento
 * @route   GET /api/documentos/:documentoId/descargar
 * @access  Private
 */
const descargarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const documento = await Documento.findByPk(documentoId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
        },
      ],
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado.',
      });
    }

    // Validar permisos según rol
    if (req.usuario.rol === 'docente') {
      const docente = await Docente.findOne({ where: { usuarioId: req.usuario.id } });
      if (!docente) {
        return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
      }

      if (!documento.inscripcion || documento.inscripcion.tutorId !== docente.id || !documento.inscripcion.activa) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Este estudiante no está asignado bajo tu tutoría activa.',
        });
      }
    } else if (req.usuario.rol === 'estudiante') {
      const estudiante = await Estudiante.findOne({ where: { usuarioId: req.usuario.id } });
      if (!estudiante || !documento.inscripcion || documento.inscripcion.estudianteId !== estudiante.id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No puedes descargar documentos de otros estudiantes.',
        });
      }
    }

    // Verificar que el archivo existe
    try {
      await fs.access(documento.rutaArchivo);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: 'El archivo no existe en el servidor.',
      });
    }

    // Enviar archivo
    res.download(documento.rutaArchivo, documento.nombreArchivo);
  } catch (error) {
    console.error('Error en descargarDocumento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar documento.',
      error: error.message,
    });
  }
};

/**
 * @desc    Eliminar documento por el estudiante (solo si está pendiente)
 * @route   DELETE /api/documentos/estudiante/:documentoId
 * @access  Private/Estudiante
 */
const eliminarDocumentoEstudiante = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    const documento = await Documento.findByPk(documentoId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
        },
      ],
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado.',
      });
    }

    // Validar pertenencia
    if (documento.inscripcion.estudianteId !== estudiante.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este documento.',
      });
    }

    // Validar estado pendiente
    if (documento.estado !== ESTADOS_DOCUMENTO.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes eliminar documentos que se encuentren en estado Pendiente.',
      });
    }

    // Eliminar archivo físico
    try {
      await fs.unlink(documento.rutaArchivo);
    } catch (err) {
      console.error('Error al eliminar archivo físico:', err);
    }

    // Eliminar de base de datos
    await documento.destroy();

    res.json({
      success: true,
      message: 'Documento eliminado correctamente.',
    });
  } catch (error) {
    console.error('Error en eliminarDocumentoEstudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el documento.',
      error: error.message,
    });
  }
};

module.exports = {
  subirDocumento,
  obtenerMisDocumentos,
  obtenerDocumentosPorInscripcion,
  aprobarDocumento,
  rechazarDocumento,
  eliminarDocumento,
  descargarDocumento,
  eliminarDocumentoEstudiante,
};