const app = require('./src/app');
const sequelize = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const DB_SYNC_ENABLED =
  process.env.DB_SYNC === 'true' ||
  process.env.DB_SYNC === '1' ||
  process.env.NODE_ENV === 'development';

// Probar conexión a la base de datos y sincronizar modelos
const startServer = async () => {
  try {
    // Autenticar conexión con la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');

    // Sincronizar modelos (en desarrollo)
    // NOTA: En producción usar migraciones
    if (DB_SYNC_ENABLED) {
      // Sincronización segura de tipos ENUM de PostgreSQL antes de sincronizar modelos
      try {
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t 
              JOIN pg_enum e ON t.oid = e.enumtypid 
              WHERE t.typname = 'enum_usuarios_rol' AND e.enumlabel = 'docente'
            ) THEN
              ALTER TYPE "enum_usuarios_rol" ADD VALUE 'docente';
            END IF;
          END
          $$;
        `);
        console.log('✅ Tipo ENUM "enum_usuarios_rol" actualizado con el rol "docente".');
      } catch (enumError) {
        console.log('ℹ️ Tipo ENUM "enum_usuarios_rol" ya cuenta con el rol "docente" o se manejará automáticamente.');
      }

      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos.');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err);
  process.exit(1);
});
