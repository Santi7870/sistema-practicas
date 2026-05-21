const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Verificar token JWT
const verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
      });
    }

    // Extraer el token
    const token = authHeader.split(' ')[1];

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar estado de la cuenta
    if (usuario.estadoCuenta !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'Cuenta inactiva o bloqueada',
      });
    }

    // Adjuntar usuario a la petición
    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al verificar autenticación',
      error: error.message,
    });
  }
};

// Verificar que el usuario sea administrador
const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
  }
  next();
};

// Verificar que el usuario sea estudiante
const esEstudiante = (req, res, next) => {
  if (req.usuario.rol !== 'estudiante') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo estudiantes.',
    });
  }
  next();
};

// Verificar que el usuario sea docente
const esDocente = (req, res, next) => {
  if (req.usuario.rol !== 'docente') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo docentes.',
    });
  }
  next();
};

module.exports = {
  verificarToken,
  esAdmin,
  esEstudiante,
  esDocente,
};