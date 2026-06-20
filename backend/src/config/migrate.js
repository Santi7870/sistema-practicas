const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  console.log('🔄 Iniciando migración de base de datos...');
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida.');

    // 1. Agregar columnas a "inscripciones"
    await sequelize.query(`
      ALTER TABLE "inscripciones" 
      ADD COLUMN IF NOT EXISTS "fecha_limite_documentos" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "estado_documentos_requisitos" VARCHAR(50) DEFAULT 'pendiente_entrega';
    `).catch(err => console.log('Info: Columnas en inscripciones ya existen o error:', err.message));

    // 2. Agregar columnas a "convenios"
    await sequelize.query(`
      ALTER TABLE "convenios" 
      ADD COLUMN IF NOT EXISTS "fecha_vencimiento" DATE,
      ADD COLUMN IF NOT EXISTS "fecha_limite_requisitos" DATE;
    `).catch(err => console.log('Info: Columnas en convenios ya existen o error:', err.message));

    // 3. Crear tabla "configuraciones" si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "configuraciones" (
        "id" SERIAL PRIMARY KEY,
        "clave" VARCHAR(100) UNIQUE NOT NULL,
        "valor" VARCHAR(255) NOT NULL,
        "descripcion" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "configuraciones" verificada/creada.');

    // 4. Insertar valor por defecto en configuraciones
    await sequelize.query(`
      INSERT INTO "configuraciones" ("clave", "valor", "descripcion", "created_at", "updated_at")
      VALUES (
        'plazo_entrega_requisitos', 
        '3', 
        'Plazo por defecto (en días) para que el estudiante entregue los dos documentos de requisitos de inscripción',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("clave") DO NOTHING;
    `);
    console.log('✅ Configuración inicial de plazo_entrega_requisitos insertada.');

    await sequelize.query(`
      INSERT INTO "configuraciones" ("clave", "valor", "descripcion", "created_at", "updated_at")
      VALUES (
        'fecha_limite_requisitos_global', 
        '', 
        'Fecha límite calendarizada global para la entrega de requisitos de la Fase 1 (formato YYYY-MM-DD)',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("clave") DO NOTHING;
    `);
    console.log('✅ Configuración inicial de fecha_limite_requisitos_global insertada.');

    // 5. Ajustar restricciones de la tabla "documentos" (Fase 1 y nuevos tipos de documentos)
    // Primero, busquemos el nombre de la restricción check de fase y tipo_documento para eliminarlas de forma segura.
    const constraints = await sequelize.query(`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE conrelid = 'documentos'::regclass;
    `, { type: QueryTypes.SELECT });

    console.log('Restricciones encontradas en tabla "documentos":', constraints);

    // Buscar nombres de restricciones check para fase y tipo_documento
    for (const c of constraints) {
      if (c.pg_get_constraintdef.includes('fase')) {
        console.log(`Dropping constraint: ${c.conname}`);
        await sequelize.query(`ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "${c.conname}"`);
      }
      if (c.pg_get_constraintdef.includes('tipo_documento')) {
        console.log(`Dropping constraint: ${c.conname}`);
        await sequelize.query(`ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "${c.conname}"`);
      }
    }

    // Re-crear las restricciones de documentos con Fase 1 y Requisito 1/2
    await sequelize.query(`
      ALTER TABLE "documentos" 
      ADD CONSTRAINT "check_fase" CHECK (fase IN (1, 2, 3, 4)),
      ADD CONSTRAINT "check_tipo_documento" CHECK (
        tipo_documento IN (
          'Oficio de practicas',
          'Anexo A',
          'Respuesta de la empresa',
          'Certificado de practicas realizadas',
          'Requisito 1',
          'Requisito 2'
        )
      );
    `);
    console.log('✅ Restricciones de fase y tipo_documento actualizadas con éxito.');
    console.log('🎉 Migración completada con éxito.');

  } catch (error) {
    console.error('❌ Error durante la migración de base de datos:', error);
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0));
}
