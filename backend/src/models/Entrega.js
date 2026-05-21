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
      allowNull: false,
      field: 'nombre_archivo',
    },
    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'ruta_archivo',
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
  },
  {
    tableName: 'entregas',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Entrega;
