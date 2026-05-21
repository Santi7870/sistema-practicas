const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define(
  'Usuario',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        isEspochEmail(value) {
          if (!value.endsWith('@espoch.edu.ec')) {
            throw new Error('El email debe ser institucional (@espoch.edu.ec)');
          }
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM('admin', 'estudiante', 'docente'),
      allowNull: false,
      defaultValue: 'estudiante',
    },
    debeCambiarPassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'debe_cambiar_password',
    },
    estadoCuenta: {
      type: DataTypes.ENUM('pendiente', 'activo', 'rechazado', 'inactivo'),
      allowNull: false,
      defaultValue: 'pendiente',
      field: 'estado_cuenta',
    },
  },
  {
    tableName: 'usuarios',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (usuario) => {
        if (usuario.password) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
      beforeUpdate: async (usuario) => {
        if (usuario.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
    },
  }
);
 
// Método de instancia para comparar contraseñas
Usuario.prototype.compararPassword = async function (passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

module.exports = Usuario;