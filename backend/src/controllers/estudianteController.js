const path = require('path');
const fs = require('fs');
const { Estudiante, Usuario, Inscripcion, Convenio, Docente, Documento, Tarea, Entrega, Paralelo } = require('../models');
const {
  CICLOS_FIJOS,
  ensureCiclosParaInscripcion,
  recalcularPromediosCiclos,
  obtenerNotaFinalDesdeCiclos,
} = require('../utils/ciclos');
const { Op } = require('sequelize');

// ─── Helper: garantiza que las tareas por defecto de todos los ciclos existan ─
const autoSeedTareasDocente = async (docenteId, tipoPractica) => {
  const prefijoTipo = tipoPractica === 'laboral' ? 'LAB' : 'COM';

  const generarCodigo = async (ciclo) => {
    const base = `C${ciclo}-${prefijoTipo}-`;
    const existentes = await Tarea.findAll({
      where: { docenteId, codigo: { [Op.like]: `${base}%` } },
      attributes: ['codigo'],
    });
    const nums = existentes
      .map((t) => { const m = String(t.codigo).match(/-(\d+)$/); return m ? Number(m[1]) : 0; })
      .filter((n) => Number.isFinite(n) && n > 0);
    let sig = nums.length ? Math.max(...nums) + 1 : 1;
    let cod = `${base}${String(sig).padStart(2, '0')}`;
    while (await Tarea.findOne({ where: { docenteId, codigo: cod }, attributes: ['id'] })) {
      sig += 1;
      cod = `${base}${String(sig).padStart(2, '0')}`;
    }
    return cod;
  };

  const crearSiFalta = async (ciclo, titulo) => {
    const existe = await Tarea.findOne({ where: { docenteId, tipoPractica, numeroCiclo: ciclo, titulo } });
    if (!existe) {
      const now = new Date();
      const cierre = new Date();
      cierre.setDate(now.getDate() + 30);
      await Tarea.create({
        docenteId,
        tipoPractica,
        numeroCiclo: ciclo,
        codigo: await generarCodigo(ciclo),
        titulo,
        descripcion: `Formato oficial obligatorio: ${titulo}. Favor descargar, completar, firmar y subir el documento en formato PDF.`,
        puntajeMaximo: 10.0,
        fechaApertura: now,
        fechaCierre: cierre,
        activa: true,
      });
    }
  };

  // Ciclo 1
  for (const t of ['Anexo A', 'Anexo B', 'Anexo C', 'Anexo D']) await crearSiFalta(1, t);

  // Ciclo 2
  for (const t of ['Anexo B', 'Anexo C', 'Anexo D', 'Anexo E', 'Anexo F', 'Consolidado Final']) await crearSiFalta(2, t);

  // Ciclo 3 (Supletorio)
  const existeSup = await Tarea.findOne({ where: { docenteId, tipoPractica, numeroCiclo: 3, titulo: 'Entregable de Supletorio' } });
  if (!existeSup) {
    const now = new Date();
    const cierre = new Date();
    cierre.setDate(now.getDate() + 30);
    await Tarea.create({
      docenteId,
      tipoPractica,
      numeroCiclo: 3,
      codigo: `SUP-${prefijoTipo}-01`,
      titulo: 'Entregable de Supletorio',
      descripcion: 'Formato obligatorio para estudiantes en supletorio. Sube aquí tu archivo firmado de evaluación.',
      puntajeMaximo: 10.0,
      fechaApertura: now,
      fechaCierre: cierre,
      activa: true,
    });
  }
};

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
            { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
          ],
        },
        {
          model: Inscripcion,
          as: 'inscripciones',
          include: [
            { model: Convenio, as: 'convenio' },
            { model: Documento, as: 'documentos' },
            { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
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
              { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
            ],
          },
          {
            model: Inscripcion,
            as: 'inscripciones',
            include: [
              { model: Convenio, as: 'convenio' },
              { model: Documento, as: 'documentos' },
              { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
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
            { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
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
              { model: Paralelo, as: 'paralelo', attributes: ['id', 'nombre'] },
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
    if (notaFinal !== null && notaFinal >= 7.0) {
      aprobadoAcademicamente = true;
    }

    if (estudiante.estadoProceso === 'pendiente_inicio' && estudiante.inscripcion) {
      const hasEntrega = await Entrega.findOne({
        where: { inscripcionId: estudiante.inscripcion.id }
      });
      if (hasEntrega) {
        await estudiante.update({ estadoProceso: 'en_proceso' });
        estudiante.estadoProceso = 'en_proceso';
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

      if (notaFinal !== null && notaFinal >= 7.0) {
        aprobadoAcademicamente = true;
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
    // Garantizar que las tareas de todos los ciclos existan en BD
    await autoSeedTareasDocente(inscripcion.tutorId, inscripcion.tipoPractica);
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

      const puedeEntregar = estadoVentana === 'abierta';
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

    const { ciclos: ciclosDb } = await obtenerNotaFinalDesdeCiclos(inscripcion.id);
    const promMap = new Map(ciclosDb.map((c) => [c.numeroCiclo, c.promedioCiclo === null ? null : parseFloat(c.promedioCiclo)]));

    const c1Prom = promMap.get(1) ?? null;
    const c2Prom = promMap.get(2) ?? null;
    const promBase = (c1Prom !== null && c2Prom !== null) ? Math.round(((c1Prom + c2Prom) / 2 + Number.EPSILON) * 100) / 100 : null;

    const dataFiltrada = data.filter((t) => {
      if (t.numeroCiclo === 3) {
        return promBase !== null && promBase < 7.00;
      }
      return true;
    });

    return res.json({ success: true, data: dataFiltrada });
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

    const isAnexoB = tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.body;

    if (isAnexoB && !['interno', 'externo'].includes(subTarea)) {
      return res.status(400).json({
        success: false,
        message: 'Para el Anexo B, debes especificar si estás entregando la evaluación del Tutor Interno o Externo.',
      });
    }

    if (existente) {
      let logHistorial = [];
      try {
        if (existente.historial) {
          logHistorial = JSON.parse(existente.historial);
        }
      } catch (err) {
        logHistorial = [];
      }

      logHistorial.push({
        fecha: now,
        accion: isAnexoB 
          ? `Re-entrega de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'}`
          : 'Re-entrega de estudiante',
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.path,
        notaPrevia: existente.nota,
        comentarioPrevio: existente.comentarioDocente,
      });

      const updates = {
        estado: 'pendiente',
        fechaEntrega: now,
        fechaCalificacion: null,
        historial: JSON.stringify(logHistorial),
      };

      if (isAnexoB) {
        if (subTarea === 'interno') {
          updates.nombreArchivoInterno = req.file.originalname;
          updates.rutaArchivoInterno = req.file.path;
          updates.notaInterno = null;
          updates.comentarioInterno = null;
        } else {
          updates.nombreArchivoExterno = req.file.originalname;
          updates.rutaArchivoExterno = req.file.path;
          updates.notaExterno = null;
          updates.comentarioExterno = null;
        }
        updates.nombreArchivo = req.file.originalname;
        updates.rutaArchivo = req.file.path;
        updates.nota = null;
      } else {
        updates.nombreArchivo = req.file.originalname;
        updates.rutaArchivo = req.file.path;
        updates.nota = null;
        updates.comentarioDocente = null;
      }

      await existente.update(updates);
      return res.json({ success: true, message: 'Entrega actualizada correctamente.', data: existente });
    }

    const firstLog = [{
      fecha: now,
      accion: isAnexoB 
        ? `Entrega inicial de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'}`
        : 'Entrega inicial de estudiante',
      nombreArchivo: req.file.originalname,
      rutaArchivo: req.file.path,
    }];

    const insertPayload = {
      tareaId: tarea.id,
      inscripcionId: inscripcion.id,
      estado: 'pendiente',
      fechaEntrega: now,
      historial: JSON.stringify(firstLog),
    };

    if (isAnexoB) {
      if (subTarea === 'interno') {
        insertPayload.nombreArchivoInterno = req.file.originalname;
        insertPayload.rutaArchivoInterno = req.file.path;
      } else {
        insertPayload.nombreArchivoExterno = req.file.originalname;
        insertPayload.rutaArchivoExterno = req.file.path;
      }
      insertPayload.nombreArchivo = req.file.originalname;
      insertPayload.rutaArchivo = req.file.path;
    } else {
      insertPayload.nombreArchivo = req.file.originalname;
      insertPayload.rutaArchivo = req.file.path;
    }

    const entrega = await Entrega.create(insertPayload);
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

    const c1Prom = promMap.get(1) ?? null;
    const c2Prom = promMap.get(2) ?? null;
    const promBase = (c1Prom !== null && c2Prom !== null) ? Math.round(((c1Prom + c2Prom) / 2 + Number.EPSILON) * 100) / 100 : null;

    // Conditionally include cycle 3 (Supletorios) only if the base average is less than 7.00
    const visibleCiclos = (promBase !== null && promBase < 7.00) ? [1, 2, 3] : [1, 2];

    const ciclos = visibleCiclos.map((numeroCiclo) => {
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
          model: Tarea,
          as: 'tarea',
        },
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

    const isAnexoF = entrega.tarea && entrega.tarea.titulo.toLowerCase().includes('anexo f');
    if (isAnexoF) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para visualizar el Anexo F (Documento de uso docente).' });
    }

    const { subTarea } = req.query;
    let targetPath = entrega.rutaArchivo;
    let targetName = entrega.nombreArchivo;

    if (subTarea === 'interno' && entrega.rutaArchivoInterno) {
      targetPath = entrega.rutaArchivoInterno;
      targetName = entrega.nombreArchivoInterno;
    } else if (subTarea === 'externo' && entrega.rutaArchivoExterno) {
      targetPath = entrega.rutaArchivoExterno;
      targetName = entrega.nombreArchivoExterno;
    }

    if (!targetPath) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible.' });
    }

    const filePath = path.resolve(targetPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    const ext = path.extname(targetName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${targetName}"`);
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
          model: Tarea,
          as: 'tarea',
        },
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

    const isAnexoF = entrega.tarea && entrega.tarea.titulo.toLowerCase().includes('anexo f');
    if (isAnexoF) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para descargar el Anexo F (Documento de uso docente).' });
    }

    const { subTarea } = req.query;
    let targetPath = entrega.rutaArchivo;
    let targetName = entrega.nombreArchivo;

    if (subTarea === 'interno' && entrega.rutaArchivoInterno) {
      targetPath = entrega.rutaArchivoInterno;
      targetName = entrega.nombreArchivoInterno;
    } else if (subTarea === 'externo' && entrega.rutaArchivoExterno) {
      targetPath = entrega.rutaArchivoExterno;
      targetName = entrega.nombreArchivoExterno;
    }

    if (!targetPath) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible.' });
    }

    const filePath = path.resolve(targetPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    return res.download(filePath, targetName);
  } catch (error) {
    console.error('Error en descargarMiEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar archivo.', error: error.message });
  }
};

const descargarPlantillaTareaEstudiante = async (req, res) => {
  try {
    const { tareaId } = req.params;

    const estudiante = await Estudiante.findOne({ where: { usuarioId: req.usuario.id } });
    if (!estudiante) return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });

    const tarea = await Tarea.findByPk(tareaId);
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });

    // Validate active enrollment matching the task's practice type and tutor (docente)
    const inscripcion = await Inscripcion.findOne({
      where: {
        estudianteId: estudiante.id,
        activa: true,
        tipoPractica: tarea.tipoPractica,
        tutorId: tarea.docenteId,
      }
    });

    if (!inscripcion) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No está autorizado para descargar archivos de esta tarea o no corresponde a su paralelo tutorado activo.'
      });
    }

    if (!tarea.templatePath) {
      return res.status(404).json({ success: false, message: 'Plantilla no disponible para esta tarea.' });
    }

    const filePath = path.resolve(tarea.templatePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo de plantilla no encontrado.' });
    }

    return res.download(filePath, tarea.templateName);
  } catch (error) {
    console.error('Error en descargarPlantillaTareaEstudiante:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar archivo base.', error: error.message });
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
  descargarPlantillaTareaEstudiante,
};
