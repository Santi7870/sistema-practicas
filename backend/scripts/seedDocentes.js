const { sequelize, Usuario, Docente } = require('../src/models');
require('dotenv').config();

const docentesLaborales = [
  { nombres: 'Ing. Carlos Andrade', email: 'carlos.andrade@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Ing. Verónica Bastidas', email: 'veronica.bastidas@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Dr. Luis Cevallos', email: 'luis.cevallos@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Ing. Diana Delgado', email: 'diana.delgado@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Mg. Fernando Espinosa', email: 'fernando.espinosa@espoch.edu.ec', depto: 'Departamento de Software' },
  { nombres: 'Ing. Gabriela Flores', email: 'gabriela.flores@espoch.edu.ec', depto: 'Departamento de Software' },
  { nombres: 'Dr. Hugo Guerrero', email: 'hugo.guerrero@espoch.edu.ec', depto: 'Departamento de Software' }
];

const docentesComunales = [
  { nombres: 'Ing. Isabel Herrera', email: 'isabel.herrera@espoch.edu.ec', depto: 'Departamento de Vinculación' },
  { nombres: 'Mg. Jorge Izurieta', email: 'jorge.izurieta@espoch.edu.ec', depto: 'Departamento de Vinculación' },
  { nombres: 'Dra. Katherine Jaramillo', email: 'katherine.jaramillo@espoch.edu.ec', depto: 'Departamento de Vinculación' },
  { nombres: 'Ing. Leonel Maldonado', email: 'leonel.maldonado@espoch.edu.ec', depto: 'Departamento de Software' },
  { nombres: 'Mg. Mónica Naranjo', email: 'monica.naranjo@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Dr. Oscar Paredes', email: 'oscar.paredes@espoch.edu.ec', depto: 'Departamento de Computación' },
  { nombres: 'Ing. Patricia Quezada', email: 'patricia.quezada@espoch.edu.ec', depto: 'Departamento de Software' }
];

async function seedDocentes() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    transaction = await sequelize.transaction();

    console.log('🌱 Iniciando la siembra de docentes...');

    // 1. Crear docentes para prácticas laborales
    for (const d of docentesLaborales) {
      // Verificar si existe el usuario
      let usuario = await Usuario.findOne({ where: { email: d.email }, transaction });
      if (!usuario) {
        usuario = await Usuario.create({
          email: d.email,
          password: 'Docente123!', // Se cifra automáticamente en el hook de Sequelize
          rol: 'docente',
          estadoCuenta: 'activo',
          debeCambiarPassword: false // Listo para pruebas de login directo sin cambio forzoso
        }, { transaction });

        await Docente.create({
          usuarioId: usuario.id,
          nombres: d.nombres,
          departamento: d.depto,
          tipoTutor: 'laborales'
        }, { transaction });

        console.log(`💼 Creado Docente Laboral: ${d.nombres} (${d.email})`);
      } else {
        console.log(`⚠️  El docente ${d.nombres} (${d.email}) ya existe. Saltando...`);
      }
    }

    // 2. Crear docentes para prácticas comunales
    for (const d of docentesComunales) {
      let usuario = await Usuario.findOne({ where: { email: d.email }, transaction });
      if (!usuario) {
        usuario = await Usuario.create({
          email: d.email,
          password: 'Docente123!',
          rol: 'docente',
          estadoCuenta: 'activo',
          debeCambiarPassword: false
        }, { transaction });

        await Docente.create({
          usuarioId: usuario.id,
          nombres: d.nombres,
          departamento: d.depto,
          tipoTutor: 'comunales'
        }, { transaction });

        console.log(`🤝 Creado Docente Comunal: ${d.nombres} (${d.email})`);
      } else {
        console.log(`⚠️  El docente ${d.nombres} (${d.email}) ya existe. Saltando...`);
      }
    }

    await transaction.commit();
    console.log('🎉 Siembra de docentes completada de forma exitosa');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Error al sembrar docentes:', error);
    process.exit(1);
  }
}

seedDocentes();
