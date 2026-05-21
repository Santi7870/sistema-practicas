const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Convenio = sequelize.define(
  'Convenio',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombreEmpresa: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'nombre_empresa',
    },
    area: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    contacto: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    actividades: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    horario: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    cuposLaboralesTotales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_laborales_totales',
      validate: {
        min: 0,
      },
    },
    cuposLaboralesOcupados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_laborales_ocupados',
      validate: {
        min: 0,
      },
    },
    cuposComunitariosTotales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_comunitarios_totales',
      validate: {
        min: 0,
      },
    },
    cuposComunitariosOcupados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_comunitarios_ocupados',
      validate: {
        min: 0,
      },
    },
    cuposTotales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_totales',
      validate: {
        min: 0,
      },
    },
    cuposOcupados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cupos_ocupados',
      validate: {
        min: 0,
      },
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'convenios',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: (convenio) => {
        convenio.cuposTotales = (convenio.cuposLaboralesTotales || 0) + (convenio.cuposComunitariosTotales || 0);
        convenio.cuposOcupados = (convenio.cuposLaboralesOcupados || 0) + (convenio.cuposComunitariosOcupados || 0);
      },
    },
  }
);

// Método personalizado para verificar disponibilidad general
Convenio.prototype.tieneDisponibilidad = function () {
  return this.cuposOcupados < this.cuposTotales;
};

// Método personalizado para verificar disponibilidad por tipo de práctica
Convenio.prototype.tieneDisponibilidadPorTipo = function (tipo) {
  if (tipo === 'laboral') {
    return this.cuposLaboralesOcupados < this.cuposLaboralesTotales;
  } else if (tipo === 'comunitaria') {
    return this.cuposComunitariosOcupados < this.cuposComunitariosTotales;
  }
  return false;
};

module.exports = Convenio;