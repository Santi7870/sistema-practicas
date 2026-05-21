const { ROLES } = require('../utils/constants');

// Middleware para verificar si el usuario es administrador
const esAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === ROLES.ADMIN) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
  }
};

// Middleware para verificar si el usuario es estudiante
const esEstudiante = (req, res, next) => {
  if (req.usuario && req.usuario.rol === ROLES.ESTUDIANTE) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo estudiantes pueden acceder.',
    });
  }
};

module.exports = {
  esAdmin,
  esEstudiante,
};