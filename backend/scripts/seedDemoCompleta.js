const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Usuario,
  Estudiante,
  Docente,
  Convenio,
  Inscripcion,
  Documento,
  Notificacion,
  Ciclo,
  Tarea,
  Entrega,
  Paralelo,
} = require('../src/models');
const { recalcularPromediosCiclos } = require('../src/utils/ciclos');

require('dotenv').config();

// This seed is additive and repeatable. It never deletes or updates unrelated data.
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || 'Demo12345!';
const demoPrefix = 'demo.tesis.';
const uploadsDir = path.join(__dirname, '../uploads/ciclos');

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const demoPdf = (filename) => {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(
      fullPath,
      '%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'
    );
  }
  return fullPath;
};

async function findOrCreateUser({ email, nombres, rol }, transaction) {
  const [user, created] = await Usuario.findOrCreate({
    where: { email },
    defaults: {
      email,
      nombres,
      password: DEMO_PASSWORD,
      rol,
      estadoCuenta: 'activo',
      debeCambiarPassword: false,
    },
    transaction,
  });
  return { user, created };
}

async function findOrCreateConvenio(data, transaction) {
  const [convenio] = await Convenio.findOrCreate({
    where: { nombreEmpresa: data.nombreEmpresa, area: data.area },
    defaults: data,
    transaction,
  });
  return convenio;
}

async function findOrCreateInscripcion(data, transaction) {
  const [inscripcion, created] = await Inscripcion.findOrCreate({
    where: { estudianteId: data.estudianteId, convenioId: data.convenioId, tipoPractica: data.tipoPractica },
    defaults: data,
    transaction,
  });
  return { inscripcion, created };
}

async function ensureDemoDocument(inscripcion, values, transaction) {
  const [documento] = await Documento.findOrCreate({
    where: { inscripcionId: inscripcion.id, tipoDocumento: values.tipoDocumento },
    defaults: {
      ...values,
      inscripcionId: inscripcion.id,
      nombreArchivo: `demo-${inscripcion.id}-${values.fase}.pdf`,
      rutaArchivo: demoPdf(`demo-documento-${inscripcion.id}-${values.fase}.pdf`),
    },
    transaction,
  });
  return documento;
}

async function ensureTask(docente, tipoPractica, ciclo, suffix, values, transaction) {
  const codigo = `DEMO-${tipoPractica === 'laboral' ? 'LAB' : 'COM'}-C${ciclo}-${suffix}`;
  const [tarea] = await Tarea.findOrCreate({
    where: { docenteId: docente.id, codigo },
    defaults: {
      docenteId: docente.id,
      tipoPractica,
      numeroCiclo: ciclo,
      codigo,
      ...values,
    },
    transaction,
  });
  return tarea;
}

async function ensureDelivery(tarea, inscripcion, values, transaction) {
  const [entrega] = await Entrega.findOrCreate({
    where: { tareaId: tarea.id, inscripcionId: inscripcion.id },
    defaults: {
      tareaId: tarea.id,
      inscripcionId: inscripcion.id,
      ...values,
    },
    transaction,
  });
  return entrega;
}

async function seedDemoCompleta() {
  let transaction;
  try {
    await sequelize.authenticate();
    transaction = await sequelize.transaction();

    const docentesData = [
      ['Carlos Andrade', 'carlos.andrade@espoch.edu.ec', 'laborales'],
      ['Verónica Bastidas', 'veronica.bastidas@espoch.edu.ec', 'laborales'],
      ['Isabel Herrera', 'isabel.herrera@espoch.edu.ec', 'comunales'],
      ['Jorge Izurieta', 'jorge.izurieta@espoch.edu.ec', 'comunales'],
    ];
    const docentes = {};
    for (const [nombres, email, tipoTutor] of docentesData) {
      const { user } = await findOrCreateUser({ email, nombres, rol: 'docente' }, transaction);
      const [docente] = await Docente.findOrCreate({
        where: { usuarioId: user.id },
        defaults: { usuarioId: user.id, nombres, departamento: 'Escuela de Software', tipoTutor },
        transaction,
      });
      docentes[tipoTutor] = docentes[tipoTutor] || [];
      docentes[tipoTutor].push(docente);
    }

    const paralelos = {};
    for (const tipoPractica of ['laboral', 'comunitaria']) {
      const [paralelo] = await Paralelo.findOrCreate({
        where: { nombre: tipoPractica === 'laboral' ? 'G' : 'H', tipoPractica },
        defaults: { nombre: tipoPractica === 'laboral' ? 'G' : 'H', tipoPractica, docenteId: docentes[tipoPractica === 'laboral' ? 'laborales' : 'comunales'][0].id },
        transaction,
      });
      paralelos[tipoPractica] = paralelo;
    }

    const convenios = {
      laboral: await findOrCreateConvenio({
        nombreEmpresa: 'Demo Tech Solutions S.A.', area: 'Desarrollo de Software', contacto: 'Laura Méndez', telefono: '0990001001',
        actividades: 'Desarrollo y mantenimiento de sistemas web.', horario: 'Lunes a viernes, 08:00 a 14:00',
        cuposLaboralesTotales: 12, cuposLaboralesOcupados: 5, cuposComunitariosTotales: 0, cuposComunitariosOcupados: 0,
        activo: true, fechaVencimiento: daysFromNow(120), fechaLimiteRequisitos: daysFromNow(30),
      }, transaction),
      comunitaria: await findOrCreateConvenio({
        nombreEmpresa: 'Fundación Comunidad Digital', area: 'Inclusión Tecnológica', contacto: 'Pedro Salazar', telefono: '0990001002',
        actividades: 'Capacitación digital y apoyo tecnológico comunitario.', horario: 'Martes a sábado, 09:00 a 13:00',
        cuposLaboralesTotales: 0, cuposLaboralesOcupados: 0, cuposComunitariosTotales: 10, cuposComunitariosOcupados: 4,
        activo: true, fechaVencimiento: daysFromNow(90), fechaLimiteRequisitos: daysFromNow(25),
      }, transaction),
      vencido: await findOrCreateConvenio({
        nombreEmpresa: 'Demo Convenio Vencido', area: 'Soporte Informático', contacto: 'María Torres', telefono: '0990001003',
        actividades: 'Soporte y documentación de infraestructura.', horario: 'Lunes a viernes, 08:00 a 12:00',
        cuposLaboralesTotales: 4, cuposLaboralesOcupados: 4, cuposComunitariosTotales: 0, cuposComunitariosOcupados: 0,
        activo: false, fechaVencimiento: daysAgo(5), fechaLimiteRequisitos: daysAgo(20),
      }, transaction),
    };

    const estudiantesData = [
      ['Ana Morales', 'ana.morales@espoch.edu.ec', '9101', 5, 'en_proceso', 'laboral', 'aprobada', true],
      ['Bruno Cevallos', 'bruno.cevallos@espoch.edu.ec', '9102', 6, 'finalizado', 'laboral', 'aprobada', true],
      ['Carla Ruiz', 'carla.ruiz@espoch.edu.ec', '9103', 7, 'en_proceso', 'comunitaria', 'aprobada', true],
      ['Diego Paredes', 'diego.paredes@espoch.edu.ec', '9104', 5, 'pendiente_inicio', 'laboral', 'aprobada', true],
      ['Elena Vaca', 'elena.vaca@espoch.edu.ec', '9105', 8, 'asignado', 'comunitaria', 'pendiente', true],
      ['Fabio Lema', 'fabio.lema@espoch.edu.ec', '9106', 6, 'sin_asignar', 'laboral', 'rechazada', false],
      ['Gabriela León', 'gabriela.leon@espoch.edu.ec', '9107', 7, 'finalizado', 'comunitaria', 'aprobada', true],
      ['Héctor Guamán', 'hector.guaman@espoch.edu.ec', '9108', 5, 'en_proceso', 'laboral', 'aprobada', true],
    ];

    // Additional synthetic cohort to represent recurring platform usage.
    const extraStates = [
      ['en_proceso', 'laboral', 'aprobada', true],
      ['finalizado', 'comunitaria', 'aprobada', true],
      ['pendiente_inicio', 'laboral', 'aprobada', true],
      ['asignado', 'comunitaria', 'pendiente', true],
      ['en_proceso', 'laboral', 'aprobada', true],
      ['sin_asignar', 'comunitaria', 'rechazada', false],
      ['finalizado', 'laboral', 'aprobada', true],
      ['en_proceso', 'comunitaria', 'aprobada', true],
      ['pendiente_inicio', 'laboral', 'aprobada', true],
      ['en_proceso', 'comunitaria', 'aprobada', true],
      ['finalizado', 'laboral', 'aprobada', true],
      ['asignado', 'comunitaria', 'pendiente', true],
    ];
    extraStates.forEach(([estadoProceso, tipoPractica, estadoInscripcion, activa], index) => {
      const number = 9110 + index;
      estudiantesData.push([
        `Estudiante Demo ${index + 1}`,
        `estudiante.demo${index + 1}@espoch.edu.ec`,
        String(number),
        4 + (index % 5),
        estadoProceso,
        tipoPractica,
        estadoInscripcion,
        activa,
      ]);
    });

    const cohort = [];
    for (const [nombres, email, codigo, semestre, estadoProceso, tipoPractica, estadoInscripcion, activa] of estudiantesData) {
      const { user } = await findOrCreateUser({ email, nombres, rol: 'estudiante' }, transaction);
      const [estudiante] = await Estudiante.findOrCreate({
        where: { usuarioId: user.id },
        defaults: { usuarioId: user.id, nombres, codigo, semestre, estadoProceso },
        transaction,
      });
      const tutor = docentes[tipoPractica === 'laboral' ? 'laborales' : 'comunales'][estudiante.id % 2];
      const convenio = convenios[tipoPractica];
      const { inscripcion } = await findOrCreateInscripcion({
        estudianteId: estudiante.id,
        convenioId: convenio.id,
        tutorId: tutor.id,
        paraleloId: paralelos[tipoPractica].id,
        tipoPractica,
        estadoInscripcion,
        activa,
        comentarioAdmin: estadoInscripcion === 'rechazada' ? 'Documentación incompleta para esta convocatoria.' : null,
        fechaInscripcion: daysAgo(30 - (estudiante.id % 15)),
        fechaAprobacion: estadoInscripcion === 'aprobada' ? daysAgo(24 - (estudiante.id % 10)) : null,
        fechaLimiteDocumentos: daysFromNow(10),
        estadoDocumentosRequisitos: estadoInscripcion === 'aprobada' ? (estadoProceso === 'finalizado' ? 'aprobado' : 'en_revision') : 'pendiente_entrega',
      }, transaction);
      cohort.push({ user, estudiante, inscripcion, tipoPractica, tutor });
    }

    const aprobadas = cohort.filter((row) => row.inscripcion.estadoInscripcion === 'aprobada');
    for (const row of aprobadas) {
      await Ciclo.findOrCreate({ where: { inscripcionId: row.inscripcion.id, numeroCiclo: 1 }, defaults: { promedioCiclo: null }, transaction });
      await Ciclo.findOrCreate({ where: { inscripcionId: row.inscripcion.id, numeroCiclo: 2 }, defaults: { promedioCiclo: null }, transaction });
      await Ciclo.findOrCreate({ where: { inscripcionId: row.inscripcion.id, numeroCiclo: 3 }, defaults: { promedioCiclo: null }, transaction });
      await ensureDemoDocument(row.inscripcion, { fase: 2, tipoDocumento: 'Oficio de practicas', estado: row.estudiante.estadoProceso === 'finalizado' ? 'aprobado' : 'pendiente', fechaSubida: daysAgo(22) }, transaction);
      if (row.estudiante.estadoProceso === 'finalizado') {
        await ensureDemoDocument(row.inscripcion, { fase: 3, tipoDocumento: 'Respuesta de la empresa', estado: 'aprobado', fechaSubida: daysAgo(16), fechaRevision: daysAgo(15) }, transaction);
        await ensureDemoDocument(row.inscripcion, { fase: 4, tipoDocumento: 'Certificado de practicas realizadas', estado: 'aprobado', fechaSubida: daysAgo(3), fechaRevision: daysAgo(2) }, transaction);
      }
    }

    const tasksByTutor = {};
    for (const [tipoPractica, tutorKey] of [['laboral', 'laborales'], ['comunitaria', 'comunales']]) {
      for (const docente of docentes[tutorKey]) {
        tasksByTutor[docente.id] = [];
        for (let ciclo = 1; ciclo <= 3; ciclo += 1) {
          const closed = ciclo < 3;
          const task = await ensureTask(docente, tipoPractica, ciclo, '01', {
            titulo: `Evidencia de avance - Ciclo ${ciclo}`,
            descripcion: `Actividad demostrativa de prueba para el ciclo ${ciclo}. Revisar instrucciones y entregar el archivo solicitado.`,
            puntajeMaximo: 10,
            fechaApertura: daysAgo(ciclo === 1 ? 28 : ciclo === 2 ? 18 : 3),
            fechaCierre: closed ? daysAgo(ciclo === 1 ? 20 : 8) : daysFromNow(7),
            activa: true,
          }, transaction);
          const secondTask = await ensureTask(docente, tipoPractica, ciclo, '02', {
            titulo: `Reflexión y reporte - Ciclo ${ciclo}`,
            descripcion: 'Reporte breve de resultados y aprendizajes del ciclo.',
            puntajeMaximo: 10,
            fechaApertura: daysAgo(ciclo === 1 ? 25 : ciclo === 2 ? 15 : 2),
            fechaCierre: closed ? daysAgo(ciclo === 1 ? 17 : 5) : daysFromNow(10),
            activa: true,
          }, transaction);
          tasksByTutor[docente.id].push(task, secondTask);
        }
      }
    }

    for (const row of aprobadas) {
      const tasks = tasksByTutor[row.tutor.id] || [];
      for (const task of tasks) {
        const cycle = task.numeroCiclo;
        const isFinalized = row.estudiante.estadoProceso === 'finalizado';
        const isPartial = row.estudiante.codigo === '9104' || row.estudiante.codigo === '9108';
        const shouldSubmit = isFinalized || cycle <= 2 || (cycle === 3 && row.estudiante.codigo === '9101');
        if (!shouldSubmit) continue;
        const late = row.estudiante.codigo === '9108' && cycle === 2;
        const nota = isPartial && cycle === 2 ? null : Math.max(5, Math.min(10, 7 + ((Number(row.estudiante.codigo) + cycle + task.id) % 30) / 10));
        const filename = `demo-entrega-${row.inscripcion.id}-${task.id}.pdf`;
        await ensureDelivery(task, row.inscripcion, {
          nombreArchivo: filename,
          rutaArchivo: demoPdf(filename),
          estado: nota === null ? 'pendiente' : late ? 'tarde' : 'calificada',
          nota,
          comentarioDocente: nota === null ? null : nota >= 9 ? 'Excelente trabajo y evidencia clara.' : 'Buen avance. Revisar las observaciones para mejorar.',
          fechaEntrega: late ? daysAgo(4) : daysAgo(Math.max(1, cycle * 4)),
          fechaCalificacion: nota === null ? null : daysAgo(Math.max(1, cycle * 3 - 1)),
        }, transaction);
      }
    }

    const admin = await Usuario.findOne({ where: { rol: 'admin' }, transaction });
    if (admin) {
      await Notificacion.findOrCreate({
        where: { usuarioId: admin.id, titulo: 'Datos demo de tesis cargados' },
        defaults: { usuarioId: admin.id, titulo: 'Datos demo de tesis cargados', mensaje: 'Se creó un escenario de prueba con estudiantes, docentes, convenios, tareas y calificaciones.', tipo: 'sistema', leida: false, enlace: '/admin/estudiantes' },
        transaction,
      });
    }

    // Notifications give the demo realistic activity in each role.
    for (const row of cohort) {
      const title = row.inscripcion.estadoInscripcion === 'rechazada'
        ? 'Solicitud de práctica rechazada'
        : row.estudiante.estadoProceso === 'finalizado'
          ? 'Práctica finalizada'
          : 'Tareas y ciclos disponibles';
      await Notificacion.findOrCreate({
        where: { usuarioId: row.user.id, titulo: title },
        defaults: {
          usuarioId: row.user.id,
          titulo: title,
          mensaje: row.inscripcion.estadoInscripcion === 'rechazada'
            ? 'Revisa la observación registrada por el administrador.'
            : 'Consulta el detalle de tu práctica y revisa las actividades asignadas por tu docente.',
          tipo: row.inscripcion.estadoInscripcion === 'rechazada' ? 'rechazo' : 'sistema',
          leida: row.estudiante.id % 3 === 0,
          enlace: '/estudiante/practicas',
        },
        transaction,
      });
    }

    for (const docente of [...docentes.laborales, ...docentes.comunales]) {
      await Notificacion.findOrCreate({
        where: { usuarioId: docente.usuarioId, titulo: 'Nuevas entregas por revisar' },
        defaults: {
          usuarioId: docente.usuarioId,
          titulo: 'Nuevas entregas por revisar',
          mensaje: 'Hay actividades demo pendientes de revisión en tus grupos asignados.',
          tipo: 'sistema',
          leida: false,
          enlace: '/docente/ciclos',
        },
        transaction,
      });
    }

    await transaction.commit();

    // Recalculate after commit because the shared utility performs its own queries.
    for (const row of aprobadas) {
      await recalcularPromediosCiclos({
        inscripcionId: row.inscripcion.id,
        docenteId: row.tutor.id,
        tipoPractica: row.tipoPractica,
      });
    }

    console.log('Seed integral completada correctamente. No se eliminaron datos existentes.');
    console.log(`Usuarios demo: ${demoPrefix}* | Password configurable con DEMO_SEED_PASSWORD`);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en seedDemoCompleta:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seedDemoCompleta();
