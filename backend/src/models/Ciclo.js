const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ciclo = sequelize.define(
  'Ciclo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inscripcionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'inscripcion_id',
      references: {
        model: 'inscripciones',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    numeroCiclo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'numero_ciclo',
      validate: {
        isIn: [[1, 2, 3]],
      },
    },
    promedioCiclo: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'promedio_ciclo',
    },
  },
  {
    tableName: 'ciclos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['inscripcion_id', 'numero_ciclo'],
      },
    ],
  }
);

module.exports = Ciclo;
