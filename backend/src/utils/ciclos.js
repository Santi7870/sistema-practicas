const { Op } = require('sequelize');
const { Ciclo, Tarea, Entrega } = require('../models');

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

  for (const numeroCiclo of CICLOS_FIJOS) {
    const tareasCiclo = await Tarea.findAll({
      where: {
        docenteId,
        tipoPractica,
        numeroCiclo,
      },
      attributes: ['id'],
    });

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

      if (entregasCalificadas.length > 0) {
        const sum = entregasCalificadas.reduce((acc, e) => acc + parseFloat(e.nota), 0);
        promedio = Math.round((sum / entregasCalificadas.length) * 100) / 100;
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

  const ciclos = await Ciclo.findAll({
    where: { inscripcionId },
    order: [['numeroCiclo', 'ASC']],
  });

  const conNota = ciclos
    .map((c) => ({
      numeroCiclo: c.numeroCiclo,
      promedioCiclo:
        c.promedioCiclo === null || c.promedioCiclo === undefined
          ? null
          : parseFloat(c.promedioCiclo),
    }))
    .filter((c) => c.promedioCiclo !== null);

  const notaFinal =
    conNota.length > 0
      ? Math.round((conNota.reduce((acc, c) => acc + c.promedioCiclo, 0) / conNota.length) * 100) / 100
      : null;

  return { ciclos, notaFinal };
};

module.exports = {
  CICLOS_FIJOS,
  ensureCiclosParaInscripcion,
  recalcularPromediosCiclos,
  obtenerNotaFinalDesdeCiclos,
};
