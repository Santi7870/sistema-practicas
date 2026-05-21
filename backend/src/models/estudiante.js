const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Estudiante = sequelize.define(
  'Estudiante',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'usuario_id',
      unique: true,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    nombres: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    codigo: {
      type: DataTypes.STRING(4),
      allowNull: true,
      unique: true,
      validate: {
        len: [4, 4],
        isNumeric: true,
      },
    },
    semestre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 8,
      },
    },
    estadoProceso: {
      type: DataTypes.ENUM(
        'sin_asignar',
        'asignado',
        'pendiente_inicio',
        'en_proceso',
        'finalizado'
      ),
      allowNull: false,
      defaultValue: 'sin_asignar',
      field: 'estado_proceso',
    },
  },
  {
    tableName: 'estudiantes',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Estudiante;