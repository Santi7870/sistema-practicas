const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Entrega = sequelize.define(
  'Entrega',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tareaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tarea_id',
      references: {
        model: 'tareas',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    nombreArchivo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'nombre_archivo',
    },
    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'ruta_archivo',
    },
    nombreArchivoInterno: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'nombre_archivo_interno',
    },
    rutaArchivoInterno: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'ruta_archivo_interno',
    },
    nombreArchivoExterno: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'nombre_archivo_externo',
    },
    rutaArchivoExterno: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'ruta_archivo_externo',
    },
    notaInterno: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'nota_interno',
    },
    notaExterno: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'nota_externo',
    },
    comentarioInterno: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentario_interno',
    },
    comentarioExterno: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentario_externo',
    },
    nota: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    comentarioDocente: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentario_docente',
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'calificada', 'tarde'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    fechaEntrega: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_entrega',
    },
    fechaCalificacion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_calificacion',
    },
    historial: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'entregas',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Entrega;
