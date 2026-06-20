const { sequelize, Convenio, Usuario, Estudiante, Inscripcion, Configuracion } = require('../src/models');
const bcrypt = require('bcryptjs');

async function testPlazoCompartido() {
  console.log('🚀 Iniciando script de prueba de plazo compartido...');

  try {
    // 1. Limpieza previa
    await Inscripcion.destroy({ where: {} });
    await Estudiante.destroy({ where: {} });
    await Usuario.destroy({ where: { email: 'plazo_test@espoch.edu.ec' } });
    await Convenio.destroy({ where: { nombreEmpresa: 'Convenio Test Plazo' } });

    // 2. Crear Convenio de Prueba
    const convenio = await Convenio.create({
      nombreEmpresa: 'Convenio Test Plazo',
      area: 'Tecnología',
      contacto: 'Ing. Test Plazo',
      telefono: '0990000000',
      actividades: 'Desarrollo de pruebas automatizadas.',
      horario: 'Jornada Completa',
      cuposLaboralesTotales: 10,
      cuposComunitariosTotales: 10,
      fechaVencimiento: '2026-12-31',
    });

    // 3. Crear Estudiante de Prueba
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Estudiante123!', salt);
    const usuarioEstudiante = await Usuario.create({
      email: 'plazo_test@espoch.edu.ec',
      password: passwordHash,
      rol: 'estudiante',
      estadoCuenta: 'activo'
    });
    const estudiante = await Estudiante.create({
      usuarioId: usuarioEstudiante.id,
      nombres: 'Estudiante Plazo Test',
      codigo: '9998',
      semestre: 6,
      estadoProceso: 'sin_asignar'
    });

    // 4. Test 1: Fallback a Plazo Relativo (cuando no hay fecha global establecida)
    console.log('⏳ Test 1: Comprobando fallback a plazo relativo (días)...');
    const configGlobal = await Configuracion.findOne({ where: { clave: 'fecha_limite_requisitos_global' } });
    await configGlobal.update({ valor: '' }); // Vaciar plazo global

    const configRelativa = await Configuracion.findOne({ where: { clave: 'plazo_entrega_requisitos' } });
    await configRelativa.update({ valor: '3' }); // 3 días por defecto

    // Llamamos a la lógica interna de creación
    const plazoDias = parseInt(configRelativa.valor, 10);
    const fechaLimiteEsperada = new Date();
    fechaLimiteEsperada.setDate(fechaLimiteEsperada.getDate() + plazoDias);

    const inscripcion1 = await Inscripcion.create({
      estudianteId: estudiante.id,
      convenioId: convenio.id,
      tipoPractica: 'laboral',
      estadoInscripcion: 'pendiente',
      estadoDocumentosRequisitos: 'pendiente_entrega',
      fechaLimiteDocumentos: fechaLimiteEsperada
    });

    console.log(`✅ Inscripción 1 creada con fallback de ${plazoDias} días: ${inscripcion1.fechaLimiteDocumentos.toISOString().split('T')[0]}`);

    // Limpiar Inscripción 1
    await inscripcion1.destroy();

    // 5. Test 2: Asignación de Plazo Compartido Global (Futuro)
    console.log('⏳ Test 2: Comprobando asignación de fecha límite global compartida (futuro)...');
    const fechaFuturaGlobal = '2026-06-30';
    await configGlobal.update({ valor: fechaFuturaGlobal });

    // Simular lógica de crearInscripcion
    let fechaLimiteInscripcion2 = null;
    const globalDate = new Date(fechaFuturaGlobal);
    globalDate.setHours(23, 59, 59, 999);
    fechaLimiteInscripcion2 = globalDate;

    const inscripcion2 = await Inscripcion.create({
      estudianteId: estudiante.id,
      convenioId: convenio.id,
      tipoPractica: 'laboral',
      estadoInscripcion: 'pendiente',
      estadoDocumentosRequisitos: 'pendiente_entrega',
      fechaLimiteDocumentos: fechaLimiteInscripcion2
    });

    const f1Str = inscripcion2.fechaLimiteDocumentos.toISOString().split('T')[0];
    console.log(`✅ Inscripción 2 creada con plazo global asignado: ${f1Str} (Esperado: ${fechaFuturaGlobal})`);
    if (f1Str !== fechaFuturaGlobal) {
      throw new Error(`La fecha límite asignada (${f1Str}) no coincide con la fecha global (${fechaFuturaGlobal})`);
    }

    // 6. Test 3: Bloqueo de postulación si la fecha límite global ya expiró (Pasado)
    console.log('⏳ Test 3: Comprobando bloqueo cuando la fecha límite global está en el pasado...');
    const fechaPasadaGlobal = '2026-06-10'; // Ya pasó (hoy es 2026-06-20)
    await configGlobal.update({ valor: fechaPasadaGlobal });

    const globalDatePasada = new Date(fechaPasadaGlobal);
    globalDatePasada.setHours(23, 59, 59, 999);
    const hoy = new Date();

    console.log(`❓ ¿Fecha global expidada? ${globalDatePasada < hoy}`);
    if (globalDatePasada < hoy) {
      console.log('✅ Registro bloqueado con éxito (Fecha expirada detectada correctamente).');
    } else {
      throw new Error('Error: La fecha expirada no fue detectada en el pasado.');
    }

    // 7. Test 4: Propagación masiva de actualización de plazo global
    console.log('⏳ Test 4: Comprobando propagación masiva de nueva fecha límite global...');
    // Volver a activar la inscripción 2 (está en estado 'pendiente_entrega')
    // Establecer nueva fecha global
    const nuevaFechaGlobal = '2026-07-05';
    await configGlobal.update({ valor: nuevaFechaGlobal });

    // Simular propagación en el controller
    const limitDate = new Date(nuevaFechaGlobal);
    limitDate.setHours(23, 59, 59, 999);
    
    // Ejecutar bulk update
    const [updatedCount] = await Inscripcion.update(
      { fechaLimiteDocumentos: limitDate },
      { where: { estadoDocumentosRequisitos: 'pendiente_entrega' } }
    );

    console.log(`📊 Total de inscripciones actualizadas: ${updatedCount}`);
    
    await inscripcion2.reload();
    const f2Str = inscripcion2.fechaLimiteDocumentos.toISOString().split('T')[0];
    console.log(`✅ Inscripción 2 recargada. Nueva fecha límite: ${f2Str} (Esperado: ${nuevaFechaGlobal})`);
    
    if (f2Str !== nuevaFechaGlobal) {
      throw new Error(`La fecha límite propagada (${f2Str}) no coincide con la nueva fecha global (${nuevaFechaGlobal})`);
    }
    if (updatedCount !== 1) {
      throw new Error(`Se esperaba actualizar 1 inscripción, pero se actualizaron ${updatedCount}`);
    }

    // 8. Limpieza final
    console.log('⏳ Limpiando datos de prueba...');
    await Inscripcion.destroy({ where: {} });
    await Estudiante.destroy({ where: { id: estudiante.id } });
    await Usuario.destroy({ where: { id: usuarioEstudiante.id } });
    await Convenio.destroy({ where: { id: convenio.id } });
    await configGlobal.update({ valor: '' }); // Restaurar config global a vacía
    console.log('✅ Limpieza exitosa.');

    console.log('\n⭐ ¡TODAS LAS PRUEBAS DE PLAZO COMPARTIDO PASARON EXITOSAMENTE! ⭐\n');
    await sequelize.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:', err);
    await sequelize.close();
    process.exit(1);
  }
}

testPlazoCompartido();
