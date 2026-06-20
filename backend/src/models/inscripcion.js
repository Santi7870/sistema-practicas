const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inscripcion = sequelize.define(
  'Inscripcion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    estudianteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'estudiante_id',
      references: {
        model: 'estudiantes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    convenioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'convenio_id',
      references: {
        model: 'convenios',
        key: 'id',
      },
    },
    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tutor_id',
      references: {
        model: 'docentes',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    paraleloId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'paralelo_id',
      references: {
        model: 'paralelos',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    tipoPractica: {
      type: DataTypes.ENUM('laboral', 'comunitaria'),
      allowNull: false,
      defaultValue: 'laboral',
      field: 'tipo_practica',
    },
    estadoInscripcion: {
      type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
      allowNull: false,
      defaultValue: 'pendiente',
      field: 'estado_inscripcion',
    },
    activa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'activa',
    },
    comentarioAdmin: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentario_admin',
    },
    fechaInscripcion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_inscripcion',
    },
    fechaAprobacion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_aprobacion',
    },
    fechaLimiteDocumentos: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_limite_documentos',
    },
    estadoDocumentosRequisitos: {
      type: DataTypes.ENUM('pendiente_entrega', 'en_revision', 'rechazado', 'aprobado'),
      allowNull: false,
      defaultValue: 'pendiente_entrega',
      field: 'estado_documentos_requisitos',
    },
  },
  {
    tableName: 'inscripciones',
    timestamps: true,
    underscored: true,
    hooks: {
      afterCreate: async (inscripcion, options) => {
        if (!inscripcion.activa) return;
        const Ciclo = sequelize.models.Ciclo;
        if (!Ciclo) return;
        for (const numeroCiclo of [1, 2, 3]) {
          await Ciclo.findOrCreate({
            where: { inscripcionId: inscripcion.id, numeroCiclo },
            defaults: { promedioCiclo: null },
            transaction: options.transaction,
          });
        }
      },
      afterUpdate: async (inscripcion, options) => {
        if (!inscripcion.activa) return;
        const Ciclo = sequelize.models.Ciclo;
        if (!Ciclo) return;
        for (const numeroCiclo of [1, 2, 3]) {
          await Ciclo.findOrCreate({
            where: { inscripcionId: inscripcion.id, numeroCiclo },
            defaults: { promedioCiclo: null },
            transaction: options.transaction,
          });
        }
      },
    },
  }
);

module.exports = Inscripcion;
