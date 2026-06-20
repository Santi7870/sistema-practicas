const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FormatoDocumento = sequelize.define(
  'FormatoDocumento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nombreArchivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'nombre_archivo',
    },
    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'ruta_archivo',
    },
    docenteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'docente_id',
      references: {
        model: 'docentes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'formatos_documentos',
    timestamps: true,
    underscored: true,
  }
);

module.exports = FormatoDocumento;
