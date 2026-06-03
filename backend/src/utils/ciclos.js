const { Op } = require('sequelize');
const { Ciclo, Tarea, Entrega, Inscripcion } = require('../models');

const CICLOS_FIJOS = [1, 2, 3];

const ensureCiclosParaInscripcion = async (inscripcionId) => {
  for (const numeroCiclo of CICLOS_FIJOS) {
    await Ciclo.findOrCreate({
      where: { inscripcionId, numeroCiclo },
      defaults: { promedioCiclo: null },
    });
  }
};

const recalcularPromediosCiclos = async ({ inscripcionId, docenteId, tipoPractica }) => {
  await ensureCiclosParaInscripcion(inscripcionId);

  const resultado = [];
  let c1Prom = null;
  let c2Prom = null;

  for (const numeroCiclo of CICLOS_FIJOS) {
    const tareasCicloDb = await Tarea.findAll({
      where: {
        docenteId,
        tipoPractica,
        numeroCiclo,
      },
      attributes: ['id', 'titulo'],
    });

    const tareasCiclo = tareasCicloDb.filter(t => !t.titulo.toLowerCase().includes('anexo f'));
    const tareaIds = tareasCiclo.map((t) => t.id);

    let promedio = null;
    if (tareaIds.length > 0) {
      const entregasCalificadas = await Entrega.findAll({
        where: {
          inscripcionId,
          tareaId: { [Op.in]: tareaIds },
          estado: 'calificada',
          nota: { [Op.not]: null },
        },
        attributes: ['nota'],
      });

      // Solo se calcula y guarda el promedio del ciclo si TODAS las tareas creadas en el ciclo ya fueron calificadas
      if (entregasCalificadas.length === tareaIds.length) {
        const sum = entregasCalificadas.reduce((acc, e) => acc + parseFloat(e.nota), 0);
        const promRaw = sum / entregasCalificadas.length;
        promedio = Math.round((promRaw + Number.EPSILON) * 100) / 100;
      }
    }

    if (numeroCiclo === 1) c1Prom = promedio;
    if (numeroCiclo === 2) c2Prom = promedio;

    // Si es ciclo 3 (Supletorios) y ya tiene nota calificada
    if (numeroCiclo === 3 && promedio !== null) {
      // Recuperar promedios de C1/C2 desde la BD si no se calcularon en este ciclo (e.g. por filtros)
      if (c1Prom === null || c2Prom === null) {
        const c1Db = await Ciclo.findOne({ where: { inscripcionId, numeroCiclo: 1 } });
        const c2Db = await Ciclo.findOne({ where: { inscripcionId, numeroCiclo: 2 } });
        c1Prom = c1Db && c1Db.promedioCiclo !== null ? parseFloat(c1Db.promedioCiclo) : null;
        c2Prom = c2Db && c2Db.promedioCiclo !== null ? parseFloat(c2Db.promedioCiclo) : null;
      }

      if (c1Prom !== null && c2Prom !== null) {
        const promBase = Math.round(((c1Prom + c2Prom) / 2 + Number.EPSILON) * 100) / 100;
        // La nota del supletorio es el promedio del promedio de los 2 ciclos (Nota Base) y el entregable del supletorio
        promedio = Math.round(((promBase + promedio) / 2 + Number.EPSILON) * 100) / 100;
      }
    }

    await Ciclo.update(
      { promedioCiclo: promedio },
      { where: { inscripcionId, numeroCiclo } }
    );

    resultado.push({
      numeroCiclo,
      promedioCiclo: promedio,
      totalTareas: tareaIds.length,
    });
  }

  return resultado;
};

const obtenerNotaFinalDesdeCiclos = async (inscripcionId) => {
  await ensureCiclosParaInscripcion(inscripcionId);

  // Recalcular proactivamente para evitar usar datos obsoletos de la tabla ciclos
  const inscripcion = await Inscripcion.findByPk(inscripcionId);
  if (inscripcion && inscripcion.tutorId) {
    await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: inscripcion.tutorId,
      tipoPractica: inscripcion.tipoPractica,
    });
  }

  const ciclos = await Ciclo.findAll({
    where: { inscripcionId },
    order: [['numeroCiclo', 'ASC']],
  });

  const c1 = ciclos.find((c) => c.numeroCiclo === 1);
  const c2 = ciclos.find((c) => c.numeroCiclo === 2);
  const c3 = ciclos.find((c) => c.numeroCiclo === 3);

  const c1Gradado = c1 && c1.promedioCiclo !== null && c1.promedioCiclo !== undefined;
  const c2Gradado = c2 && c2.promedioCiclo !== null && c2.promedioCiclo !== undefined;

  let notaFinal = null;

  if (c1Gradado && c2Gradado) {
    const promBaseRaw = (parseFloat(c1.promedioCiclo) + parseFloat(c2.promedioCiclo)) / 2;
    const promBase = Math.round((promBaseRaw + Number.EPSILON) * 100) / 100;

    if (promBase >= 7.00) {
      notaFinal = promBase;
    } else {
      // Habilitado para Supletorios (Ciclo 3)
      if (c3 && c3.promedioCiclo !== null && c3.promedioCiclo !== undefined) {
        // En recalcularPromediosCiclos ya guardamos el promedio del supletorio con la nota base!
        notaFinal = parseFloat(c3.promedioCiclo);
      }
    }
  }

  return { ciclos, notaFinal };
};

module.exports = {
  CICLOS_FIJOS,
  ensureCiclosParaInscripcion,
  recalcularPromediosCiclos,
  obtenerNotaFinalDesdeCiclos,
};
