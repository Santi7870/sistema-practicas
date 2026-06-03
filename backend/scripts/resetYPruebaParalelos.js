const { sequelize, Usuario, Estudiante, Inscripcion, Convenio, Docente, Paralelo, Entrega, Ciclo, Documento } = require('../src/models');
require('dotenv').config();

async function resetAllAndSeedForParalelos() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos PostgreSQL.');

    console.log('🧹 Limpiando datos de transacciones anteriores (entregas, ciclos, documentos, inscripciones)...');
    
    // 1. Eliminar datos transaccionales para todos los alumnos en orden secuencial
    await Entrega.destroy({ where: {}, force: true });
    await Ciclo.destroy({ where: {}, force: true });
    await Documento.destroy({ where: {}, force: true });
    await Inscripcion.destroy({ where: {}, force: true });

    // 1.5 Migrar cualquier docente legacy registrado con 'ambas' a 'laborales'
    await Docente.update({ tipoTutor: 'laborales' }, { where: { tipoTutor: 'ambas' } });

    // 2. Limpiar asignaciones de paralelos y docentes
    await Paralelo.update({ docenteId: null }, { where: {} });

    console.log('🌱 Inicializando datos base para pruebas de paralelos...');

    // 3. Buscar o crear convenio ANEUPI de prueba
    let convenio = await Convenio.findOne({ 
      where: { nombreEmpresa: 'Agrupación Nacional de Estudiantes Universitarios (ANEUPI)' }
    });
    
    if (!convenio) {
      convenio = await Convenio.create({
        nombreEmpresa: 'Agrupación Nacional de Estudiantes Universitarios (ANEUPI)',
        area: 'Desarrollo de Software',
        contacto: 'Ing. Javier Rojas',
        telefono: '0987654321',
        actividades: 'Desarrollo de sistemas web y aplicaciones móviles institucionales.',
        horario: 'Lunes a Viernes 08:00 - 14:00',
        cuposLaboralesTotales: 50,
        cuposComunitariosTotales: 50,
        activo: true
      });
    } else {
      // Asegurar que el convenio existente tenga cupos legales suficientes para la prueba masiva
      await convenio.update({
        cuposLaboralesTotales: 50,
        cuposComunitariosTotales: 50,
        actividades: 'Desarrollo de sistemas web y aplicaciones móviles institucionales.'
      });
    }

    // 4. Asegurar que tenemos un grupo de 8 docentes de prueba con especialidades claras
    const testDocentes = [
      { nombres: 'Angie Narvaez', email: 'angie.narvaez@espoch.edu.ec', tipoTutor: 'comunales' },
      { nombres: 'Dr. Luis Cevallos', email: 'luis.cevallos@espoch.edu.ec', tipoTutor: 'laborales' },
      { nombres: 'Dr. Hugo Guerrero', email: 'hugo.guerrero@espoch.edu.ec', tipoTutor: 'laborales' },
      { nombres: 'Ing. Carlos Andrade', email: 'carlos.andrade@espoch.edu.ec', tipoTutor: 'laborales' },
      { nombres: 'Dr. Oscar Paredes', email: 'oscar.paredes@espoch.edu.ec', tipoTutor: 'comunales' },
      { nombres: 'Dra. Katherine Jaramillo', email: 'katherine.jaramillo@espoch.edu.ec', tipoTutor: 'comunales' },
      { nombres: 'Ing. Isabel Herrera', email: 'isabel.herrera@espoch.edu.ec', tipoTutor: 'comunales' },
      { nombres: 'Ing. Patricia Quezada', email: 'patricia.quezada@espoch.edu.ec', tipoTutor: 'comunales' },
    ];

    for (const d of testDocentes) {
      let usuarioDoc = await Usuario.findOne({ where: { email: d.email } });
      if (!usuarioDoc) {
        usuarioDoc = await Usuario.create({
          email: d.email,
          password: 'Password123!',
          rol: 'docente',
          estadoCuenta: 'activo',
          debeCambiarPassword: false
        });

        await Docente.create({
          usuarioId: usuarioDoc.id,
          nombres: d.nombres,
          departamento: 'Software',
          tipoTutor: d.tipoTutor
        });
        console.log(`👨‍🏫 Creado Docente: ${d.nombres} [Especialidad: ${d.tipoTutor}]`);
      } else {
        // Asegurar que el docente existente tenga la especialidad correcta para las pruebas
        const docenteExistente = await Docente.findOne({ where: { usuarioId: usuarioDoc.id } });
        if (docenteExistente) {
          await docenteExistente.update({ tipoTutor: d.tipoTutor });
        }
      }
    }

    // 5. Crear 44 estudiantes listos y aprobados esperando asignación de paralelos (24 Laborales y 20 Comunitarias)
    const testAlumnos = [];
    
    // Laborales (24 estudiantes)
    const nombresLaboral = [
      'Santiago Panchi', 'Laura Viteri', 'Gabriel Silva', 'Christian López',
      'Ana Martínez', 'Pedro Rodríguez', 'David Panchi', 'Estefanía Andrade',
      'Mateo Bolaños', 'Valeria Cevallos', 'Nicolás Falconí', 'Camila Ortiz',
      'Sebastián Ramos', 'Daniela Suárez', 'Alejandro Torres', 'Sofía Vargas',
      'Martín Paredes', 'Lucía Cárdenas', 'Joaquín Mendoza', 'Paula Freire',
      'Ricardo Noboa', 'Elena Rosero', 'Felipe Salazar', 'Victoria Villacís'
    ];
    nombresLaboral.forEach((n, idx) => {
      const seq = idx + 1;
      testAlumnos.push({
        nombres: n,
        email: n === 'Santiago Panchi' ? 'santiago.david@espoch.edu.ec' : `student.lab${seq}@espoch.edu.ec`,
        codigo: (1000 + seq).toString(),
        semestre: 5 + (idx % 4),
        tipoPractica: 'laboral'
      });
    });

    // Comunitarias (20 estudiantes)
    const nombresComunitaria = [
      'Adrián Bonilla', 'Belén Espín', 'Carlos Grijalva', 'Diana Hinojosa',
      'Emilio Ibarra', 'Gabriela Jácome', 'Hugo Llerena', 'Irene Maldonado',
      'Javier Narváez', 'Karla Oña', 'Luis Pilataxi', 'María Reinoso',
      'Nelly Santamaría', 'Óscar Terán', 'Patricia Uvidia', 'Víctor Yánez',
      'Xavier Zumba', 'Yolanda Astudillo', 'Zacarias Beltrán', 'Walter Ortiz'
    ];
    nombresComunitaria.forEach((n, idx) => {
      const seq = idx + 1;
      testAlumnos.push({
        nombres: n,
        email: `student.com${seq}@espoch.edu.ec`,
        codigo: (2000 + seq).toString(),
        semestre: 5 + (idx % 4),
        tipoPractica: 'comunitaria'
      });
    });

    for (const st of testAlumnos) {
      let usuario = await Usuario.findOne({ where: { email: st.email } });
      if (!usuario) {
        usuario = await Usuario.create({
          email: st.email,
          password: 'Password123!',
          rol: 'estudiante',
          estadoCuenta: 'activo',
          debeCambiarPassword: false
        });
      }

      let estudiante = await Estudiante.findOne({ where: { usuarioId: usuario.id } });
      if (!estudiante) {
        estudiante = await Estudiante.create({
          usuarioId: usuario.id,
          nombres: st.nombres,
          codigo: st.codigo,
          semestre: st.semestre,
          estadoProceso: 'pendiente_inicio'
        });
      } else {
        await estudiante.update({
          nombres: st.nombres,
          codigo: st.codigo,
          semestre: st.semestre,
          estadoProceso: 'pendiente_inicio'
        });
      }

      // Crear inscripción activa limpia y aprobada esperando asignación (paraleloId y tutorId en null)
      await Inscripcion.create({
        estudianteId: estudiante.id,
        convenioId: convenio.id,
        tutorId: null,
        paraleloId: null,
        tipoPractica: st.tipoPractica,
        estadoInscripcion: 'aprobada',
        activa: true
      });

      console.log(`👨‍🎓 Estudiante re-inicializado: ${st.nombres} con inscripción aprobada limpia (Sin paralelo/tutor).`);
    }

    // 6. Recalcular y sincronizar cupos ocupados del convenio de prueba
    const countLaboral = await Inscripcion.count({
      where: { convenioId: convenio.id, tipoPractica: 'laboral', estadoInscripcion: 'aprobada', activa: true }
    });
    const countComunitario = await Inscripcion.count({
      where: { convenioId: convenio.id, tipoPractica: 'comunitaria', estadoInscripcion: 'aprobada', activa: true }
    });

    await convenio.update({
      cuposLaboralesOcupados: countLaboral,
      cuposComunitariosOcupados: countComunitario
    });
    console.log(`📊 Cupos del convenio ${convenio.nombreEmpresa} sincronizados: Laborales=${countLaboral}, Comunitarios=${countComunitario}`);

    console.log('🎉 Reset y siembra de prueba de paralelos completado exitosamente.');
    console.log('💡 Ahora tienes 24 alumnos en laborales y 20 en comunitarias aprobados listos para ser distribuidos.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al resetear y sembrar datos de prueba:', error);
    process.exit(1);
  }
}

resetAllAndSeedForParalelos();
