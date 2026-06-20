const {
  Estudiante,
  Convenio,
  Inscripcion,
  Notificacion,
  Usuario,
  Configuracion,
  sequelize,
  Documento,
} = require('../models');
const {
  ESTADOS_PROCESO,
  ESTADOS_INSCRIPCION,
  ROLES,
} = require('../utils/constants');
const fs = require('fs').promises;

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

    // Verificar si el convenio ha vencido
    if (convenio.fechaVencimiento) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const hoy = `${year}-${month}-${day}`;
      if (convenio.fechaVencimiento < hoy) {
        return res.status(400).json({
          success: false,
          message: 'Este convenio ha expirado/vencido y ya no admite inscripciones.',
        });
      }
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

    // Obtener configuración del plazo de entrega
    const confPlazo = await Configuracion.findOne({ where: { clave: 'plazo_entrega_requisitos' } });
    const plazoDias = confPlazo ? parseInt(confPlazo.valor, 10) : 3;

    const confPlazoGlobal = await Configuracion.findOne({ where: { clave: 'fecha_limite_requisitos_global' } });
    let fechaLimiteCalculada = null;

    if (confPlazoGlobal && confPlazoGlobal.valor) {
      const dateVal = confPlazoGlobal.valor.trim();
      if (dateVal) {
        const globalDate = new Date(dateVal);
        if (!isNaN(globalDate.getTime())) {
          // Ajustar al final del día (23:59:59.999) local
          globalDate.setHours(23, 59, 59, 999);
          const hoy = new Date();
          if (globalDate < hoy) {
            return res.status(400).json({
              success: false,
              message: 'El período de entrega de requisitos y postulación ha finalizado para este ciclo.',
            });
          }
          fechaLimiteCalculada = globalDate;
        }
      }
    }

    if (!fechaLimiteCalculada) {
      fechaLimiteCalculada = new Date();
      fechaLimiteCalculada.setDate(fechaLimiteCalculada.getDate() + plazoDias);
    }

    // Ejecutar registro e incremento de cupo dentro de una transacción con bloqueo
    const inscripcion = await sequelize.transaction(async (t) => {
      // Buscar convenio y bloquear la fila para evitar condiciones de carrera (concurrency)
      const convenioLock = await Convenio.findByPk(convenio.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!convenioLock.tieneDisponibilidadPorTipo(modalidad)) {
        throw new Error(`Este convenio no tiene cupos disponibles para prácticas ${modalidad}es.`);
      }

      // Incrementar cupo ocupado
      if (modalidad === 'laboral') {
        convenioLock.cuposLaboralesOcupados += 1;
      } else {
        convenioLock.cuposComunitariosOcupados += 1;
      }
      await convenioLock.save({ transaction: t });

      // Crear inscripción pendiente de revisión
      const nuevaInscripcion = await Inscripcion.create(
        {
          estudianteId: estudiante.id,
          convenioId: convenioLock.id,
          tipoPractica: modalidad,
          estadoInscripcion: ESTADOS_INSCRIPCION.PENDIENTE,
          estadoDocumentosRequisitos: 'pendiente_entrega',
          fechaLimiteDocumentos: fechaLimiteCalculada,
        },
        { transaction: t }
      );

      // Actualizar estado del estudiante a ASIGNADO (esperando requisitos de Fase 1)
      await estudiante.update(
        {
          estadoProceso: ESTADOS_PROCESO.ASIGNADO,
        },
        { transaction: t }
      );

      return nuevaInscripcion;
    });

    // Notificar a administradores
    const admins = await Usuario.findAll({
      where: { rol: ROLES.ADMIN },
    });

    for (const admin of admins) {
      await Notificacion.create({
        usuarioId: admin.id,
        titulo: 'Nueva postulación a convenio registrada',
        mensaje: `${estudiante.nombres} (${estudiante.codigo}) ha pre-registrado un cupo en el convenio "${convenio.nombreEmpresa}" y debe entregar sus documentos de requisitos.`,
        tipo: 'registro',
        enlace: `/admin/estudiantes/${estudiante.id}`,
      });
    }

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: req.usuario.id,
      titulo: '¡Cupo reservado exitosamente!',
      mensaje: `Has reservado tu plaza en "${convenio.nombreEmpresa}". Tienes un plazo de ${plazoDias} días para subir tus 2 documentos de requisitos en tu panel de control.`,
      tipo: 'sistema',
      enlace: '/dashboard',
    });

    res.status(201).json({
      success: true,
      message: 'Inscripción registrada. Tu cupo ha sido reservado. Sube tus requisitos antes del plazo establecido.',
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

/**
 * @desc    Subir/actualizar documentos de requisitos (Fase 1)
 * @route   POST /api/inscripciones/requisitos
 * @access  Private/Estudiante
 */
const subirRequisitos = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
    });

    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });
    }

    const inscripcion = await Inscripcion.findOne({
      where: { estudianteId: estudiante.id, activa: true },
    });

    if (!inscripcion) {
      return res.status(400).json({ success: false, message: 'No tienes una inscripción activa.' });
    }

    // Validar plazo límite
    if (inscripcion.fechaLimiteDocumentos && new Date() > new Date(inscripcion.fechaLimiteDocumentos)) {
      return res.status(400).json({
        success: false,
        message: 'El plazo para entregar los requisitos ha expirado. Por favor, cancela la postulación o solicita al administrador una extensión.',
      });
    }

    // Procesar archivos subidos
    const files = req.files;
    if (!files || (!files.requisito1 && !files.requisito2)) {
      return res.status(400).json({ success: false, message: 'Debes seleccionar al menos un archivo para subir.' });
    }

    // Función auxiliar para guardar/actualizar un requisito
    const guardarRequisito = async (fileKey, tipoDoc) => {
      if (files[fileKey] && files[fileKey][0]) {
        const file = files[fileKey][0];

        // Buscar si ya existe
        const docExistente = await Documento.findOne({
          where: {
            inscripcionId: inscripcion.id,
            fase: 1,
            tipoDocumento: tipoDoc
          }
        });

        if (docExistente) {
          // Borrar físico antiguo
          try {
            await fs.unlink(docExistente.rutaArchivo);
          } catch (err) {
            console.error(`Error al borrar requisito antiguo: ${err.message}`);
          }
          // Actualizar registro
          await docExistente.update({
            nombreArchivo: file.filename,
            rutaArchivo: file.path,
            estado: 'pendiente' // Restablecer a pendiente
          });
        } else {
          // Crear nuevo
          await Documento.create({
            inscripcionId: inscripcion.id,
            fase: 1,
            tipoDocumento: tipoDoc,
            nombreArchivo: file.filename,
            rutaArchivo: file.path,
            estado: 'pendiente'
          });
        }
      }
    };

    await guardarRequisito('requisito1', 'Requisito 1');
    await guardarRequisito('requisito2', 'Requisito 2');

    // Verificar si ya se subieron ambos requisitos (Fase 1 completa en subida)
    const docsFase1 = await Documento.findAll({
      where: {
        inscripcionId: inscripcion.id,
        fase: 1
      }
    });

    // Si ambos están subidos, cambiar el estado de la inscripción
    if (docsFase1.length === 2) {
      await inscripcion.update({
        estadoDocumentosRequisitos: 'en_revision'
      });
    }

    res.json({
      success: true,
      message: 'Requisitos subidos correctamente y puestos en revisión.',
      data: docsFase1
    });

  } catch (error) {
    console.error('Error en subirRequisitos:', error);
    res.status(500).json({ success: false, message: 'Error al subir los requisitos.', error: error.message });
  }
};

/**
 * @desc    Cancelar postulación del convenio (libera el cupo)
 * @route   DELETE /api/inscripciones/cancelar-postulacion
 * @access  Private/Estudiante
 */
const cancelarPostulacion = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
      transaction
    });

    if (!estudiante) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });
    }

    const inscripcion = await Inscripcion.findOne({
      where: { estudianteId: estudiante.id, activa: true },
      include: [{ model: Convenio, as: 'convenio' }],
      transaction
    });

    if (!inscripcion) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No tienes una inscripción activa.' });
    }

    // Solo se puede cancelar si el estadoInscripcion es pendiente (no aprobada)
    if (inscripcion.estadoInscripcion !== ESTADOS_INSCRIPCION.PENDIENTE) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No puedes cancelar una inscripción que ya ha sido aprobada.' });
    }

    // 1. Liberar cupo del convenio de forma segura
    const convenio = inscripcion.convenio;
    if (convenio) {
      if (inscripcion.tipoPractica === 'laboral') {
        convenio.cuposLaboralesOcupados = Math.max(0, convenio.cuposLaboralesOcupados - 1);
      } else {
        convenio.cuposComunitariosOcupados = Math.max(0, convenio.cuposComunitariosOcupados - 1);
      }
      await convenio.save({ transaction });
    }

    // 2. Eliminar documentos físicos de Fase 1
    const documentos = await Documento.findAll({
      where: {
        inscripcionId: inscripcion.id,
        fase: 1
      },
      transaction
    });

    for (const doc of documentos) {
      try {
        await fs.unlink(doc.rutaArchivo);
      } catch (err) {
        console.error(`Error al borrar archivo físico al cancelar: ${err.message}`);
      }
      await doc.destroy({ transaction });
    }

    // 3. Eliminar inscripción
    await inscripcion.destroy({ transaction });

    // 4. Cambiar estadoProceso del estudiante a sin_asignar
    await estudiante.update({
      estadoProceso: ESTADOS_PROCESO.SIN_ASIGNAR
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Postulación cancelada con éxito. Cupo liberado.'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error en cancelarPostulacion:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar la postulación.', error: error.message });
  }
};

module.exports = {
  crearInscripcion,
  obtenerMiInscripcion,
  obtenerInscripcionPorId,
  aprobarInscripcion,
  rechazarInscripcion,
  subirRequisitos,
  cancelarPostulacion,
};