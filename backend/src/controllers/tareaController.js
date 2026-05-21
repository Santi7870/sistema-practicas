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

    const docente = await obtenerDocenteLogueado(req.usuario.id);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
    }

    const codigoGenerado = await generarCodigoTarea(docente.id, tipoPractica, Number(numeroCiclo));

    const tarea = await Tarea.create({
      docenteId: docente.id,
      tipoPractica,
      numeroCiclo: Number(numeroCiclo),
      codigo: codigoGenerado,
      titulo: titulo.trim(),
      descripcion: descripcion || null,
      puntajeMaximo: puntajeMaximo || 10.0,
      fechaApertura: apertura,
      fechaCierre: cierre,
      activa: true,
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
    if (puntajeMaximo !== undefined) updates.puntajeMaximo = puntajeMaximo;
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

    if (fechaApertura !== undefined) updates.fechaApertura = apertura;
    if (fechaCierre !== undefined) updates.fechaCierre = cierre;

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
    const entregasConEstadoTiempo = entregas.map((e) => {
      const json = e.toJSON();
      return {
        ...json,
        estadoTiempo: new Date(e.fechaEntrega) <= cierre ? 'a_tiempo' : 'tarde',
      };
    });

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

    return res.json({
      success: true,
      data: {
        tarea: {
          ...tarea.toJSON(),
          estadoVentana: calcularEstadoVentana(tarea),
        },
        entregas: entregasConEstadoTiempo,
        sinEntregar,
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

    if (nota === undefined || nota === null || Number.isNaN(parseFloat(nota))) {
      return res.status(400).json({ success: false, message: 'La nota es requerida y debe ser numerica.' });
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

    const notaNum = parseFloat(nota);
    const max = parseFloat(entrega.tarea.puntajeMaximo);
    if (notaNum < 0 || notaNum > max) {
      return res.status(400).json({ success: false, message: `La nota debe estar entre 0 y ${max}.` });
    }

    await entrega.update({
      nota: notaNum,
      comentarioDocente: comentario || null,
      estado: 'calificada',
      fechaCalificacion: new Date(),
    });

    const estudiante = entrega.inscripcion.estudiante;
    if (estudiante) {
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: 'Tarea calificada',
        mensaje: `Tu entrega de "${entrega.tarea.titulo}" fue calificada con ${notaNum}/${max}.${comentario ? ` Comentario: ${comentario}` : ''}`,
        tipo: 'documento_revisado',
      });
    }

    const ciclosActualizados = await recalcularPromediosCiclos({
      inscripcionId: entrega.inscripcionId,
      docenteId: entrega.tarea.docenteId,
      tipoPractica: entrega.tarea.tipoPractica,
    });

    const { notaFinal } = await obtenerNotaFinalDesdeCiclos(entrega.inscripcionId);

    return res.json({
      success: true,
      message: `Entrega calificada con ${notaNum}/${max}.`,
      data: entrega,
      resumen: {
        ciclos: ciclosActualizados,
        notaFinal,
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
      include: [{ model: Tarea, as: 'tarea', where: { docenteId: docente.id } }],
    });

    if (!entrega) return res.status(404).json({ success: false, message: 'Entrega no encontrada o no autorizada.' });

    const filePath = path.resolve(entrega.rutaArchivo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });

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
      include: [{ model: Tarea, as: 'tarea', where: { docenteId: docente.id } }],
    });

    if (!entrega) return res.status(404).json({ success: false, message: 'Entrega no encontrada.' });

    const filePath = path.resolve(entrega.rutaArchivo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });

    return res.download(filePath, entrega.nombreArchivo);
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

    const cicloPromMap = new Map(resumenCiclosDb.map((c) => [c.numeroCiclo, c.promedioCiclo]));

    const ciclos = CICLOS_FIJOS.map((num) => {
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
        promedio: cicloPromMap.get(num) ?? null,
        tareas: tareasDetalle,
      };
    });

    const { notaFinal } = await obtenerNotaFinalDesdeCiclos(inscripcion.id);

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

    const limit = req.query.limit ? Math.max(1, Math.min(50, Number(req.query.limit))) : 10;

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
};

