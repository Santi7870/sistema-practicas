const bcrypt = require('bcryptjs');
const { sequelize, Usuario } = require('../src/models');
require('dotenv').config();

async function crearAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');

    const passwordTemporal = 'Admin123!';
    const hash = await bcrypt.hash(passwordTemporal, 10);

    const [admin, created] = await Usuario.findOrCreate({
      where: { email: 'admin@espoch.edu.ec' },
      defaults: {
        email: 'admin@espoch.edu.ec',
        password: hash,
        rol: 'admin',
        estadoCuenta: 'activo',
      },
    });

    if (!created) {
      admin.password = hash;
      admin.rol = 'admin';
      admin.estadoCuenta = 'activo';
      await admin.save();
      console.log('Usuario administrador existente actualizado.');
    } else {
      console.log('Usuario administrador creado exitosamente.');
    }

    console.log('Email: admin@espoch.edu.ec');
    console.log(`Password temporal: ${passwordTemporal}`);
    console.log('IMPORTANTE: cambia la contrasena despues del primer login.');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

crearAdmin();
