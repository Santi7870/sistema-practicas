const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Documento = sequelize.define(
  'Documento',
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
    fase: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isIn: [[1, 2, 3, 4]],
      },
    },
    tipoDocumento: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'tipo_documento',
      validate: {
        isIn: [
          [
            'Oficio de practicas',
            'Anexo A',
            'Respuesta de la empresa',
            'Certificado de practicas realizadas',
            'Requisito 1',
            'Requisito 2',
          ],
        ],
      },
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
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    comentarioAdmin: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentario_admin',
    },
    fechaSubida: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_subida',
    },
    fechaRevision: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_revision',
    },
  },
  {
    tableName: 'documentos',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Documento;