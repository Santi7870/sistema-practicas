const { Sequelize } = require('sequelize');
require('dotenv').config();

const sslEnabled = ['true', '1', 'require'].includes(
  String(process.env.DB_SSL || '').toLowerCase()
);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    ...(sslEnabled
      ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
      : {}),
    pool: {
      max: 5,
      min: 1,        // mantiene 1 conexión viva → evita overhead de reconexión
      acquire: 30000,
      idle: 10000,
    },
    timezone: '-05:00', // Ecuador timezone
  }
);

module.exports = sequelize;
