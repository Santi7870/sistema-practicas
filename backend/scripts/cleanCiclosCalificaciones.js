const { sequelize, Ciclo, Entrega, Tarea } = require('../src/models');
require('dotenv').config();

async function cleanCiclosCalificaciones() {
  let transaction;
  try {
    await sequelize.authenticate();
    transaction = await sequelize.transaction();

    const totalEntregas = await Entrega.count({ transaction });
    const totalTareas = await Tarea.count({ transaction });
    const totalCiclos = await Ciclo.count({ transaction });

    await Entrega.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true, transaction });
    await Tarea.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true, transaction });
    await Ciclo.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true, transaction });

    await transaction.commit();

    console.log('Limpieza del módulo de calificaciones completada.');
    console.log(`Entregas eliminadas: ${totalEntregas}`);
    console.log(`Tareas eliminadas: ${totalTareas}`);
    console.log(`Ciclos eliminados: ${totalCiclos}`);
    process.exit(0);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en cleanCiclosCalificaciones:', error);
    process.exit(1);
  }
}

cleanCiclosCalificaciones();
