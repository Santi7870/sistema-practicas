const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Docente = sequelize.define(
  'Docente',
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
      allowNull: false,
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tipoTutor: {
      type: DataTypes.ENUM('comunales', 'laborales', 'ambas'),
      allowNull: false,
      defaultValue: 'ambas',
      field: 'tipo_tutor',
    },
  },
  {
    tableName: 'docentes',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Docente;
