const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notificacion = sequelize.define(
  'Notificacion',
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
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [
          [
            'registro',
            'aprobacion',
            'rechazo',
            'documento_subido',
            'documento_revisado',
            'cambio_estado',
            'sistema',
          ],
        ],
      },
    },
    leida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    enlace: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'notificaciones',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Notificacion;