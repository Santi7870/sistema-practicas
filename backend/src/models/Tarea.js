const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tarea = sequelize.define(
  'Tarea',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    docenteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'docente_id',
      references: {
        model: 'docentes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tipoPractica: {
      type: DataTypes.ENUM('laboral', 'comunitaria'),
      allowNull: false,
      field: 'tipo_practica',
    },
    numeroCiclo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'numero_ciclo',
      validate: {
        isIn: [[1, 2, 3]],
      },
    },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    titulo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    puntajeMaximo: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10.00,
      field: 'puntaje_maximo',
    },
    fechaApertura: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_apertura',
    },
    fechaCierre: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_cierre',
    },
    activa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    templatePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'template_path',
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'template_name',
    },
    templateMime: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'template_mime',
    },
  },
  {
    tableName: 'tareas',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Tarea;
