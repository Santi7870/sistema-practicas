const { sequelize, Convenio, Usuario, Estudiante, Inscripcion } = require('../src/models');
const bcrypt = require('bcryptjs');

async function testDatabaseChanges() {
  console.log('🚀 Iniciando script de prueba de base de datos...');

  try {
    // 1. Sincronizar modelos
    console.log('⏳ Sincronizando modelos con alter: true...');
    await sequelize.sync({ alter: true });
    console.log('✅ Sincronización completada.');

    // Limpieza previa si existe
    await Inscripcion.destroy({ where: {} });
    await Estudiante.destroy({ where: {} });
    await Usuario.destroy({ where: { email: 'estudiante_prueba@espoch.edu.ec' } });
    await Convenio.destroy({ where: { nombreEmpresa: 'Empresa de Prueba S.A.' } });

    // 2. Crear Convenio de Prueba
    console.log('⏳ Creando convenio de prueba con 1 plaza laboral y 2 comunitarias...');
    const convenio = await Convenio.create({
      nombreEmpresa: 'Empresa de Prueba S.A.',
      area: 'Tecnología',
      contacto: 'Lic. Juan Pérez',
      telefono: '0991234567',
      actividades: 'Desarrollo de microservicios y maquetado de interfaces.',
      horario: 'Jornada Parcial (08:00 - 12:00)',
      cuposLaboralesTotales: 1,
      cuposComunitariosTotales: 2,
      fechaVencimiento: '2026-12-31',
    });

    console.log(`✅ Convenio creado exitosamente: "${convenio.nombreEmpresa}"`);
    console.log(`📊 Plazas Laborales Totales: ${convenio.cuposLaboralesTotales} | Comunitarias: ${convenio.cuposComunitariosTotales}`);
    console.log(`📊 Plazas Totales Calculadas por Hook: ${convenio.cuposTotales} (Esperado: 3)`);

    if (convenio.cuposTotales !== 3) {
      throw new Error(`❌ Error de validación: cuposTotales debería ser 3, pero es ${convenio.cuposTotales}`);
    }

    // 3. Crear Usuario Estudiante de Prueba
    console.log('⏳ Creando usuario estudiante de prueba...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Estudiante123!', salt);
    
    const usuarioEstudiante = await Usuario.create({
      email: 'estudiante_prueba@espoch.edu.ec',
      password: passwordHash,
      rol: 'estudiante',
      estadoCuenta: 'activo'
    });

    const estudiante = await Estudiante.create({
      usuarioId: usuarioEstudiante.id,
      nombres: 'Estudiante de Prueba',
      codigo: '9999',
      semestre: 6,
      estadoProceso: 'sin_asignar'
    });
    console.log(`✅ Estudiante de prueba creado: ${estudiante.nombres} (Código: ${estudiante.codigo})`);

    // 4. Test Inscripción Laboral
    console.log('⏳ Probando creación de inscripción laboral...');
    
    // Validar disponibilidad
    const tieneCupoLaboral = convenio.tieneDisponibilidadPorTipo('laboral');
    console.log(`❓ ¿Tiene disponibilidad laboral? ${tieneCupoLaboral}`);
    
    if (!tieneCupoLaboral) {
      throw new Error('❌ Error: El convenio debería tener disponibilidad laboral.');
    }

    // Crear la inscripción
    const inscripcion = await Inscripcion.create({
      estudianteId: estudiante.id,
      convenioId: convenio.id,
      tipoPractica: 'laboral',
      estadoInscripcion: 'pendiente'
    });

    // Incrementar cupos manualmente tal como lo hace el controller
    convenio.cuposLaboralesOcupados += 1;
    await convenio.save();

    console.log('✅ Inscripción laboral creada y cupos incrementados.');
    console.log(`📊 Cupos Laborales Ocupados: ${convenio.cuposLaboralesOcupados} / ${convenio.cuposLaboralesTotales}`);
    console.log(`📊 Cupos Comunitarios Ocupados: ${convenio.cuposComunitariosOcupados} / ${convenio.cuposComunitariosTotales}`);
    console.log(`📊 Cupos Totales Ocupados (Hook): ${convenio.cuposOcupados}`);

    if (convenio.cuposLaboralesOcupados !== 1 || convenio.cuposOcupados !== 1) {
      throw new Error('❌ Error: Los contadores de cupos no coinciden tras la inscripción laboral.');
    }

    // 5. Test límite de inscripción laboral
    console.log('⏳ Probando validación de límite laboral (debería denegar cupo)...');
    await convenio.reload();
    const tieneMasCupoLaboral = convenio.tieneDisponibilidadPorTipo('laboral');
    console.log(`❓ ¿Tiene más disponibilidad laboral? ${tieneMasCupoLaboral}`);

    if (tieneMasCupoLaboral) {
      throw new Error('❌ Error: El convenio NO debería tener disponibilidad laboral ya que el límite es 1 y ya está ocupado.');
    }
    console.log('✅ Validación de límite laboral funciona correctamente.');

    // 6. Test Liberación de Cupo (Rechazar / Eliminar)
    console.log('⏳ Probando liberación de cupo (simulando rechazo)...');
    if (inscripcion.tipoPractica === 'laboral') {
      convenio.cuposLaboralesOcupados = Math.max(0, convenio.cuposLaboralesOcupados - 1);
    } else {
      convenio.cuposComunitariosOcupados = Math.max(0, convenio.cuposComunitariosOcupados - 1);
    }
    await convenio.save();
    await inscripcion.destroy();

    console.log('✅ Inscripción eliminada y cupo liberado.');
    console.log(`📊 Cupos Laborales Ocupados: ${convenio.cuposLaboralesOcupados} / ${convenio.cuposLaboralesTotales}`);
    console.log(`📊 Cupos Totales Ocupados (Hook): ${convenio.cuposOcupados}`);

    if (convenio.cuposLaboralesOcupados !== 0 || convenio.cuposOcupados !== 0) {
      throw new Error('❌ Error: El cupo laboral no se liberó correctamente.');
    }

    // 7. Limpieza final de prueba
    console.log('⏳ Limpiando datos de prueba de la DB...');
    await Estudiante.destroy({ where: { id: estudiante.id } });
    await Usuario.destroy({ where: { id: usuarioEstudiante.id } });
    await Convenio.destroy({ where: { id: convenio.id } });
    console.log('✅ Limpieza final exitosa.');

    console.log('\n⭐ ¡TODAS LAS PRUEBAS DE LA BASE DE DATOS PASARON EXITOSAMENTE! ⭐\n');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:', error);
    await sequelize.close();
    process.exit(1);
  }
}

testDatabaseChanges();
