const { Usuario, Estudiante } = require('./src/models');

const run = async () => {
  try {
    console.log('--- INICIANDO DIAGNÓSTICO DE ESTUDIANTES ---');

    // 1. Total estudiantes en la tabla Estudiante
    const totalEstudiantes = await Estudiante.count();
    console.log(`Total de filas en tabla Estudiante: ${totalEstudiantes}`);

    // 2. Traer todos los estudiantes con sus usuarios
    const estudiantes = await Estudiante.findAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
        }
      ]
    });

    console.log('\nListado de Estudiantes y sus cuentas asociadas:');
    estudiantes.forEach((est, index) => {
      console.log(`[${index + 1}] ID: ${est.id} | Código: ${est.codigo || 'S/C'} | Nombres: ${est.nombres || 'S/N'} | Email: ${est.usuario ? est.usuario.email : 'Sin Usuario'} | Estado Cuenta: ${est.usuario ? est.usuario.estadoCuenta : 'N/A'}`);
    });

    // 3. Conteo por estado de cuenta
    const estados = {};
    estudiantes.forEach(est => {
      const estado = est.usuario ? est.usuario.estadoCuenta : 'Sin Usuario';
      estados[estado] = (estados[estado] || 0) + 1;
    });

    console.log('\nResumen por Estado de Cuenta de Estudiante:');
    console.log(estados);

    process.exit(0);
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
    process.exit(1);
  }
};

run();
