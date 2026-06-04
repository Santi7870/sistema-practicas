const { sequelize, Estudiante, Usuario } = require('../src/models');
const { ESTADOS_CUENTA } = require('../src/utils/constants');
require('dotenv').config();

async function verificarCoincidenciaEstudiantes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos para verificación de conteos.');

    // 1. Conteo del Dashboard (obtenerEstadisticas)
    const includeUsuarioActivo = [
      {
        model: Usuario,
        as: 'usuario',
        where: { estadoCuenta: ESTADOS_CUENTA.ACTIVO },
      },
    ];

    const totalEstudiantesDashboard = await Estudiante.count({
      include: includeUsuarioActivo,
    });

    // 2. Conteo del listado general (obtenerEstudiantes)
    const whereUsuarioListado = { rol: 'estudiante', estadoCuenta: ESTADOS_CUENTA.ACTIVO };
    const estudiantesListado = await Estudiante.findAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          where: whereUsuarioListado,
        },
      ],
    });

    const totalEstudiantesListado = estudiantesListado.length;

    console.log(`\n--- RESULTADOS DE VALIDACIÓN ---`);
    console.log(`Conteo en Dashboard (Estudiantes Activos): ${totalEstudiantesDashboard}`);
    console.log(`Estudiantes devueltos por listado general: ${totalEstudiantesListado}`);
    
    if (totalEstudiantesDashboard === totalEstudiantesListado) {
      console.log('✅ ÉXITO: Los conteos coinciden exactamente bajo el mismo criterio de cuentas activas.');
      await sequelize.close();
      process.exit(0);
    } else {
      console.error('❌ ERROR: Los conteos NO coinciden. Revisar filtros en adminController.');
      await sequelize.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Ocurrió un error durante la verificación:', error);
    process.exit(1);
  }
}

verificarCoincidenciaEstudiantes();
