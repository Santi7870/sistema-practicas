const path = require('path');
const fs = require('fs');
const { Estudiante, Usuario, Inscripcion, Convenio, Docente, Documento, Tarea, Entrega } = require('../models');
const {
  CICLOS_FIJOS,
  ensureCiclosParaInscripcion,
  recalcularPromediosCiclos,
  obtenerNotaFinalDesdeCiclos,
} = require('../utils/ciclos');

const obtenerPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    let estudiante = await Estudiante.findOne({
      where: { usuarioId },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email', 'rol', 'estadoCuenta'] }],
    });

    if (!estudiante) {
      try {
        await Estudiante.create({ usuarioId, estadoProceso: 'sin_asignar' });
      } catch (_) {}

      estudiante = await Estudiante.findOne({
        where: { usuarioId },
        include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email', 'rol', 'estadoCuenta'] }],
      });
    }

    return res.json({ success: true, data: estudiante });
  } catch (error) {
    console.error('Error en obtenerPerfil:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};

const completarDatos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { nombres, codigo, semestre } = req.body;

    if (!nombres || !codigo || !semestre) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    if (!/^\d{4}$/.test(codigo)) {
      return res.status(400).json({ success: false, message: 'El codigo debe tener exactamente 4 digitos' });
    }

    if (semestre < 1 || semestre > 10) {
      return res.status(400).json({ success: false, message: 'El semestre debe estar entre 1 y 10' });
    }

    let estudiante = await Estudiante.findOne({ where: { usuarioId } });
    if (!estudiante) {
      try {
        estudiante = await Estudiante.create({ usuarioId, estadoProceso: 'sin_asignar' });
      } catch (_) {
        estudiante = await Estudiante.findOne({ where: { usuarioId } });
      }
    }

    if (estudiante.codigo !== codigo) {
      const codigoExistente = await Estudiante.findOne({ where: { codigo } });
      if (codigoExistente) {
        return res.status(400).json({ success: false, message: 'Este codigo ya esta registrado por otro estudiante' });
      }
    }

    await estudiante.update({
      nombres: nombres.trim(),
      codigo: codigo.trim(),
      semestre: parseInt(semestre, 10),
    });

    return res.json({ success: true, message: 'Datos actualizados exitosamente', data: estudiante });
  } catch (error) {
    console.error('Error en completarDatos:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar datos', error: error.message });
  }
};

const obtenerMisPracticas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    let estudiante = await Estudiante.findOne({
      where: { usuarioId },
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [
            { model: Convenio, as: 'convenio' },
            { model: Documento, as: 'documentos' },
          ],
        },
        {
          model: Inscripcion,
          as: 'inscripciones',
          include: [
            { model: Convenio, as: 'convenio' },
            { model: Documento, as: 'documentos' },
          ],
        },
      ],
    });

    if (!estudiante) {
      try {
        await Estudiante.create({ usuarioId, estadoProceso: 'sin_asignar' });
      } catch (_) {}

      estudiante = await Estudiante.findOne({
        where: { usuarioId },
        include: [
          {
            model: Inscripcion,
            as: 'inscripcion',
            include: [
              { model: Convenio, as: 'convenio' },
              { model: Documento, as: 'documentos' },
            ],
          },
          {
            model: Inscripcion,
            as: 'inscripciones',
            include: [
              { model: Convenio, as: 'convenio' },
              { model: Documento, as: 'documentos' },
            ],
          },
        ],
      });
    }

    return res.json({ success: true, data: estudiante });
  } catch (error) {
    console.error('Error en obtenerMisPracticas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener informacion de practicas', error: error.message });
  }
};

const obtenerDashboard = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    let estudiante = await Estudiante.findOne({
      where: { usuarioId },
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [
            { model: Convenio, as: 'convenio' },
            { model: Documento, as: 'documentos' },
            {
              model: Docente,
              as: 'tutor',
              include: [{ model: Usuario, as: 'usuario', attributes: ['email'] }],
            },
          ],
        },
      ],
    });

    if (!estudiante) {
      try {
        await Estudiante.create({ usuarioId, estadoProceso: 'sin_asignar' });
      } catch (_) {}

      estudiante = await Estudiante.findOne({
        where: { usuarioId },
        include: [
          {
            model: Inscripcion,
            as: 'inscripcion',
            include: [
              { model: Convenio, as: 'convenio' },
              { model: Documento, as: 'documentos' },
              {
                model: Docente,
                as: 'tutor',
                include: [{ model: Usuario, as: 'usuario', attributes: ['email'] }],
              },
            ],
          },
        ],
      });
    }

    let notaFinal = null;
    let ciclos = [];

    if (estudiante.inscripcion && estudiante.inscripcion.tutorId) {
      await recalcularPromediosCiclos({
        inscripcionId: estudiante.inscripcion.id,
        docenteId: estudiante.inscripcion.tutorId,
        tipoPractica: estudiante.inscripcion.tipoPractica,
      });
      const resNota = await obtenerNotaFinalDesdeCiclos(estudiante.inscripcion.id);
      notaFinal = resNota.notaFinal;
      ciclos = resNota.ciclos;
    }

    let aprobadoAcademicamente = false;
    if (notaFinal !== null && notaFinal >= 7.0 && ciclos.length === 3) {
      const todosEvaluados = ciclos.every((c) => c.promedioCiclo !== null);
      if (todosEvaluados) {
        aprobadoAcademicamente = true;
      }
    }

    let siguientePaso = '';
    const accionesRequeridas = [];

    const datosCompletos = estudiante.nombres && estudiante.codigo && estudiante.semestre;

    if (!datosCompletos) {
      siguientePaso = 'Completa tus datos personales para continuar';
      accionesRequeridas.push({
        tipo: 'completar_datos',
        descripcion: 'Debes completar tu informacion personal antes de continuar.',
        urgente: true,
      });
    } else if (aprobadoAcademicamente) {
      siguientePaso = '¡Felicitaciones! Has completado y aprobado académicamente todas tus prácticas preprofesionales.';
    } else if (estudiante.estadoProceso === 'sin_asignar') {
      siguientePaso = 'Inscribete a un convenio de practicas';
    } else if (estudiante.estadoProceso === 'asignado') {
      siguientePaso = 'Espera la aprobacion de tu inscripcion';
    } else if (estudiante.estadoProceso === 'pendiente_inicio') {
      siguientePaso = 'Revisa tus ciclos y tareas asignadas por tu docente';
    } else if (estudiante.estadoProceso === 'en_proceso') {
      siguientePaso = 'Continua con tus entregas por ciclos';
    } else if (estudiante.estadoProceso === 'finalizado') {
      siguientePaso = 'Felicitaciones, has completado tus practicas';
    }

    const documentos = estudiante.inscripcion?.documentos || [];
    const documentosResumen = {
      total: documentos.length,
      aprobados: documentos.filter((d) => d.estado === 'aprobado').length,
      pendientes: documentos.filter((d) => d.estado === 'pendiente').length,
      rechazados: documentos.filter((d) => d.estado === 'rechazado').length,
    };

    const tieneComunitariaAprobada =
      (await Inscripcion.findOne({
        where: {
          estudianteId: estudiante.id,
          tipoPractica: 'comunitaria',
          estadoInscripcion: 'aprobada',
        },
      })) !== null;

    const tieneLaboralAprobada =
      (await Inscripcion.findOne({
        where: {
          estudianteId: estudiante.id,
          tipoPractica: 'laboral',
          estadoInscripcion: 'aprobada',
        },
      })) !== null;

    return res.json({
      success: true,
      data: {
        estudiante,
        siguientePaso,
        accionesRequeridas,
        documentosResumen,
        tieneComunitariaAprobada,
        tieneLaboralAprobada,
        notaFinal,
        ciclos,
      },
    });
  } catch (error) {
    console.error('Error en obtenerDashboard:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener dashboard', error: error.message });
  }
};

const iniciarLaborales = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({ where: { usuarioId: req.usuario.id } });

    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });
    }

    const activeInscripcion = await Inscripcion.findOne({
      where: {
        estudianteId: estudiante.id,
        activa: true,
      },
    });

    let aprobadoAcademicamente = false;
    if (activeInscripcion && activeInscripcion.tipoPractica === 'comunitaria') {
      const resNota = await obtenerNotaFinalDesdeCiclos(activeInscripcion.id);
      const notaFinal = resNota.notaFinal;
      const ciclos = resNota.ciclos;

      if (notaFinal !== null && notaFinal >= 7.0 && ciclos.length === 3) {
        const todosEvaluados = ciclos.every((c) => c.promedioCiclo !== null);
        if (todosEvaluados) {
          aprobadoAcademicamente = true;
        }
      }
    }

    if (estudiante.estadoProceso !== 'finalizado' && !aprobadoAcademicamente) {
      return res.status(400).json({ success: false, message: 'No puedes iniciar practicas laborales en tu estado actual.' });
    }

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
        message: 'No puedes iniciar practicas laborales sin haber aprobado primero las comunitarias.',
      });
    }

    // Desactivar la inscripción comunitaria activa anterior
    if (activeInscripcion && activeInscripcion.tipoPractica === 'comunitaria') {
      await activeInscripcion.update({ activa: false });
    }

    await estudiante.update({ estadoProceso: 'sin_asignar' });

    return res.json({
      success: true,
      message: 'Proceso de practicas laborales iniciado. Ahora puedes seleccionar tu convenio laboral.',
    });
  } catch (error) {
    console.error('Error en iniciarLaborales:', error);
    return res.status(500).json({ success: false, message: 'Error al iniciar practicas laborales.', error: error.message });
  }
};

const obtenerTareas = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({ where: { usuarioId: req.usuario.id } });
    if (!estudiante) return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });

    const { tipo } = req.query;
    const whereClause = { estudianteId: estudiante.id };
    if (tipo) {
      whereClause.tipoPractica = tipo;
    } else {
      whereClause.activa = true;
    }

    const inscripcion = await Inscripcion.findOne({
      where: whereClause,
      include: [{ model: Convenio, as: 'convenio' }],
      order: [['id', 'DESC']],
    });

    if (!inscripcion || !inscripcion.tutorId) {
      return res.json({ success: true, data: [] });
    }

    await ensureCiclosParaInscripcion(inscripcion.id);
    await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: inscripcion.tutorId,
      tipoPractica: inscripcion.tipoPractica,
    });

    const tareas = await Tarea.findAll({
      where: {
        docenteId: inscripcion.tutorId,
        tipoPractica: inscripcion.tipoPractica,
        activa: true,
      },
      include: [
        {
          model: Entrega,
          as: 'entregas',
          where: { inscripcionId: inscripcion.id },
          required: false,
        },
      ],
      order: [['numeroCiclo', 'ASC'], ['fechaCierre', 'ASC']],
    });

    const now = new Date();
    const data = tareas.map((t) => {
      const entrega = t.entregas?.[0] || null;
      const apertura = new Date(t.fechaApertura);
      const cierre = new Date(t.fechaCierre);

      let estadoVentana = 'cerrada';
      if (now < apertura) estadoVentana = 'proxima';
      else if (now <= cierre) estadoVentana = 'abierta';

      const puedeEntregar = estadoVentana === 'abierta' && (!entrega || entrega.estado !== 'calificada');
      const tiempoRestanteSegundos =
        estadoVentana === 'abierta'
          ? Math.max(0, Math.floor((cierre.getTime() - now.getTime()) / 1000))
          : 0;

      return {
        ...t.toJSON(),
        estadoVentana,
        puedeEntregar,
        tiempoRestanteSegundos,
        entrega,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en obtenerTareas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener tareas.', error: error.message });
  }
};

const entregarTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Debes subir un archivo.' });
    }

    const estudiante = await Estudiante.findOne({ where: { usuarioId: req.usuario.id } });
    if (!estudiante) return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });

    const inscripcion = await Inscripcion.findOne({ where: { estudianteId: estudiante.id, activa: true } });
    if (!inscripcion) return res.status(400).json({ success: false, message: 'No tienes una inscripcion activa.' });

    if (!inscripcion.tutorId) {
      return res.status(400).json({ success: false, message: 'Aun no tienes tutor asignado para este modulo.' });
    }

    const tarea = await Tarea.findByPk(tareaId);
    if (!tarea || !tarea.activa) return res.status(404).json({ success: false, message: 'Tarea no disponible.' });

    if (tarea.docenteId !== inscripcion.tutorId || tarea.tipoPractica !== inscripcion.tipoPractica) {
      return res.status(403).json({ success: false, message: 'La tarea no corresponde a tu modalidad/tutor actual.' });
    }

    const now = new Date();
    const apertura = new Date(tarea.fechaApertura);
    const cierre = new Date(tarea.fechaCierre);

    if (now < apertura) {
      return res.status(400).json({ success: false, message: 'La tarea aun no esta habilitada para entrega.' });
    }

    if (now > cierre) {
      return res.status(400).json({ success: false, message: 'La tarea esta cerrada y no acepta entregas.' });
    }

    const existente = await Entrega.findOne({
      where: { tareaId: tarea.id, inscripcionId: inscripcion.id },
    });

    if (existente && existente.estado === 'calificada') {
      return res.status(400).json({ success: false, message: 'Esta tarea ya fue calificada y no puede reemplazarse.' });
    }

    if (existente) {
      await existente.update({
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.path,
        estado: 'pendiente',
        fechaEntrega: now,
        nota: null,
        comentarioDocente: null,
        fechaCalificacion: null,
      });
      return res.json({ success: true, message: 'Entrega actualizada correctamente.', data: existente });
    }

    const entrega = await Entrega.create({
      tareaId: tarea.id,
      inscripcionId: inscripcion.id,
      nombreArchivo: req.file.originalname,
      rutaArchivo: req.file.path,
      estado: 'pendiente',
      fechaEntrega: now,
    });

    return res.status(201).json({ success: true, message: 'Entrega enviada correctamente.', data: entrega });
  } catch (error) {
    console.error('Error en entregarTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar la entrega.', error: error.message });
  }
};

const obtenerMisCalificaciones = async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      where: { usuarioId: req.usuario.id },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email'] }],
    });
    if (!estudiante) return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });

    const { tipo } = req.query;
    const whereClause = { estudianteId: estudiante.id };
    if (tipo) {
      whereClause.tipoPractica = tipo;
    } else {
      whereClause.activa = true;
    }

    const inscripcion = await Inscripcion.findOne({
      where: whereClause,
      order: [['id', 'DESC']],
    });
    if (!inscripcion || !inscripcion.tutorId) {
      return res.json({ success: true, data: { estudiante, ciclos: [], notaFinal: null } });
    }

    await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: inscripcion.tutorId,
      tipoPractica: inscripcion.tipoPractica,
    });

    const tareas = await Tarea.findAll({
      where: {
        docenteId: inscripcion.tutorId,
        tipoPractica: inscripcion.tipoPractica,
      },
      include: [
        {
          model: Entrega,
          as: 'entregas',
          where: { inscripcionId: inscripcion.id },
          required: false,
        },
      ],
      order: [['numeroCiclo', 'ASC'], ['codigo', 'ASC']],
    });

    const { ciclos: ciclosDb, notaFinal } = await obtenerNotaFinalDesdeCiclos(inscripcion.id);
    const promMap = new Map(ciclosDb.map((c) => [c.numeroCiclo, c.promedioCiclo === null ? null : parseFloat(c.promedioCiclo)]));

    const ciclos = CICLOS_FIJOS.map((numeroCiclo) => {
      const tareasCiclo = tareas.filter((t) => t.numeroCiclo === numeroCiclo);
      return {
        numeroCiclo,
        promedio: promMap.get(numeroCiclo) ?? null,
        tareas: tareasCiclo.map((t) => {
          const entrega = t.entregas?.[0] || null;
          return {
            ...t.toJSON(),
            entrega,
          };
        }),
      };
    });

    return res.json({ success: true, data: { estudiante, ciclos, notaFinal } });
  } catch (error) {
    console.error('Error en obtenerMisCalificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener calificaciones.', error: error.message });
  }
};

const previewMiEntrega = async (req, res) => {
  try {
    const { entregaId } = req.params;

    const entrega = await Entrega.findByPk(entregaId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [{ model: Estudiante, as: 'estudiante' }],
        },
      ],
    });

    if (!entrega || !entrega.inscripcion || !entrega.inscripcion.estudiante) {
      return res.status(404).json({ success: false, message: 'Entrega no encontrada.' });
    }

    if (entrega.inscripcion.estudiante.usuarioId !== req.usuario.id) {
      return res.status(403).json({ success: false, message: 'No autorizado para ver esta entrega.' });
    }

    const filePath = path.resolve(entrega.rutaArchivo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    const ext = path.extname(entrega.nombreArchivo).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${entrega.nombreArchivo}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error en previewMiEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al visualizar archivo.', error: error.message });
  }
};

const descargarMiEntrega = async (req, res) => {
  try {
    const { entregaId } = req.params;

    const entrega = await Entrega.findByPk(entregaId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [{ model: Estudiante, as: 'estudiante' }],
        },
      ],
    });

    if (!entrega || !entrega.inscripcion || !entrega.inscripcion.estudiante) {
      return res.status(404).json({ success: false, message: 'Entrega no encontrada.' });
    }

    if (entrega.inscripcion.estudiante.usuarioId !== req.usuario.id) {
      return res.status(403).json({ success: false, message: 'No autorizado para descargar esta entrega.' });
    }

    const filePath = path.resolve(entrega.rutaArchivo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    return res.download(filePath, entrega.nombreArchivo);
  } catch (error) {
    console.error('Error en descargarMiEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar archivo.', error: error.message });
  }
};

module.exports = {
  obtenerPerfil,
  completarDatos,
  obtenerMisPracticas,
  obtenerDashboard,
  iniciarLaborales,
  obtenerTareas,
  entregarTarea,
  obtenerMisCalificaciones,
  previewMiEntrega,
  descargarMiEntrega,
};
