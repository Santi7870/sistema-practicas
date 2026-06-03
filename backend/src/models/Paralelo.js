const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Paralelo = sequelize.define(
  'Paralelo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'),
      allowNull: false,
    },
    tipoPractica: {
      type: DataTypes.ENUM('laboral', 'comunitaria'),
      allowNull: false,
      field: 'tipo_practica',
    },
    docenteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'docente_id',
      references: {
        model: 'docentes',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'paralelos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['nombre', 'tipo_practica'],
      },
    ],
  }
);

module.exports = Paralelo;
