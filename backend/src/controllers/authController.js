const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario, Estudiante, Docente } = require('../models');
const { crearNotificacion } = require('../utils/notificaciones');

// Registrar nuevo estudiante
const register = async (req, res) => {
  try {
    let { email, password, confirmPassword } = req.body;

    // Validaciones
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos',
      });
    }

    email = email.trim().toLowerCase();

    // Validar formato de email institucional
    if (!email.endsWith('@espoch.edu.ec')) {
      return res.status(400).json({
        success: false,
        message: 'Debes usar tu correo institucional (@espoch.edu.ec)',
      });
    }

    // Validar contraseñas coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden',
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      });
    }

    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Este correo ya está registrado',
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con estado pendiente
    const nuevoUsuario = await Usuario.create({
      email,
      password,
      rol: 'estudiante',
      estadoCuenta: 'pendiente',
    });

    // Crear registro de estudiante asociado
    await Estudiante.create({
      usuarioId: nuevoUsuario.id,
      estadoProceso: 'sin_asignar',
    });

    // Notificar a todos los administradores
    const admins = await Usuario.findAll({ where: { rol: 'admin' } });
    for (const admin of admins) {
      await crearNotificacion(
        admin.id,
        'registro',
        'Nuevo registro pendiente',
        `El estudiante ${email} ha solicitado registro en el sistema.`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Tu cuenta será revisada por un administrador.',
    });
  } catch (error) {
    console.error('❌ Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message,
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos',
      });
    }

    email = email.trim().toLowerCase();

    // Buscar usuario con su estudiante o docente asociado
    const usuarioEncontrado = await Usuario.findOne({
      where: { email },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
        },
        {
          model: Docente,
          as: 'docente',
        },
      ],
    });

    if (!usuarioEncontrado) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuarioEncontrado.password);
    console.log('PASSWORD VALIDO:', passwordValido);

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Verificar estado de la cuenta
    if (usuarioEncontrado.estadoCuenta === 'pendiente') {
      return res.status(403).json({
        success: false,
        message:
          'Tu cuenta está pendiente de aprobación. Por favor espera a que un administrador revise tu solicitud.',
      });
    }

    if (usuarioEncontrado.estadoCuenta === 'rechazado') {
      return res.status(403).json({
        success: false,
        message:
          'Tu cuenta ha sido rechazada. Por favor contacta al administrador para más información.',
      });
    }

    if (usuarioEncontrado.estadoCuenta === 'inactivo') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está inactiva. Por favor contacta al administrador.',
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: usuarioEncontrado.id,
        email: usuarioEncontrado.email,
        rol: usuarioEncontrado.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Preparar datos del usuario para la respuesta
    const usuarioRespuesta = {
      id: usuarioEncontrado.id,
      email: usuarioEncontrado.email,
      rol: usuarioEncontrado.rol,
      estadoCuenta: usuarioEncontrado.estadoCuenta,
      debeCambiarPassword: usuarioEncontrado.debeCambiarPassword,
      nombres: usuarioEncontrado.nombres,
    };

    // Preparar datos del estudiante si existe
    let estudianteRespuesta = null;
    if (usuarioEncontrado.estudiante) {
      estudianteRespuesta = {
        id: usuarioEncontrado.estudiante.id,
        nombres: usuarioEncontrado.estudiante.nombres,
        codigo: usuarioEncontrado.estudiante.codigo,
        semestre: usuarioEncontrado.estudiante.semestre,
        estadoProceso: usuarioEncontrado.estudiante.estadoProceso,
      };
    }

    // Preparar datos del docente si existe
    let docenteRespuesta = null;
    if (usuarioEncontrado.docente) {
      docenteRespuesta = {
        id: usuarioEncontrado.docente.id,
        nombres: usuarioEncontrado.docente.nombres,
        departamento: usuarioEncontrado.docente.departamento,
        tipoTutor: usuarioEncontrado.docente.tipoTutor,
      };
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        usuario: usuarioRespuesta,
        estudiante: estudianteRespuesta,
        docente: docenteRespuesta,
      },
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message,
    });
  }
};

// Obtener perfil del usuario actual
const getMe = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const usuarioEncontrado = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
        },
        {
          model: Docente,
          as: 'docente',
        },
      ],
    });

    if (!usuarioEncontrado) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: usuarioEncontrado,
    });
  } catch (error) {
    console.error('❌ Error en getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message,
    });
  }
};

// Logout (opcional - el token se maneja en el cliente)
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout exitoso',
    });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión',
      error: error.message,
    });
  }
};

// Cambiar contraseña obligatoria por primer ingreso
const cambiarPasswordObligatorio = async (req, res) => {
  try {
    let { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos',
      });
    }

    email = email.trim().toLowerCase();

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      });
    }

    const usuarioEncontrado = await Usuario.findOne({ where: { email } });
    if (!usuarioEncontrado) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (!usuarioEncontrado.debeCambiarPassword) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario no requiere un cambio de contraseña forzado.',
      });
    }

    // Actualizar contraseña y quitar la bandera
    usuarioEncontrado.password = password; // El hook beforeUpdate se encargará de hashearlo!
    usuarioEncontrado.debeCambiarPassword = false;
    await usuarioEncontrado.save();

    res.json({
      success: true,
      message: 'Contraseña cambiada con éxito. Ya puedes iniciar sesión.',
    });
  } catch (error) {
    console.error('❌ Error en cambiarPasswordObligatorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  cambiarPasswordObligatorio,
};