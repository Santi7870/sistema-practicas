const { sequelize, Usuario, Estudiante, Inscripcion, Convenio, Docente } = require('../src/models');
require('dotenv').config();

async function seedEstudiantes() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    transaction = await sequelize.transaction();
    console.log('🌱 Iniciando la siembra de estudiantes de prueba...');

    // 1. Obtener o crear un Convenio para asociar las inscripciones
    let convenio = await Convenio.findOne({ 
      where: { nombreEmpresa: 'Agrupación Nacional de Estudiantes Universitarios (ANEUPI)' }, 
      transaction 
    });
    
    if (!convenio) {
      // Intentar buscar cualquier convenio o crearlo
      convenio = await Convenio.create({
        nombreEmpresa: 'Agrupación Nacional de Estudiantes Universitarios (ANEUPI)',
        area: 'Desarrollo de Software',
        contacto: 'Ing. Javier Rojas',
        telefono: '0987654321',
        actividades: 'Desarrollo de sistemas web y aplicaciones móviles institucionales.',
        horario: 'Lunes a Viernes 08:00 - 14:00',
        cuposLaboralesTotales: 15,
        cuposComunitariosTotales: 15,
        activo: true
      }, { transaction });
      console.log('🏢 Creado Convenio ANEUPI para las pruebas');
    }

    // 2. Obtener un docente de laborales y uno de comunales para asignación inicial
    const docenteLaboral = await Docente.findOne({ where: { tipoTutor: 'laborales' }, transaction });
    const docenteComunal = await Docente.findOne({ where: { tipoTutor: 'comunales' }, transaction });

    console.log('👨‍🏫 Docente Laboral disponible:', docenteLaboral?.nombres || 'Ninguno');
    console.log('👨‍🏫 Docente Comunal disponible:', docenteComunal?.nombres || 'Ninguno');

    // Estructura de estudiantes de prueba
    const testAlumnos = [
      {
        nombres: 'Juan Pérez',
        email: 'juan.perez@espoch.edu.ec',
        codigo: '1111',
        semestre: 5,
        estadoProceso: 'sin_asignar',
        inscripcion: null // No tiene inscripción registrada
      },
      {
        nombres: 'María Gómez',
        email: 'maria.gomez@espoch.edu.ec',
        codigo: '2222',
        semestre: 6,
        estadoProceso: 'sin_asignar',
        inscripcion: {
          tipoPractica: 'laboral',
          estadoInscripcion: 'rechazada',
          activa: false
        }
      },
      {
        nombres: 'Pedro Rodríguez',
        email: 'pedro.rodriguez@espoch.edu.ec',
        codigo: '3333',
        semestre: 7,
        estadoProceso: 'asignado',
        inscripcion: {
          tipoPractica: 'laboral',
          estadoInscripcion: 'pendiente',
          activa: true
        }
      },
      {
        nombres: 'Ana Martínez',
        email: 'ana.martinez@espoch.edu.ec',
        codigo: '4444',
        semestre: 5,
        estadoProceso: 'pendiente_inicio',
        inscripcion: {
          tipoPractica: 'laboral',
          estadoInscripcion: 'aprobada',
          activa: true,
          conTutor: false
        }
      },
      {
        nombres: 'Christian López',
        email: 'christian.lopez@espoch.edu.ec',
        codigo: '5555',
        semestre: 8,
        estadoProceso: 'en_proceso',
        inscripcion: {
          tipoPractica: 'laboral',
          estadoInscripcion: 'aprobada',
          activa: true,
          conTutor: true,
          tutorId: docenteLaboral ? docenteLaboral.id : null
        }
      },
      {
        nombres: 'Estefanía Andrade',
        email: 'estefania.andrade@espoch.edu.ec',
        codigo: '6666',
        semestre: 8,
        estadoProceso: 'finalizado',
        inscripcion: {
          tipoPractica: 'laboral',
          estadoInscripcion: 'aprobada',
          activa: true,
          conTutor: true,
          tutorId: docenteLaboral ? docenteLaboral.id : null
        }
      },
      {
        nombres: 'Gabriel Silva',
        email: 'gabriel.silva@espoch.edu.ec',
        codigo: '7777',
        semestre: 6,
        estadoProceso: 'pendiente_inicio',
        inscripcion: {
          tipoPractica: 'comunitaria',
          estadoInscripcion: 'aprobada',
          activa: true,
          conTutor: false
        }
      },
      {
        nombres: 'Laura Viteri',
        email: 'laura.viteri@espoch.edu.ec',
        codigo: '8888',
        semestre: 7,
        estadoProceso: 'en_proceso',
        inscripcion: {
          tipoPractica: 'comunitaria',
          estadoInscripcion: 'aprobada',
          activa: true,
          conTutor: true,
          tutorId: docenteComunal ? docenteComunal.id : null
        }
      }
    ];

    for (const st of testAlumnos) {
      // Buscar si el usuario existe para no duplicar
      let usuario = await Usuario.findOne({ where: { email: st.email }, transaction });
      if (!usuario) {
        usuario = await Usuario.create({
          email: st.email,
          password: 'Password123!', // hook cifra la contraseña
          rol: 'estudiante',
          estadoCuenta: 'activo',
          debeCambiarPassword: false
        }, { transaction });

        const estudiante = await Estudiante.create({
          usuarioId: usuario.id,
          nombres: st.nombres,
          codigo: st.codigo,
          semestre: st.semestre,
          estadoProceso: st.estadoProceso
        }, { transaction });

        console.log(`👨‍🎓 Estudiante creado: ${st.nombres} [Proceso: ${st.estadoProceso}]`);

        // Si tiene configuración de inscripción
        if (st.inscripcion) {
          await Inscripcion.create({
            estudianteId: estudiante.id,
            convenioId: convenio.id,
            tutorId: st.inscripcion.tutorId || null,
            tipoPractica: st.inscripcion.tipoPractica,
            estadoInscripcion: st.inscripcion.estadoInscripcion,
            activa: st.inscripcion.activa
          }, { transaction });
          console.log(`  📄 Inscripción creada (${st.inscripcion.tipoPractica}) [Estado: ${st.inscripcion.estadoInscripcion}]`);
        }
      } else {
        console.log(`⚠️ El estudiante ${st.nombres} ya existe en el sistema. Saltando...`);
      }
    }

    // 3. Actualizar contadores de carga académica para los docentes seleccionados
    if (docenteLaboral) {
      const cntLaboral = await Inscripcion.count({ 
        where: { tutorId: docenteLaboral.id, activa: true }, 
        transaction 
      });
      // La carga académica no está en una columna en la tabla Docentes directamente,
      // se calcula mediante asociaciones o consultas en los endpoints.
      console.log(`📈 Carga virtual en DB de ${docenteLaboral.nombres}: ${cntLaboral} alumnos`);
    }

    await transaction.commit();
    console.log('🎉 Siembra de estudiantes completada exitosamente.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Error al sembrar estudiantes:', error);
    process.exit(1);
  }
}

seedEstudiantes();
