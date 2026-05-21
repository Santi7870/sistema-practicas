const fs = require('fs');
const path = require('path');
const { sequelize, Docente, Inscripcion, Tarea, Entrega } = require('../src/models');
const { recalcularPromediosCiclos } = require('../src/utils/ciclos');
require('dotenv').config();

const uploadDir = path.join(__dirname, '../uploads/ciclos');

const writeDummyPdf = (filename) => {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const full = path.join(uploadDir, filename);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(
      full,
      `%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
    );
  }
  return full;
};

const buildFechas = (ciclo) => {
  const now = new Date();
  const apertura = new Date(now);
  apertura.setDate(apertura.getDate() - (20 - ciclo * 4));
  const cierre = new Date(apertura);
  cierre.setDate(cierre.getDate() + 20);
  return { apertura, cierre };
};

async function seedCiclosCalificaciones() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('Conectado a DB');

    transaction = await sequelize.transaction();

    const inscripcionesActivas = await Inscripcion.findAll({
      where: { activa: true },
      order: [['id', 'ASC']],
      transaction,
    });

    if (!inscripcionesActivas.length) {
      throw new Error('No hay inscripciones activas para generar seed.');
    }

    const porTutor = new Map();
    for (const i of inscripcionesActivas) {
      if (!i.tutorId) continue;
      const key = `${i.tutorId}:${i.tipoPractica}`;
      if (!porTutor.has(key)) porTutor.set(key, []);
      porTutor.get(key).push(i);
    }

    for (const [key, grupo] of porTutor.entries()) {
      const [tutorId, tipoPractica] = key.split(':');
      const docenteId = Number(tutorId);

      for (let ciclo = 1; ciclo <= 3; ciclo += 1) {
        const { apertura, cierre } = buildFechas(ciclo);

        for (let n = 1; n <= 2; n += 1) {
          const codigo = `C${ciclo}-${tipoPractica.substring(0, 3).toUpperCase()}-${n.toString().padStart(2, '0')}`;
          let tarea = await Tarea.findOne({ where: { docenteId, codigo }, transaction });

          if (!tarea) {
            tarea = await Tarea.create(
              {
                docenteId,
                tipoPractica,
                numeroCiclo: ciclo,
                codigo,
                titulo: `Tarea ${n} Ciclo ${ciclo} (${tipoPractica})`,
                descripcion: `Actividad academica de prueba para ciclo ${ciclo}`,
                puntajeMaximo: 10,
                fechaApertura: apertura,
                fechaCierre: cierre,
                activa: true,
              },
              { transaction }
            );
            console.log(`Tarea creada: ${codigo}`);
          }

          const primera = grupo[0];
          const segunda = grupo[1];

          if (primera) {
            const nombre1 = `entrega-${primera.id}-${tarea.id}.pdf`;
            const ruta1 = writeDummyPdf(nombre1);
            let e1 = await Entrega.findOne({
              where: { tareaId: tarea.id, inscripcionId: primera.id },
              transaction,
            });
            if (!e1) {
              await Entrega.create(
                {
                  tareaId: tarea.id,
                  inscripcionId: primera.id,
                  nombreArchivo: nombre1,
                  rutaArchivo: ruta1,
                  estado: 'calificada',
                  nota: Math.min(10, 6 + ciclo + n * 0.3),
                  comentarioDocente: 'Retroalimentacion de prueba',
                  fechaEntrega: new Date(apertura.getTime() + 2 * 86400000),
                  fechaCalificacion: new Date(apertura.getTime() + 4 * 86400000),
                },
                { transaction }
              );
            }
          }

          if (segunda) {
            const nombre2 = `entrega-${segunda.id}-${tarea.id}.pdf`;
            const ruta2 = writeDummyPdf(nombre2);
            let e2 = await Entrega.findOne({
              where: { tareaId: tarea.id, inscripcionId: segunda.id },
              transaction,
            });
            if (!e2) {
              await Entrega.create(
                {
                  tareaId: tarea.id,
                  inscripcionId: segunda.id,
                  nombreArchivo: nombre2,
                  rutaArchivo: ruta2,
                  estado: 'pendiente',
                  nota: null,
                  comentarioDocente: null,
                  fechaEntrega: new Date(apertura.getTime() + 3 * 86400000),
                },
                { transaction }
              );
            }
          }
        }
      }

      for (const inscripcion of grupo) {
        await recalcularPromediosCiclos({
          inscripcionId: inscripcion.id,
          docenteId,
          tipoPractica,
        });
      }
    }

    await transaction.commit();
    console.log('Seed de ciclos/tareas/entregas completado.');
    process.exit(0);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error seedCiclosCalificaciones:', error);
    process.exit(1);
  }
}

seedCiclosCalificaciones();
