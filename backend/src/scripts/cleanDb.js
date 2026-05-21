const { sequelize, Usuario, Estudiante, Docente, Convenio, Inscripcion, Documento, Notificacion } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const cleanDatabase = async () => {
  try {
    console.log('🔄 Iniciando proceso de limpieza de Base de Datos...');

    // 1. Eliminar Notificaciones
    console.log('🗑️  Eliminando notificaciones...');
    await Notificacion.destroy({ where: {} });

    // 2. Eliminar Documentos
    console.log('🗑️  Eliminando documentos...');
    await Documento.destroy({ where: {} });

    // 3. Eliminar Inscripciones
    console.log('🗑️  Eliminando inscripciones...');
    await Inscripcion.destroy({ where: {} });

    // 4. Eliminar Convenios
    console.log('🗑️  Eliminando convenios...');
    await Convenio.destroy({ where: {} });

    // 4.5. Eliminar Docentes
    console.log('🗑️  Eliminando docentes...');
    await Docente.destroy({ where: {} });

    // 5. Eliminar otros usuarios si existen (excepto admin y santiago.panchi)
    console.log('🗑️  Eliminando otros usuarios de prueba...');
    await Usuario.destroy({
      where: {
        email: {
          [Op.notIn]: ['admin@espoch.edu.ec', 'santiago.panchi@espoch.edu.ec']
        }
      }
    });

    // 6. Resetear el estado del estudiante santiago.panchi
    console.log('🔄 Reseteando estado de proceso de Santiago Panchi...');
    const santiagoUsuario = await Usuario.findOne({
      where: { email: 'santiago.panchi@espoch.edu.ec' },
      include: [{ model: Estudiante, as: 'estudiante' }]
    });

    if (santiagoUsuario && santiagoUsuario.estudiante) {
      await santiagoUsuario.estudiante.update({
        estadoProceso: 'sin_asignar'
      });
      console.log('✅ Santiago Panchi reseteado a "sin_asignar" con éxito.');
    } else {
      console.log('⚠️  No se encontró el perfil de Estudiante para santiago.panchi@espoch.edu.ec');
    }

    // 7. Eliminar archivos físicos en la carpeta uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      console.log('📂 Limpiando archivos físicos en backend/uploads...');
      const files = fs.readdirSync(uploadsDir);
      let count = 0;
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.lstatSync(filePath).isFile() && file !== '.gitkeep') {
          fs.unlinkSync(filePath);
          count++;
        }
      }
      console.log(`✅ Se eliminaron ${count} archivos de la carpeta uploads.`);
    }

    console.log('🎉 ¡Base de Datos y almacenamiento físico limpiados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la limpieza de la Base de Datos:', error);
    process.exit(1);
  }
};

cleanDatabase();
