const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Configuracion = sequelize.define(
  'Configuracion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clave: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    valor: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'configuraciones',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Configuracion;
