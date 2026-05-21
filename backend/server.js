const app = require('./src/app');
const sequelize = require('./src/config/database');
const { Usuario } = require('./src/models');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const DB_SYNC_ENABLED =
  process.env.DB_SYNC === 'true' ||
  process.env.DB_SYNC === '1' ||
  process.env.NODE_ENV === 'development';

const ADMIN_BOOTSTRAP_ENABLED =
  process.env.ADMIN_BOOTSTRAP_ENABLED === 'true' ||
  process.env.ADMIN_BOOTSTRAP_ENABLED === '1';

const bootstrapAdmin = async () => {
  if (!ADMIN_BOOTSTRAP_ENABLED) return;

  const email = (process.env.ADMIN_EMAIL || 'admin@espoch.edu.ec').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.log('ADMIN_BOOTSTRAP_ENABLED activo, pero falta ADMIN_PASSWORD. Se omite bootstrap de admin.');
    return;
  }

  const [admin, created] = await Usuario.findOrCreate({
    where: { email },
    defaults: {
      email,
      password, // se hashea por hook beforeCreate
      rol: 'admin',
      estadoCuenta: 'activo',
      debeCambiarPassword: false,
    },
  });

  if (!created) {
    admin.password = password; // se hashea por hook beforeUpdate
    admin.rol = 'admin';
    admin.estadoCuenta = 'activo';
    admin.debeCambiarPassword = false;
    await admin.save();
    console.log(`Admin actualizado: ${email}`);
  } else {
    console.log(`Admin creado: ${email}`);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexion a PostgreSQL establecida correctamente.');

    if (DB_SYNC_ENABLED) {
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
        console.log('Tipo ENUM "enum_usuarios_rol" actualizado con el rol "docente".');
      } catch (enumError) {
        console.log('El ENUM "enum_usuarios_rol" ya contiene "docente" o se gestionara automaticamente.');
      }

      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados con la base de datos.');
    }

    await bootstrapAdmin();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
  process.exit(1);
});
