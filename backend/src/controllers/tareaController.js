const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
  Usuario,
  Estudiante,
  Docente,
  Inscripcion,
  Tarea,
  Entrega,
  Convenio,
  Notificacion,
} = require('../models');
const {
  CICLOS_FIJOS,
  recalcularPromediosCiclos,
  obtenerNotaFinalDesdeCiclos,
} = require('../utils/ciclos');

const calcularEstadoVentana = (tarea) => {
  const now = new Date();
  const apertura = new Date(tarea.fechaApertura);
  const cierre = new Date(tarea.fechaCierre);
  if (now < apertura) return 'proxima';
  if (now <= cierre) return 'abierta';
  return 'cerrada';
};

const obtenerDocenteLogueado = async (usuarioId) => {
  return Docente.findOne({ where: { usuarioId } });
};

const generarCodigoTarea = async (docenteId, tipoPractica, numeroCiclo) => {
  const prefijoTipo = tipoPractica === 'laboral' ? 'LAB' : 'COM';
  const base = `C${numeroCiclo}-${prefijoTipo}-`;

  const existentes = await Tarea.findAll({
    where: {
      docenteId,
      codigo: { [Op.like]: `${base}%` },
    },
    attributes: ['codigo'],
  });

  const nums = existentes
    .map((t) => {
      const m = String(t.codigo).match(/-(\d+)$/);
      return m ? Number(m[1]) : 0;
    })
    .filter((n) => Number.isFinite(n) && n > 0);

  let siguiente = nums.length ? Math.max(...nums) + 1 : 1;
  let codigo = `${base}${String(siguiente).padStart(2, '0')}`;

  while (await Tarea.findOne({ where: { docenteId, codigo }, attributes: ['id'] })) {
    siguiente += 1;
    codigo = `${base}${String(siguiente).padStart(2, '0')}`;
  }

  return codigo;
};

const crearTarea = async (req, res) => {
  try {
    const {
      tipoPractica,
      numeroCiclo,
      titulo,
      descripcion,
      puntajeMaximo,
      fechaApertura,
      fechaCierre,
    } = req.body;

    if (!tipoPractica || !numeroCiclo || !titulo || !fechaApertura || !fechaCierre) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos requeridos: tipoPractica, numeroCiclo, titulo, fechaApertura, fechaCierre.',
      });
    }

    if (!['laboral', 'comunitaria'].includes(tipoPractica)) {
      return res.status(400).json({ success: false, message: 'tipoPractica invalido.' });
    }

    if (![1, 2, 3].includes(Number(numeroCiclo))) {
      return res.status(400).json({ success: false, message: 'El numero de ciclo debe ser 1, 2 o 3.' });
    }

    const apertura = new Date(fechaApertura);
    const cierre = new Date(fechaCierre);
    if (Number.isNaN(apertura.getTime()) || Number.isNaN(cierre.getTime())) {
      return res.status(400).json({ success: false, message: 'Fechas invalidas.' });
    }
    if (cierre <= apertura) {
      return res.status(400).json({ success: false, message: 'La fecha de cierre debe ser posterior a la apertura.' });
    }

    // Dynamic Academic Year validation
    const anioActual = new Date().getFullYear();
    if (apertura.getFullYear() < anioActual - 1 || apertura.getFullYear() > anioActual + 2 ||
        cierre.getFullYear() < anioActual - 1 || cierre.getFullYear() > anioActual + 2) {
      return res.status(400).json({
        success: false,
        message: `El año de las fechas debe estar en un rango académico válido (${anioActual - 1} - ${anioActual + 2}).`
      });
    }

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
    }

    const codigoGenerado = await generarCodigoTarea(docente.id, tipoPractica, Number(numeroCiclo));

    // Handle template file
    let templatePath = null;
    let templateName = null;
    let templateMime = null;
    if (req.file) {
      templatePath = req.file.path;
      templateName = req.file.originalname;
      templateMime = req.file.mimetype;
    }

    const tarea = await Tarea.create({
      docenteId: docente.id,
      tipoPractica,
      numeroCiclo: Number(numeroCiclo),
      codigo: codigoGenerado,
      titulo: titulo.trim(),
      descripcion: descripcion || null,
      puntajeMaximo: puntajeMaximo ? (Math.round(Number(puntajeMaximo) * 100) / 100) : 10.0,
      fechaApertura: apertura,
      fechaCierre: cierre,
      activa: true,
      templatePath,
      templateName,
      templateMime,
    });

    return res.status(201).json({ success: true, message: 'Tarea creada exitosamente.', data: tarea });
  } catch (error) {
    console.error('Error en crearTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la tarea.', error: error.message });
  }
};

const listarTareas = async (req, res) => {
  try {
    const { ciclo, tipo } = req.query;

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
    }

    const checkTipo = tipo || (docente.tipoTutor === 'comunales' ? 'comunitaria' : 'laboral');

    // Auto-create standard tasks for Ciclo 1 if they don't exist
    const defaultTasks = ['Anexo A', 'Anexo B', 'Anexo C', 'Anexo D'];
    for (const title of defaultTasks) {
      const existe = await Tarea.findOne({
        where: {
          docenteId: docente.id,
          tipoPractica: checkTipo,
          numeroCiclo: 1,
          titulo: title,
        },
      });

      if (!existe) {
        const codigoGenerado = await generarCodigoTarea(docente.id, checkTipo, 1);
        const now = new Date();
        const unMesDespues = new Date();
        unMesDespues.setDate(now.getDate() + 30);

        await Tarea.create({
          docenteId: docente.id,
          tipoPractica: checkTipo,
          numeroCiclo: 1,
          codigo: codigoGenerado,
          titulo: title,
          descripcion: `Formato oficial obligatorio: ${title}. Favor descargar, completar, firmar y subir el documento en formato PDF.`,
          puntajeMaximo: 10.0,
          fechaApertura: now,
          fechaCierre: unMesDespues,
          activa: true,
        });
      }
    }

    // Auto-create standard tasks for Ciclo 2 if they don't exist
    const defaultTasksCiclo2 = ['Anexo B', 'Anexo C', 'Anexo D', 'Anexo E', 'Anexo F', 'Consolidado Final'];
    for (const title of defaultTasksCiclo2) {
      const existe = await Tarea.findOne({
        where: {
          docenteId: docente.id,
          tipoPractica: checkTipo,
          numeroCiclo: 2,
          titulo: title,
        },
      });

      if (!existe) {
        const codigoGenerado = await generarCodigoTarea(docente.id, checkTipo, 2);
        const now = new Date();
        const unMesDespues = new Date();
        unMesDespues.setDate(now.getDate() + 30);

        await Tarea.create({
          docenteId: docente.id,
          tipoPractica: checkTipo,
          numeroCiclo: 2,
          codigo: codigoGenerado,
          titulo: title,
          descripcion: `Formato oficial obligatorio: ${title}. Favor descargar, completar, firmar y subir el documento en formato PDF.`,
          puntajeMaximo: 10.0,
          fechaApertura: now,
          fechaCierre: unMesDespues,
          activa: true,
        });
      }
    }

    // Auto-create standard tasks for Supletorio (Ciclo 3) if they don't exist
    const existeSup = await Tarea.findOne({
      where: {
        docenteId: docente.id,
        tipoPractica: checkTipo,
        numeroCiclo: 3,
        titulo: 'Entregable de Supletorio',
      },
    });

    if (!existeSup) {
      const now = new Date();
      const unMesDespues = new Date();
      unMesDespues.setDate(now.getDate() + 30);

      await Tarea.create({
        docenteId: docente.id,
        tipoPractica: checkTipo,
        numeroCiclo: 3,
        codigo: `SUP-${checkTipo === 'comunitaria' ? 'COM' : 'LAB'}-01`,
        titulo: 'Entregable de Supletorio',
        descripcion: 'Formato obligatorio para estudiantes en supletorio. Sube aquí tu archivo firmado de evaluación.',
        puntajeMaximo: 10.0,
        fechaApertura: now,
        fechaCierre: unMesDespues,
        activa: true,
      });
    }

    const where = { docenteId: docente.id };
    if (ciclo) where.numeroCiclo = Number(ciclo);
    if (tipo) where.tipoPractica = tipo;

    const tareas = await Tarea.findAll({
      where,
      include: [
        {
          model: Entrega,
          as: 'entregas',
          attributes: ['id', 'nota', 'estado', 'fechaEntrega', 'fechaCalificacion'],
        },
      ],
      order: [['numeroCiclo', 'ASC'], ['fechaCierre', 'ASC'], ['codigo', 'ASC']],
    });

    const acumuladoCiclos = {
      1: { sum: 0, count: 0 },
      2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 },
    };

    const tareasConStats = tareas.map((t) => {
      const entregas = t.entregas || [];
      const calificadas = entregas.filter((e) => e.estado === 'calificada' && e.nota !== null && e.nota !== undefined);
      const pendientes = entregas.filter((e) => e.estado === 'pendiente' || e.estado === 'tarde');

      const promedioGeneral =
        calificadas.length > 0
          ? Math.round(
              (calificadas.reduce((acc, e) => acc + parseFloat(e.nota), 0) / calificadas.length) * 100
            ) / 100
          : null;

      if (promedioGeneral !== null) {
        acumuladoCiclos[t.numeroCiclo].sum += promedioGeneral;
        acumuladoCiclos[t.numeroCiclo].count += 1;
      }

      return {
        ...t.toJSON(),
        estadoVentana: calcularEstadoVentana(t),
        totalEntregas: entregas.length,
        entregasCalificadas: calificadas.length,
        entregasPendientes: pendientes.length,
        promedioGeneral,
      };
    });

    const resumenCiclos = CICLOS_FIJOS.map((numeroCiclo) => {
      const c = acumuladoCiclos[numeroCiclo];
      return {
        numeroCiclo,
        promedio:
          c.count > 0 ? Math.round((c.sum / c.count) * 100) / 100 : null,
      };
    });

    return res.json({ success: true, data: tareasConStats, resumenCiclos });
  } catch (error) {
    console.error('Error en listarTareas:', error);
    return res.status(500).json({ success: false, message: 'Error al listar las tareas.', error: error.message });
  }
};

const editarTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { titulo, descripcion, puntajeMaximo, fechaApertura, fechaCierre, activa } = req.body;

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const tarea = await Tarea.findOne({ where: { id: tareaId, docenteId: docente.id } });
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada o no autorizada.' });

    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo.trim();
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (puntajeMaximo !== undefined) {
      const pMax = Number(puntajeMaximo);
      if (Number.isNaN(pMax) || pMax < 0 || pMax > 10) {
        return res.status(400).json({ success: false, message: 'El puntaje máximo debe estar entre 0.00 y 10.00.' });
      }
      updates.puntajeMaximo = Math.round(pMax * 100) / 100;
    }
    if (activa !== undefined) updates.activa = Boolean(activa);

    if (req.body.codigo !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'El codigo de la tarea se genera automaticamente y no puede editarse.',
      });
    }

    const apertura = fechaApertura !== undefined ? new Date(fechaApertura) : new Date(tarea.fechaApertura);
    const cierre = fechaCierre !== undefined ? new Date(fechaCierre) : new Date(tarea.fechaCierre);
    if (cierre <= apertura) {
      return res.status(400).json({ success: false, message: 'La fecha de cierre debe ser posterior a la apertura.' });
    }

    // Dynamic Academic Year validation
    const anioActual = new Date().getFullYear();
    if (apertura.getFullYear() < anioActual - 1 || apertura.getFullYear() > anioActual + 2 ||
        cierre.getFullYear() < anioActual - 1 || cierre.getFullYear() > anioActual + 2) {
      return res.status(400).json({
        success: false,
        message: `El año de las fechas debe estar en un rango académico válido (${anioActual - 1} - ${anioActual + 2}).`
      });
    }

    if (fechaApertura !== undefined) updates.fechaApertura = apertura;
    if (fechaCierre !== undefined) updates.fechaCierre = cierre;

    // Handle template file updates
    if (req.file) {
      // Delete old file if exists
      if (tarea.templatePath) {
        try {
          if (fs.existsSync(tarea.templatePath)) {
            fs.unlinkSync(tarea.templatePath);
          }
        } catch (err) {
          console.error('Error al borrar plantilla antigua:', err);
        }
      }
      updates.templatePath = req.file.path;
      updates.templateName = req.file.originalname;
      updates.templateMime = req.file.mimetype;
    } else if (req.body.eliminarPlantilla === 'true') {
      if (tarea.templatePath) {
        try {
          if (fs.existsSync(tarea.templatePath)) {
            fs.unlinkSync(tarea.templatePath);
          }
        } catch (err) {
          console.error('Error al borrar plantilla:', err);
        }
      }
      updates.templatePath = null;
      updates.templateName = null;
      updates.templateMime = null;
    }

    await tarea.update(updates);

    return res.json({ success: true, message: 'Tarea actualizada.', data: tarea });
  } catch (error) {
    console.error('Error en editarTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al editar la tarea.', error: error.message });
  }
};

const eliminarTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const tarea = await Tarea.findOne({
      where: { id: tareaId, docenteId: docente.id },
      include: [{ model: Entrega, as: 'entregas' }],
    });

    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });

    const tieneCalificadas = (tarea.entregas || []).some((e) => e.estado === 'calificada');
    if (tieneCalificadas) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una tarea que ya tiene entregas calificadas.',
      });
    }

    if (tarea.templatePath) {
      try {
        if (fs.existsSync(tarea.templatePath)) {
          fs.unlinkSync(tarea.templatePath);
        }
      } catch (err) {
        console.error('Error al borrar plantilla de tarea eliminada:', err);
      }
    }

    await tarea.destroy();
    return res.json({ success: true, message: 'Tarea eliminada exitosamente.' });
  } catch (error) {
    console.error('Error en eliminarTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la tarea.', error: error.message });
  }
};

const verEntregasDeTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const tarea = await Tarea.findOne({ where: { id: tareaId, docenteId: docente.id } });
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });

    const entregas = await Entrega.findAll({
      where: { tareaId },
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          where: { tutorId: docente.id, activa: true },
          include: [
            {
              model: Estudiante,
              as: 'estudiante',
              include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email'] }],
            },
          ],
        },
      ],
      order: [['fechaEntrega', 'DESC']],
    });

    const cierre = new Date(tarea.fechaCierre);
    const { obtenerNotaFinalDesdeCiclos } = require('../utils/ciclos');

    const entregasConEstadoTiempo = [];
    for (const e of entregas) {
      const json = e.toJSON();
      const { ciclos: ciclosDb, notaFinal } = await obtenerNotaFinalDesdeCiclos(e.inscripcionId);
      const c1 = ciclosDb.find(c => c.numeroCiclo === 1)?.promedioCiclo ?? null;
      const c2 = ciclosDb.find(c => c.numeroCiclo === 2)?.promedioCiclo ?? null;
      const c3 = ciclosDb.find(c => c.numeroCiclo === 3)?.promedioCiclo ?? null;

      entregasConEstadoTiempo.push({
        ...json,
        estadoTiempo: new Date(e.fechaEntrega) <= cierre ? 'a_tiempo' : 'tarde',
        promedios: { c1, c2, c3, notaFinal },
      });
    }

    const inscripciones = await Inscripcion.findAll({
      where: {
        tutorId: docente.id,
        activa: true,
        tipoPractica: tarea.tipoPractica,
      },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email'] }],
        },
      ],
    });

    const idsConEntrega = entregas.map((e) => e.inscripcionId);
    const sinEntregar = inscripciones.filter((i) => !idsConEntrega.includes(i.id));

    const sinEntregarConPromedios = [];
    for (const i of sinEntregar) {
      const { ciclos: ciclosDb, notaFinal } = await obtenerNotaFinalDesdeCiclos(i.id);
      const c1 = ciclosDb.find(c => c.numeroCiclo === 1)?.promedioCiclo ?? null;
      const c2 = ciclosDb.find(c => c.numeroCiclo === 2)?.promedioCiclo ?? null;
      const c3 = ciclosDb.find(c => c.numeroCiclo === 3)?.promedioCiclo ?? null;

      sinEntregarConPromedios.push({
        ...i.toJSON(),
        promedios: { c1, c2, c3, notaFinal },
      });
    }

    return res.json({
      success: true,
      data: {
        tarea: {
          ...tarea.toJSON(),
          estadoVentana: calcularEstadoVentana(tarea),
        },
        entregas: entregasConEstadoTiempo,
        sinEntregar: sinEntregarConPromedios,
      },
    });
  } catch (error) {
    console.error('Error en verEntregasDeTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener las entregas.', error: error.message });
  }
};

const calificarEntrega = async (req, res) => {
  try {
    const { entregaId } = req.params;
    const { nota, comentario } = req.body;

    const notaNum = Number(nota);
    if (nota === undefined || nota === null || Number.isNaN(notaNum)) {
      return res.status(400).json({ success: false, message: 'La nota es requerida y debe ser un valor numérico válido.' });
    }

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const entrega = await Entrega.findByPk(entregaId, {
      include: [
        { model: Tarea, as: 'tarea', where: { docenteId: docente.id } },
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [{ model: Estudiante, as: 'estudiante' }],
        },
      ],
    });

    if (!entrega) return res.status(404).json({ success: false, message: 'Entrega no encontrada o no autorizada.' });

    // Strict active assignment check
    if (!entrega.inscripcion || entrega.inscripcion.tutorId !== docente.id || !entrega.inscripcion.activa) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Este estudiante no está asignado bajo tu tutoría activa.',
      });
    }

    const notaFinal = Math.round(notaNum * 100) / 100;
    const max = parseFloat(entrega.tarea.puntajeMaximo);
    if (notaFinal < 0 || notaFinal > max) {
      return res.status(400).json({ success: false, message: `La nota debe estar entre 0.00 y ${max.toFixed(2)}.` });
    }

    const isAnexoB = entrega.tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.body;

    if (isAnexoB && !['interno', 'externo'].includes(subTarea)) {
      return res.status(400).json({
        success: false,
        message: 'Para el Anexo B, debes especificar si estás calificando el Tutor Interno o Externo.',
      });
    }

    const updates = {};

    if (isAnexoB) {
      if (subTarea === 'interno') {
        updates.notaInterno = notaFinal;
        updates.comentarioInterno = comentario || null;
      } else {
        updates.notaExterno = notaFinal;
        updates.comentarioExterno = comentario || null;
      }

      const currentNotaInterno = subTarea === 'interno' ? notaFinal : (entrega.notaInterno !== null ? parseFloat(entrega.notaInterno) : null);
      const currentNotaExterno = subTarea === 'externo' ? notaFinal : (entrega.notaExterno !== null ? parseFloat(entrega.notaExterno) : null);

      if (currentNotaInterno !== null && currentNotaExterno !== null) {
        const promRaw = (currentNotaInterno + currentNotaExterno) / 2;
        updates.nota = Math.round((promRaw + Number.EPSILON) * 100) / 100;
        updates.estado = 'calificada';
        updates.fechaCalificacion = new Date();
        updates.comentarioDocente = `Calificación promediada de Tutor Interno (${currentNotaInterno}) y Tutor Externo (${currentNotaExterno}).`;
      } else {
        updates.nota = null;
        updates.estado = 'pendiente';
      }
    } else {
      updates.nota = notaFinal;
      updates.comentarioDocente = comentario || null;
      updates.estado = 'calificada';
      updates.fechaCalificacion = new Date();
    }

    let logHistorial = [];
    try {
      if (entrega.historial) {
        logHistorial = JSON.parse(entrega.historial);
      }
    } catch (err) {
      logHistorial = [];
    }

    logHistorial.push({
      fecha: new Date(),
      accion: isAnexoB 
        ? `Calificación de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'} por Docente`
        : 'Calificación por Docente',
      nota: notaFinal,
      comentario: comentario || null,
    });

    updates.historial = JSON.stringify(logHistorial);

    await entrega.update(updates);

    const estudiante = entrega.inscripcion.estudiante;
    if (estudiante) {
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: 'Tarea calificada',
        mensaje: `Tu entrega de "${entrega.tarea.titulo}" fue calificada con ${notaFinal}/${max}.${comentario ? ` Comentario: ${comentario}` : ''}`,
        tipo: 'documento_revisado',
      });
    }

    const ciclosActualizados = await recalcularPromediosCiclos({
      inscripcionId: entrega.inscripcionId,
      docenteId: entrega.tarea.docenteId,
      tipoPractica: entrega.tarea.tipoPractica,
    });

    const { notaFinal: notaFinalCalculada } = await obtenerNotaFinalDesdeCiclos(entrega.inscripcionId);

    return res.json({
      success: true,
      message: `Entrega calificada con ${notaFinal}/${max}.`,
      data: entrega,
      resumen: {
        ciclos: ciclosActualizados,
        notaFinal: notaFinalCalculada,
      },
    });
  } catch (error) {
    console.error('Error en calificarEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al calificar la entrega.', error: error.message });
  }
};

const previewEntrega = async (req, res) => {
  try {
    const { entregaId } = req.params;

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const entrega = await Entrega.findByPk(entregaId, {
      include: [
        { model: Tarea, as: 'tarea', where: { docenteId: docente.id } },
        { model: Inscripcion, as: 'inscripcion' },
      ],
    });

    if (!entrega) return res.status(404).json({ success: false, message: 'Entrega no encontrada o no autorizada.' });

    // Validar asignación de tutor activa
    if (!entrega.inscripcion || entrega.inscripcion.tutorId !== docente.id || !entrega.inscripcion.activa) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Este estudiante no está asignado bajo tu tutoría activa.',
      });
    }

    const isAnexoB = entrega.tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.query;

    let targetPath = entrega.rutaArchivo;
    let targetName = entrega.nombreArchivo;

    if (isAnexoB && subTarea === 'interno') {
      targetPath = entrega.rutaArchivoInterno;
      targetName = entrega.nombreArchivoInterno;
    } else if (isAnexoB && subTarea === 'externo') {
      targetPath = entrega.rutaArchivoExterno;
      targetName = entrega.nombreArchivoExterno;
    }

    if (!targetPath) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible para esta sub-tarea.' });
    }

    const filePath = path.resolve(targetPath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });

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
    console.error('Error en previewEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al previsualizar el archivo.', error: error.message });
  }
};

const descargarEntrega = async (req, res) => {
  try {
    const { entregaId } = req.params;

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const entrega = await Entrega.findByPk(entregaId, {
      include: [
        { model: Tarea, as: 'tarea', where: { docenteId: docente.id } },
        { model: Inscripcion, as: 'inscripcion' },
      ],
    });

    if (!entrega) return res.status(404).json({ success: false, message: 'Entrega no encontrada.' });

    // Validar asignación de tutor activa
    if (!entrega.inscripcion || entrega.inscripcion.tutorId !== docente.id || !entrega.inscripcion.activa) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Este estudiante no está asignado bajo tu tutoría activa.',
      });
    }

    const isAnexoB = entrega.tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.query;

    let targetPath = entrega.rutaArchivo;
    let targetName = entrega.nombreArchivo;

    if (isAnexoB && subTarea === 'interno') {
      targetPath = entrega.rutaArchivoInterno;
      targetName = entrega.nombreArchivoInterno;
    } else if (isAnexoB && subTarea === 'externo') {
      targetPath = entrega.rutaArchivoExterno;
      targetName = entrega.nombreArchivoExterno;
    }

    if (!targetPath) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible para esta sub-tarea.' });
    }

    const filePath = path.resolve(targetPath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });

    return res.download(filePath, targetName);
  } catch (error) {
    console.error('Error en descargarEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar el archivo.', error: error.message });
  }
};

const libroCalificaciones = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const inscripcion = await Inscripcion.findOne({
      where: { tutorId: docente.id, activa: true },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          where: { id: estudianteId },
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email'] }],
        },
        { model: Convenio, as: 'convenio', attributes: ['id', 'nombreEmpresa', 'area'] },
      ],
    });

    if (!inscripcion) {
      return res.status(403).json({ success: false, message: 'Estudiante no encontrado o no asignado a su tutoria.' });
    }

    const tareas = await Tarea.findAll({
      where: {
        docenteId: docente.id,
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

    const resumenCiclosDb = await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: docente.id,
      tipoPractica: inscripcion.tipoPractica,
    });

    const { ciclos: ciclosDb, notaFinal } = await obtenerNotaFinalDesdeCiclos(inscripcion.id);
    const promMap = new Map(ciclosDb.map((c) => [c.numeroCiclo, c.promedioCiclo === null ? null : parseFloat(c.promedioCiclo)]));

    const c1Prom = promMap.get(1) ?? null;
    const c2Prom = promMap.get(2) ?? null;
    const promBase = (c1Prom !== null && c2Prom !== null) ? Math.round(((c1Prom + c2Prom) / 2 + Number.EPSILON) * 100) / 100 : null;

    const visibleCiclos = (promBase !== null && promBase < 7.00) ? [1, 2, 3] : [1, 2];

    const ciclos = visibleCiclos.map((num) => {
      const tareasCiclo = tareas.filter((t) => t.numeroCiclo === num);

      const tareasDetalle = tareasCiclo.map((t) => {
        const entrega = t.entregas && t.entregas.length > 0 ? t.entregas[0] : null;
        const nota = entrega && entrega.nota !== null ? parseFloat(entrega.nota) : null;

        return {
          id: t.id,
          codigo: t.codigo,
          titulo: t.titulo,
          puntajeMaximo: parseFloat(t.puntajeMaximo),
          fechaApertura: t.fechaApertura,
          fechaCierre: t.fechaCierre,
          entrega: entrega
            ? {
                id: entrega.id,
                nota,
                estado: entrega.estado,
                comentarioDocente: entrega.comentarioDocente,
                fechaEntrega: entrega.fechaEntrega,
                fechaCalificacion: entrega.fechaCalificacion,
                nombreArchivo: entrega.nombreArchivo,
              }
            : null,
        };
      });

      return {
        numeroCiclo: num,
        totalTareas: tareasCiclo.length,
        tareasCalificadas: tareasDetalle.filter((t) => t.entrega && t.entrega.nota !== null).length,
        promedio: promMap.get(num) ?? null,
        tareas: tareasDetalle,
      };
    });

    // notaFinal already obtained above

    return res.json({
      success: true,
      data: {
        estudiante: inscripcion.estudiante,
        convenio: inscripcion.convenio,
        tipoPractica: inscripcion.tipoPractica,
        ciclos,
        notaFinal,
      },
    });
  } catch (error) {
    console.error('Error en libroCalificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el libro de calificaciones.', error: error.message });
  }
};

const entregasPendientesRecientes = async (req, res) => {
  try {
    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const limit = req.query.limit ? Math.max(1, Math.min(500, Number(req.query.limit))) : 100;

    const entregas = await Entrega.findAll({
      where: { estado: { [Op.in]: ['pendiente', 'tarde'] } },
      include: [
        {
          model: Tarea,
          as: 'tarea',
          where: { docenteId: docente.id },
          attributes: ['id', 'codigo', 'titulo', 'fechaCierre'],
        },
        {
          model: Inscripcion,
          as: 'inscripcion',
          where: { tutorId: docente.id, activa: true }, // Ensure tutor assignment is active
          attributes: ['id'],
          include: [
            {
              model: Estudiante,
              as: 'estudiante',
              attributes: ['id', 'nombres'],
              include: [{ model: Usuario, as: 'usuario', attributes: ['email'] }],
            },
          ],
        },
      ],
      order: [['fechaEntrega', 'DESC']],
      limit,
    });

    return res.json({ success: true, data: entregas });
  } catch (error) {
    console.error('Error en entregasPendientesRecientes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener entregas pendientes.', error: error.message });
  }
};

const entregarTareaPorDocente = async (req, res) => {
  try {
    const { tareaId, inscripcionId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Debes subir un archivo.' });
    }

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
    }

    const tarea = await Tarea.findOne({ where: { id: tareaId, docenteId: docente.id } });
    if (!tarea) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada o no autorizada.' });
    }

    const inscripcion = await Inscripcion.findOne({
      where: { id: inscripcionId, tutorId: docente.id, activa: true },
    });
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción del estudiante no encontrada o no autorizada.' });
    }

    const now = new Date();
    const isAnexoF = tarea.titulo.toLowerCase().includes('anexo f');

    if (isAnexoF) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.xls' && ext !== '.xlsx') {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error unlinking invalid file:', err);
        }
        return res.status(400).json({
          success: false,
          message: 'Para el Anexo F, el archivo debe ser obligatoriamente un formato de Excel (.xls, .xlsx).',
        });
      }
    }

    const [entrega, creado] = await Entrega.findOrCreate({
      where: { tareaId: tarea.id, inscripcionId: inscripcion.id },
      defaults: {
        estado: isAnexoF ? 'calificada' : 'pendiente',
        fechaEntrega: now,
        fechaCalificacion: isAnexoF ? now : null,
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.path,
        nota: null,
      },
    });

    if (!creado) {
      if (entrega.estado === 'calificada' && !isAnexoF) {
        return res.status(400).json({ success: false, message: 'Esta tarea ya fue calificada y no puede reemplazarse.' });
      }
      const updateData = {
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.path,
        fechaEntrega: now,
        estado: isAnexoF ? 'calificada' : 'pendiente',
      };
      if (isAnexoF) {
        updateData.fechaCalificacion = now;
        updateData.nota = null;
      }
      await entrega.update(updateData);
    }

    if (isAnexoF) {
      const { recalcularPromediosCiclos } = require('../utils/ciclos');
      await recalcularPromediosCiclos({
        inscripcionId: inscripcion.id,
        docenteId: docente.id,
        tipoPractica: inscripcion.tipoPractica,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Archivo cargado correctamente por el docente.',
      data: entrega,
    });
  } catch (error) {
    console.error('Error en entregarTareaPorDocente:', error);
    return res.status(500).json({ success: false, message: 'Error al subir el archivo.', error: error.message });
  }
};

const calificarSinEntrega = async (req, res) => {
  try {
    const { tareaId, inscripcionId } = req.params;
    const { nota, comentario } = req.body;

    const notaNum = Number(nota);
    if (nota === undefined || nota === null || Number.isNaN(notaNum)) {
      return res.status(400).json({ success: false, message: 'La nota es requerida y debe ser un valor numérico válido.' });
    }

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const tarea = await Tarea.findOne({ where: { id: tareaId, docenteId: docente.id } });
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada o no autorizada.' });

    const inscripcion = await Inscripcion.findOne({ where: { id: inscripcionId, tutorId: docente.id } });
    if (!inscripcion) return res.status(404).json({ success: false, message: 'Inscripcion del estudiante no encontrada o no asignada a su tutoria.' });

    // Strict active assignment check
    if (!inscripcion.activa) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Este estudiante no tiene una tutoría activa actualmente.',
      });
    }

    const notaFinal = Math.round(notaNum * 100) / 100;
    const max = parseFloat(tarea.puntajeMaximo);
    if (notaFinal < 0 || notaFinal > max) {
      return res.status(400).json({ success: false, message: `La nota debe estar entre 0.00 y ${max.toFixed(2)}.` });
    }

    const isAnexoB = tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.body;

    if (isAnexoB && !['interno', 'externo'].includes(subTarea)) {
      return res.status(400).json({
        success: false,
        message: 'Para el Anexo B, debes especificar si estas calificando el Tutor Interno o Externo.',
      });
    }

    const firstLog = [{
      fecha: new Date(),
      accion: isAnexoB 
        ? `Calificación sin entrega de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'} por Docente`
        : 'Calificación sin entrega por Docente',
      nota: notaFinal,
      comentario: comentario || 'Calificado sin entrega.',
    }];

    const [entrega, creado] = await Entrega.findOrCreate({
      where: { tareaId, inscripcionId },
      defaults: {
        estado: isAnexoB ? 'pendiente' : 'calificada',
        fechaEntrega: new Date(),
        fechaCalificacion: isAnexoB ? null : new Date(),
        nota: isAnexoB ? null : notaFinal,
        comentarioDocente: isAnexoB ? null : (comentario || 'Calificado sin entrega.'),
        notaInterno: isAnexoB && subTarea === 'interno' ? notaFinal : null,
        comentarioInterno: isAnexoB && subTarea === 'interno' ? (comentario || null) : null,
        notaExterno: isAnexoB && subTarea === 'externo' ? notaFinal : null,
        comentarioExterno: isAnexoB && subTarea === 'externo' ? (comentario || null) : null,
        historial: JSON.stringify(firstLog),
      },
    });

    if (!creado) {
      const updates = {};
      if (isAnexoB) {
        if (subTarea === 'interno') {
          updates.notaInterno = notaFinal;
          updates.comentarioInterno = comentario || null;
        } else {
          updates.notaExterno = notaFinal;
          updates.comentarioExterno = comentario || null;
        }

        const currentNotaInterno = subTarea === 'interno' ? notaFinal : (entrega.notaInterno !== null ? parseFloat(entrega.notaInterno) : null);
        const currentNotaExterno = subTarea === 'externo' ? notaFinal : (entrega.notaExterno !== null ? parseFloat(entrega.notaExterno) : null);

        if (currentNotaInterno !== null && currentNotaExterno !== null) {
          const promRaw = (currentNotaInterno + currentNotaExterno) / 2;
          updates.nota = Math.round((promRaw + Number.EPSILON) * 100) / 100;
          updates.estado = 'calificada';
          updates.fechaCalificacion = new Date();
          updates.comentarioDocente = `Calificación promediada de Tutor Interno (${currentNotaInterno}) y Tutor Externo (${currentNotaExterno}).`;
        }
      } else {
        updates.nota = notaFinal;
        updates.comentarioDocente = comentario || 'Calificado sin entrega.';
        updates.estado = 'calificada';
        updates.fechaCalificacion = new Date();
      }

      let logHistorial = [];
      try {
        if (entrega.historial) {
          logHistorial = JSON.parse(entrega.historial);
        }
      } catch (err) {
        logHistorial = [];
      }

      logHistorial.push({
        fecha: new Date(),
        accion: isAnexoB 
          ? `Calificación sin entrega de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'} por Docente`
          : 'Calificación sin entrega por Docente',
        nota: notaFinal,
        comentario: comentario || 'Calificado sin entrega.',
      });

      updates.historial = JSON.stringify(logHistorial);

      await entrega.update(updates);
    }

    await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: docente.id,
      tipoPractica: inscripcion.tipoPractica,
    });

    return res.json({
      success: true,
      message: 'Estudiante calificado correctamente sin entrega.',
      data: entrega,
    });
  } catch (error) {
    console.error('Error en calificarSinEntrega:', error);
    return res.status(500).json({ success: false, message: 'Error al calificar al estudiante.', error: error.message });
  }
};

const descargarPlantillaTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });

    const tarea = await Tarea.findOne({ where: { id: tareaId, docenteId: docente.id } });
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });

    if (!tarea.templatePath) {
      return res.status(404).json({ success: false, message: 'Archivo de plantilla no disponible para esta tarea.' });
    }

    const filePath = path.resolve(tarea.templatePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Archivo de plantilla no encontrado.' });

    return res.download(filePath, tarea.templateName);
  } catch (error) {
    console.error('Error en descargarPlantillaTarea:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar la plantilla.', error: error.message });
  }
};

module.exports = {
  crearTarea,
  listarTareas,
  editarTarea,
  eliminarTarea,
  verEntregasDeTarea,
  calificarEntrega,
  previewEntrega,
  descargarEntrega,
  libroCalificaciones,
  entregasPendientesRecientes,
  entregarTareaPorDocente,
  calificarSinEntrega,
  descargarPlantillaTarea,
};

