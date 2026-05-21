const { sequelize, Usuario, Estudiante } = require('../src/models');
require('dotenv').config();

const cleanMappings = [
  { email: 'juan.perez@espoch.edu.ec', nombres: 'Juan Pérez' },
  { email: 'maria.gomez@espoch.edu.ec', nombres: 'María Gómez' },
  { email: 'pedro.rodriguez@espoch.edu.ec', nombres: 'Pedro Rodríguez' },
  { email: 'ana.martinez@espoch.edu.ec', nombres: 'Ana Martínez' },
  { email: 'christian.lopez@espoch.edu.ec', nombres: 'Christian López' },
  { email: 'estefania.andrade@espoch.edu.ec', nombres: 'Estefanía Andrade' },
  { email: 'gabriel.silva@espoch.edu.ec', nombres: 'Gabriel Silva' },
  { email: 'laura.viteri@espoch.edu.ec', nombres: 'Laura Viteri' }
];

async function cleanNames() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    console.log('🧹 Limpiando los nombres de los estudiantes...');

    for (const mapping of cleanMappings) {
      // Buscar el usuario por email
      const usuario = await Usuario.findOne({ where: { email: mapping.email } });
      if (usuario) {
        // Actualizar el nombre en el perfil del Estudiante
        await Estudiante.update(
          { nombres: mapping.nombres },
          { where: { usuarioId: usuario.id } }
        );
        console.log(`✨ Nombre de ${mapping.email} actualizado a: "${mapping.nombres}"`);
      }
    }

    console.log('🎉 Limpieza completada con éxito');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al limpiar los nombres:', error);
    process.exit(1);
  }
}

cleanNames();
