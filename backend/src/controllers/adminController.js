const {
  Usuario,
  Estudiante,
  Docente,
  Convenio,
  Inscripcion,
  Documento,
  Notificacion,
  Tarea,
  Entrega,
  Paralelo,
  Configuracion,
  sequelize,
} = require('../models');
const {
  ESTADOS_CUENTA,
  ESTADOS_PROCESO,
  ESTADOS_INSCRIPCION,
} = require('../utils/constants');

/**
 * @desc    Obtener registros pendientes de aprobación
 * @route   GET /api/admin/registros-pendientes
 * @access  Private/Admin
 */
const obtenerRegistrosPendientes = async (req, res) => {
  try {
    const registrosPendientes = await Usuario.findAll({
      where: {
        estadoCuenta: ESTADOS_CUENTA.PENDIENTE,
      },
      attributes: ['id', 'email', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    res.json({
      success: true,
      cantidad: registrosPendientes.length,
      data: registrosPendientes,
    });
  } catch (error) {
    console.error('Error en obtenerRegistrosPendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros pendientes.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aprobar registro de estudiante
 * @route   PUT /api/admin/aprobar-registro/:usuarioId
 * @access  Private/Admin
 */
const aprobarRegistro = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
    }

    if (usuario.estadoCuenta !== ESTADOS_CUENTA.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario ya fue procesado anteriormente.',
      });
    }

    // Actualizar estado a activo
    await usuario.update({ estadoCuenta: ESTADOS_CUENTA.ACTIVO });

    // Crear notificación para el estudiante
    await Notificacion.create({
      usuarioId: usuario.id,
      titulo: '¡Registro aprobado!',
      mensaje:
        'Tu registro ha sido aprobado. Ya puedes completar tus datos e inscribirte a las prácticas preprofesionales.',
      tipo: 'aprobacion',
      enlace: '/dashboard',
    });

    res.json({
      success: true,
      message: 'Registro aprobado exitosamente.',
      data: {
        id: usuario.id,
        email: usuario.email,
        estadoCuenta: usuario.estadoCuenta,
      },
    });
  } catch (error) {
    console.error('Error en aprobarRegistro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar registro.',
      error: error.message,
    });
  }
};

/**
 * @desc    Rechazar registro de estudiante
 * @route   PUT /api/admin/rechazar-registro/:usuarioId
 * @access  Private/Admin
 */
const rechazarRegistro = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { motivo } = req.body;

    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
    }

    if (usuario.estadoCuenta !== ESTADOS_CUENTA.PENDIENTE) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario ya fue procesado anteriormente.',
      });
    }

    // Actualizar estado a rechazado
    await usuario.update({ estadoCuenta: ESTADOS_CUENTA.RECHAZADO });

    // Crear notificación para el estudiante
    await Notificacion.create({
      usuarioId: usuario.id,
      titulo: 'Registro rechazado',
      mensaje: motivo || 'Tu registro ha sido rechazado. Contacta al administrador para más información.',
      tipo: 'rechazo',
    });

    res.json({
      success: true,
      message: 'Registro rechazado.',
      data: {
        id: usuario.id,
        email: usuario.email,
        estadoCuenta: usuario.estadoCuenta,
      },
    });
  } catch (error) {
    console.error('Error en rechazarRegistro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar registro.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener todos los estudiantes
 * @route   GET /api/admin/estudiantes
 * @access  Private/Admin
 */
const obtenerEstudiantes = async (req, res) => {
  try {
    const { estado, buscar } = req.query;

    // Construir filtros
    const whereEstudiante = {};
    const whereUsuario = { rol: 'estudiante', estadoCuenta: ESTADOS_CUENTA.ACTIVO };

    if (estado && estado !== 'todos') {
      whereEstudiante.estadoProceso = estado;
    }

    const estudiantes = await Estudiante.findAll({
      where: whereEstudiante,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          where: whereUsuario,
          attributes: ['id', 'email', 'estadoCuenta'],
        },
        {
          model: Inscripcion,
          as: 'inscripcion',
          required: false,
          include: [
            {
              model: Convenio,
              as: 'convenio',
              attributes: ['id', 'nombreEmpresa', 'area'],
            },
            {
              model: Docente,
              as: 'tutor',
              attributes: ['id', 'nombres'],
            },
            {
              model: Paralelo,
              as: 'paralelo',
              attributes: ['id', 'nombre'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Filtrar por búsqueda si se proporciona
    let estudiantesFiltrados = estudiantes;
    if (buscar) {
      const buscarLower = buscar.toLowerCase();
      estudiantesFiltrados = estudiantes.filter(
        (est) =>
          est.nombres?.toLowerCase().includes(buscarLower) ||
          est.codigo?.includes(buscar) ||
          est.usuario.email.toLowerCase().includes(buscarLower)
      );
    }

    res.json({
      success: true,
      cantidad: estudiantesFiltrados.length,
      data: estudiantesFiltrados,
    });
  } catch (error) {
    console.error('Error en obtenerEstudiantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener detalle completo de un estudiante
 * @route   GET /api/admin/estudiantes/:estudianteId
 * @access  Private/Admin
 */
const obtenerDetalleEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    const estudiante = await Estudiante.findByPk(estudianteId, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'estadoCuenta', 'createdAt'],
        },
        {
          model: Inscripcion,
          as: 'inscripcion',
          required: false,
          include: [
            {
              model: Convenio,
              as: 'convenio',
            },
            {
              model: Documento,
              as: 'documentos',
            },
            {
              model: Paralelo,
              as: 'paralelo',
              attributes: ['id', 'nombre'],
            },
            {
              model: Docente,
              as: 'tutor',
              attributes: ['id', 'nombres'],
            },
          ],
        },
      ],
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    if (estudiante.estadoProceso === 'pendiente_inicio' && estudiante.inscripcion) {
      const hasEntrega = await Entrega.findOne({
        where: { inscripcionId: estudiante.inscripcion.id }
      });
      if (hasEntrega) {
        await estudiante.update({ estadoProceso: 'en_proceso' });
        estudiante.estadoProceso = 'en_proceso';
      }
    }

    res.json({
      success: true,
      data: estudiante,
    });
  } catch (error) {
    console.error('Error en obtenerDetalleEstudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del estudiante.',
      error: error.message,
    });
  }
};

/**
 * @desc    Cambiar convenio de un estudiante
 * @route   PUT /api/admin/estudiantes/:estudianteId/cambiar-convenio
 * @access  Private/Admin
 */
const cambiarConvenio = async (req, res) => {
  try {
    const { estudianteId } = req.params;
    const { nuevoConvenioId, motivo } = req.body;

    const estudiante = await Estudiante.findByPk(estudianteId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [{ model: Convenio, as: 'convenio' }],
        },
      ],
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    if (!estudiante.inscripcion) {
      return res.status(400).json({
        success: false,
        message: 'El estudiante no tiene una inscripción.',
      });
    }

    const nuevoConvenio = await Convenio.findByPk(nuevoConvenioId);
    if (!nuevoConvenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    // Verificar disponibilidad
    if (!nuevoConvenio.tieneDisponibilidad()) {
      return res.status(400).json({
        success: false,
        message: 'El convenio seleccionado no tiene cupos disponibles.',
      });
    }

    const convenioAnterior = estudiante.inscripcion.convenio;

    // Actualizar cupos
    await convenioAnterior.decrement('cuposOcupados');
    await nuevoConvenio.increment('cuposOcupados');

    // Actualizar inscripción
    await estudiante.inscripcion.update({
      convenioId: nuevoConvenioId,
    });

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: estudiante.usuarioId,
      titulo: 'Cambio de convenio',
      mensaje: `Tu convenio ha sido cambiado de "${convenioAnterior.nombreEmpresa}" a "${nuevoConvenio.nombreEmpresa}". Motivo: ${motivo || 'No especificado'}.`,
      tipo: 'cambio_estado',
      enlace: '/estudiante/mis-practicas',
    });

    res.json({
      success: true,
      message: 'Convenio cambiado exitosamente.',
    });
  } catch (error) {
    console.error('Error en cambiarConvenio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar convenio.',
      error: error.message,
    });
  }
};

/**
 * @desc    Resetear proceso de un estudiante
 * @route   PUT /api/admin/estudiantes/:estudianteId/resetear
 * @access  Private/Admin
 */
const resetearEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;
    const { motivo } = req.body;

    const estudiante = await Estudiante.findByPk(estudianteId, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripcion',
          include: [
            { model: Convenio, as: 'convenio' },
            { model: Documento, as: 'documentos' },
          ],
        },
      ],
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    // Si tiene inscripción, liberar el cupo del convenio
    if (estudiante.inscripcion && estudiante.inscripcion.convenio) {
      await estudiante.inscripcion.convenio.decrement('cuposOcupados');
    }

    // Eliminar documentos si existen
    if (estudiante.inscripcion && estudiante.inscripcion.documentos) {
      // Aquí también deberías eliminar los archivos físicos
      await Documento.destroy({
        where: { inscripcionId: estudiante.inscripcion.id },
      });
    }

    // Eliminar inscripción
    if (estudiante.inscripcion) {
      await Inscripcion.destroy({
        where: { estudianteId: estudiante.id },
      });
    }

    // Resetear estado del estudiante
    await estudiante.update({
      estadoProceso: ESTADOS_PROCESO.SIN_ASIGNAR,
    });

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: estudiante.usuarioId,
      titulo: 'Proceso reseteado',
      mensaje: `Tu proceso de prácticas ha sido reseteado. Motivo: ${motivo || 'No especificado'}. Deberás iniciar nuevamente el proceso de inscripción.`,
      tipo: 'sistema',
      enlace: '/dashboard',
    });

    res.json({
      success: true,
      message: 'Estudiante reseteado exitosamente.',
    });
  } catch (error) {
    console.error('Error en resetearEstudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear estudiante.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener estadísticas para el dashboard
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    // Contar registros pendientes de cuenta
    const registrosPendientes = await Usuario.count({
      where: { estadoCuenta: ESTADOS_CUENTA.PENDIENTE },
    });

    // Contar postulaciones de Fase 1 pendientes de revisión
    const postulacionesPendientes = await Inscripcion.count({
      where: {
        activa: true,
        estadoDocumentosRequisitos: 'en_revision',
      },
    });

    const includeUsuarioActivo = [
      {
        model: Usuario,
        as: 'usuario',
        where: { estadoCuenta: ESTADOS_CUENTA.ACTIVO },
      },
    ];

    // Contar estudiantes por estado
    const sinAsignar = await Estudiante.count({
      where: { estadoProceso: ESTADOS_PROCESO.SIN_ASIGNAR },
      include: includeUsuarioActivo,
    });

    const asignados = await Estudiante.count({
      where: { estadoProceso: ESTADOS_PROCESO.ASIGNADO },
      include: includeUsuarioActivo,
    });

    const pendienteInicio = await Estudiante.count({
      where: { estadoProceso: ESTADOS_PROCESO.PENDIENTE_INICIO },
      include: includeUsuarioActivo,
    });

    const enProceso = await Estudiante.count({
      where: { estadoProceso: ESTADOS_PROCESO.EN_PROCESO },
      include: includeUsuarioActivo,
    });

    const finalizados = await Estudiante.count({
      where: { estadoProceso: ESTADOS_PROCESO.FINALIZADO },
      include: includeUsuarioActivo,
    });

    const totalEstudiantes = await Estudiante.count({
      include: includeUsuarioActivo,
    });

    // Contar docentes totales
    const totalDocentes = await Docente.count();

    // Contar convenios activos
    const conveniosActivos = await Convenio.count({
      where: { activo: true },
    });

    // Calcular cupos disponibles totales
    const convenios = await Convenio.findAll({
      where: { activo: true },
      attributes: ['cuposTotales', 'cuposOcupados'],
    });

    const cuposDisponibles = convenios.reduce(
      (acc, conv) => acc + (conv.cuposTotales - conv.cuposOcupados),
      0
    );

    res.json({
      success: true,
      data: {
        registrosPendientes,
        postulacionesPendientes,
        estudiantes: {
          total: totalEstudiantes,
          sinAsignar,
          asignados,
          pendienteInicio,
          enProceso,
          finalizados,
        },
        docentes: {
          total: totalDocentes,
        },
        convenios: {
          activos: conveniosActivos,
          cuposDisponibles,
        },
      },
    });
  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Crear cuenta de docente con clave temporal aleatoria
 * @route   POST /api/admin/docentes
 * @access  Private/Admin
 */
const crearDocente = async (req, res) => {
  try {
    const { email, nombres, departamento, tipoTutor } = req.body;

    // Validaciones básicas
    if (!email || !nombres) {
      return res.status(400).json({
        success: false,
        message: 'El email y nombres completos son obligatorios.',
      });
    }

    if (!email.endsWith('@espoch.edu.ec')) {
      return res.status(400).json({
        success: false,
        message: 'El correo debe ser institucional (@espoch.edu.ec).',
      });
    }

    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Este correo ya se encuentra registrado.',
      });
    }

    // Generar contraseña aleatoria de 8 caracteres segura (Opción B)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let passwordTemporal = '';
    for (let i = 0; i < 8; i++) {
      passwordTemporal += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Crear el usuario con rol docente, activo y forzar cambio de clave
    const nuevoUsuario = await Usuario.create({
      email,
      password: passwordTemporal, // Se encriptará en el hook de Sequelize
      rol: 'docente',
      estadoCuenta: 'activo',
      debeCambiarPassword: true,
    });

    // Crear el perfil del docente
    const nuevoDocente = await Docente.create({
      usuarioId: nuevoUsuario.id,
      nombres,
      departamento: departamento || null,
      tipoTutor: tipoTutor || 'ambas',
    });

    res.status(201).json({
      success: true,
      message: 'Docente creado con éxito.',
      data: {
        id: nuevoDocente.id,
        email: nuevoUsuario.email,
        nombres: nuevoDocente.nombres,
        departamento: nuevoDocente.departamento,
        tipoTutor: nuevoDocente.tipoTutor,
        passwordTemporal, // Enviado una sola vez para visualización del admin
      },
    });
  } catch (error) {
    console.error('Error en crearDocente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la cuenta del docente.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener lista de todos los docentes
 * @route   GET /api/admin/docentes
 * @access  Private/Admin
 */
const obtenerDocentes = async (req, res) => {
  try {
    const docentes = await Docente.findAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'estadoCuenta'],
        },
        {
          model: Inscripcion,
          as: 'inscripciones',
          where: { activa: true },
          required: false,
          attributes: ['id'],
        },
        {
          model: Paralelo,
          as: 'paralelos',
          required: false,
          attributes: ['id', 'nombre', 'tipoPractica'],
        },
      ],
      order: [['nombres', 'ASC']],
    });

    const respuesta = docentes.map((docente) => ({
      id: docente.id,
      usuarioId: docente.usuarioId,
      email: docente.usuario ? docente.usuario.email : '',
      estadoCuenta: docente.usuario ? docente.usuario.estadoCuenta : '',
      nombres: docente.nombres,
      departamento: docente.departamento,
      tipoTutor: docente.tipoTutor,
      cargaActiva: docente.inscripciones ? docente.inscripciones.length : 0,
      paralelos: docente.paralelos ? docente.paralelos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        tipoPractica: p.tipoPractica,
      })) : [],
    }));

    res.json({
      success: true,
      cantidad: respuesta.length,
      data: respuesta,
    });
  } catch (error) {
    console.error('Error en obtenerDocentes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de docentes.',
      error: error.message,
    });
  }
};

/**
 * @desc    Actualizar datos y estado de cuenta de un docente tutor
 * @route   PUT /api/admin/docentes/:docenteId
 * @access  Private/Admin
 */
const actualizarDocente = async (req, res) => {
  try {
    const { docenteId } = req.params;
    const { email, nombres, departamento, tipoTutor, estadoCuenta } = req.body;

    const docente = await Docente.findByPk(docenteId, {
      include: [{ model: Usuario, as: 'usuario' }],
    });

    if (!docente) {
      return res.status(404).json({
        success: false,
        message: 'Docente no encontrado.',
      });
    }

    if (email && email !== docente.usuario.email) {
      if (!email.endsWith('@espoch.edu.ec')) {
        return res.status(400).json({
          success: false,
          message: 'El correo debe ser institucional (@espoch.edu.ec).',
        });
      }

      const emailDuplicado = await Usuario.findOne({ where: { email } });
      if (emailDuplicado) {
        return res.status(400).json({
          success: false,
          message: 'Este correo ya se encuentra registrado por otro usuario.',
        });
      }

      await docente.usuario.update({ email });
    }

    if (estadoCuenta) {
      await docente.usuario.update({ estadoCuenta });
    }

    await docente.update({
      nombres: nombres || docente.nombres,
      departamento: departamento !== undefined ? departamento : docente.departamento,
      tipoTutor: tipoTutor || docente.tipoTutor,
    });

    res.json({
      success: true,
      message: 'Docente tutor actualizado exitosamente.',
      data: {
        id: docente.id,
        email: docente.usuario.email,
        nombres: docente.nombres,
        departamento: docente.departamento,
        tipoTutor: docente.tipoTutor,
        estadoCuenta: docente.usuario.estadoCuenta,
      },
    });
  } catch (error) {
    console.error('Error en actualizarDocente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el docente.',
      error: error.message,
    });
  }
};

/**
 * @desc    Algoritmo de Auto-Asignación Balanceada de Tutores (Round-Robin/Load-Balanced)
 * @route   POST /api/admin/docentes/auto-asignar
 * @access  Private/Admin
 */
const autoAsignarTutores = async (req, res) => {
  try {
    const { modalidad } = req.body; // 'comunales' o 'laborales'

    if (!modalidad || !['comunales', 'laborales'].includes(modalidad)) {
      return res.status(400).json({
        success: false,
        message: 'La modalidad es requerida y debe ser "comunales" o "laborales".',
      });
    }

    const tipoPractica = modalidad === 'comunales' ? 'comunitaria' : 'laboral';

    // 1. Encontrar inscripciones activas aprobadas sin tutor
    const inscripcionesSinTutor = await Inscripcion.findAll({
      where: {
        tipoPractica,
        tutorId: null,
        estadoInscripcion: 'aprobada',
        activa: true,
      },
    });

    if (inscripcionesSinTutor.length === 0) {
      return res.json({
        success: true,
        message: 'No existen matrículas activas aprobadas sin tutor asignado para esta modalidad.',
        data: { totalAsignados: 0, resumen: [] },
      });
    }

    // 2. Encontrar docentes calificados para esta especialidad
    const Op = require('sequelize').Op;
    const docentes = await Docente.findAll({
      where: {
        tipoTutor: {
          [Op.in]: [modalidad, 'ambas'],
        },
      },
      include: [
        {
          model: Inscripcion,
          as: 'inscripciones',
          where: { activa: true },
          required: false,
          attributes: ['id'],
        },
      ],
    });

    if (docentes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay docentes registrados con especialidad en esta modalidad para asignar.',
      });
    }

    // 3. Mapear docentes para seguimiento de carga de trabajo activa
    const docentesCarga = docentes.map((docente) => ({
      id: docente.id,
      nombres: docente.nombres,
      carga: docente.inscripciones ? docente.inscripciones.length : 0,
      nuevosAsignados: 0,
    }));

    // 4. Repartir equitativamente usando balanceo de carga
    for (const inscripcion of inscripcionesSinTutor) {
      // Ordenar docentes de menor a mayor carga de trabajo activa
      docentesCarga.sort((a, b) => a.carga - b.carga);

      // Elegir el docente con menor carga
      const tutorElegido = docentesCarga[0];

      // Asignar tutor a la inscripción
      inscripcion.tutorId = tutorElegido.id;

      // Incrementar cargas
      tutorElegido.carga++;
      tutorElegido.nuevosAsignados++;
    }

    // 5. Guardar todos los registros actualizados en paralelo
    await Promise.all(inscripcionesSinTutor.map((ins) => ins.save()));

    res.json({
      success: true,
      message: `Asignación automática masiva completada con éxito. Se asignaron ${inscripcionesSinTutor.length} matrículas.`,
      data: {
        totalAsignados: inscripcionesSinTutor.length,
        resumen: docentesCarga
          .filter((d) => d.nuevosAsignados > 0)
          .map((d) => ({
            nombres: d.nombres,
            nuevos: d.nuevosAsignados,
            cargaTotal: d.carga,
          })),
      },
    });
  } catch (error) {
    console.error('Error en autoAsignarTutores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar el algoritmo de auto-asignación.',
      error: error.message,
    });
  }
};

/**
 * @desc    Asignación Manual de Tutor a un Estudiante
 * @route   PUT /api/admin/estudiantes/:estudianteId/asignar-tutor
 * @access  Private/Admin
 */
const asignarTutorManual = async (req, res) => {
  try {
    const { estudianteId } = req.params;
    const { tutorId } = req.body; // Puede ser null para remover el tutor

    const estudiante = await Estudiante.findByPk(estudianteId);
    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado.',
      });
    }

    // Buscar inscripción activa de este estudiante
    const inscripcion = await Inscripcion.findOne({
      where: {
        estudianteId: estudiante.id,
        activa: true,
      },
    });

    if (!inscripcion) {
      return res.status(400).json({
        success: false,
        message: 'El estudiante no cuenta con una inscripción activa para asignarle tutor.',
      });
    }

    // Validar docente si se proporcionó tutorId
    if (tutorId) {
      const docente = await Docente.findByPk(tutorId);
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: 'Docente no encontrado.',
        });
      }
    }

    // Actualizar tutor
    await inscripcion.update({ tutorId: tutorId || null });

    res.json({
      success: true,
      message: 'Tutor asignado exitosamente.',
    });
  } catch (error) {
    console.error('Error en asignarTutorManual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar tutor manualmente.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener calificaciones completas de un estudiante para el reporte del administrador
 * @route   GET /api/admin/estudiantes/:estudianteId/calificaciones
 * @access  Private/Admin
 */
const obtenerCalificacionesEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    const inscripcion = await Inscripcion.findOne({
      where: { estudianteId, activa: true },
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email'] }],
        },
        { model: Convenio, as: 'convenio', attributes: ['id', 'nombreEmpresa', 'area'] },
        { model: Docente, as: 'tutor', attributes: ['id', 'nombres'] },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción activa no encontrada para este estudiante.',
      });
    }

    // Si no tiene tutor asignado, retornamos estructura con notas vacías
    if (!inscripcion.tutorId) {
      const ciclos = [1, 2, 3].map((num) => ({
        numeroCiclo: num,
        totalTareas: 0,
        tareasCalificadas: 0,
        promedio: null,
        tareas: [],
      }));

      return res.json({
        success: true,
        data: {
          estudiante: inscripcion.estudiante,
          convenio: inscripcion.convenio,
          tutor: null,
          tipoPractica: inscripcion.tipoPractica,
          ciclos,
          notaFinal: null,
        },
      });
    }

    const { CICLOS_FIJOS, recalcularPromediosCiclos, obtenerNotaFinalDesdeCiclos } = require('../utils/ciclos');

    // Obtener tareas y entregas
    const tareas = await Tarea.findAll({
      where: {
        docenteId: inscripcion.tutorId,
        tipoPractica: inscripcion.tipoPractica,
      },
      include: [
        {
          model: Entrega,
          as: 'entregas',
          where: { inscripcionId: inscripcion.id },
          required: false,
        },
      ],
      order: [['numeroCiclo', 'ASC'], ['codigo', 'ASC']],
    });

    // Calcular promedios de ciclos
    const resumenCiclosDb = await recalcularPromediosCiclos({
      inscripcionId: inscripcion.id,
      docenteId: inscripcion.tutorId,
      tipoPractica: inscripcion.tipoPractica,
    });

    const cicloPromMap = new Map(resumenCiclosDb.map((c) => [c.numeroCiclo, c.promedioCiclo]));

    const ciclos = CICLOS_FIJOS.map((num) => {
      const tareasCiclo = tareas.filter((t) => t.numeroCiclo === num);

      const tareasDetalle = tareasCiclo.map((t) => {
        const entrega = t.entregas && t.entregas.length > 0 ? t.entregas[0] : null;
        const nota = entrega && entrega.nota !== null ? parseFloat(entrega.nota) : null;

        return {
          id: t.id,
          codigo: t.codigo,
          titulo: t.titulo,
          puntajeMaximo: parseFloat(t.puntajeMaximo),
          fechaApertura: t.fechaApertura,
          fechaCierre: t.fechaCierre,
          entrega: entrega
            ? {
                id: entrega.id,
                nota,
                estado: entrega.estado,
                comentarioDocente: entrega.comentarioDocente,
                fechaEntrega: entrega.fechaEntrega,
                fechaCalificacion: entrega.fechaCalificacion,
                nombreArchivo: entrega.nombreArchivo,
              }
            : null,
        };
      });

      return {
        numeroCiclo: num,
        totalTareas: tareasCiclo.length,
        tareasCalificadas: tareasDetalle.filter((t) => t.entrega && t.entrega.nota !== null).length,
        promedio: cicloPromMap.get(num) ?? null,
        tareas: tareasDetalle,
      };
    });

    const { notaFinal } = await obtenerNotaFinalDesdeCiclos(inscripcion.id);

    return res.json({
      success: true,
      data: {
        estudiante: inscripcion.estudiante,
        convenio: inscripcion.convenio,
        tutor: inscripcion.tutor,
        tipoPractica: inscripcion.tipoPractica,
        ciclos,
        notaFinal,
      },
    });
  } catch (error) {
    console.error('Error en obtenerCalificacionesEstudiante:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener calificaciones del estudiante.',
      error: error.message,
    });
  }
};

/**
 * @desc    Descargar entrega de un estudiante (administrador)
 * @route   GET /api/admin/entregas/:entregaId/descargar
 * @access  Private/Admin
 */
const descargarEntregaEstudiante = async (req, res) => {
  try {
    const { entregaId } = req.params;
    const path = require('path');
    const fs = require('fs');

    const entrega = await Entrega.findByPk(entregaId, {
      include: [{ model: Tarea, as: 'tarea' }],
    });

    if (!entrega) {
      return res.status(404).json({ success: false, message: 'Entrega no encontrada.' });
    }

    const isAnexoB = entrega.tarea.titulo.toLowerCase().includes('anexo b');
    const { subTarea } = req.query;

    let targetPath = entrega.rutaArchivo;
    let targetName = entrega.nombreArchivo;

    if (isAnexoB && subTarea === 'interno') {
      targetPath = entrega.rutaArchivoInterno;
      targetName = entrega.nombreArchivoInterno;
    } else if (isAnexoB && subTarea === 'externo') {
      targetPath = entrega.rutaArchivoExterno;
      targetName = entrega.nombreArchivoExterno;
    }

    if (!targetPath) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible para esta entrega.' });
    }

    const filePath = path.resolve(targetPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado físicamente en el servidor.' });
    }

    return res.download(filePath, targetName);
  } catch (error) {
    console.error('Error en descargarEntregaEstudiante:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar el archivo.', error: error.message });
  }
};

/**
 * @desc    Revisar (Aprobar o Rechazar) la inscripción y requisitos de Fase 1 del estudiante
 * @route   PUT /api/admin/inscripciones/:inscripcionId/revisar
 * @access  Private/Admin
 */
const revisarInscripcion = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { inscripcionId } = req.params;
    const { estado, comentario } = req.body; // estado: 'aprobada' o 'rechazada'

    if (!estado || !['aprobada', 'rechazada'].includes(estado)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'El estado es requerido y debe ser "aprobada" o "rechazada".' });
    }

    if (estado === 'rechazada' && !comentario) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Es obligatorio proporcionar un comentario/motivo de rechazo.' });
    }

    const inscripcion = await Inscripcion.findByPk(inscripcionId, {
      include: [
        { model: Estudiante, as: 'estudiante' },
        { model: Convenio, as: 'convenio' }
      ],
      transaction
    });

    if (!inscripcion) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada.' });
    }

    const estudiante = inscripcion.estudiante;

    if (estado === 'aprobada') {
      // 1. Aprobar inscripción y requisitos
      await inscripcion.update({
        estadoInscripcion: ESTADOS_INSCRIPCION.APROBADA,
        estadoDocumentosRequisitos: 'aprobado',
        fechaAprobacion: new Date(),
        comentarioAdmin: null
      }, { transaction });

      // 2. Aprobar los documentos físicos de Fase 1 en la BD
      await Documento.update({
        estado: 'aprobado',
        fechaRevision: new Date()
      }, {
        where: { inscripcionId: inscripcion.id, fase: 1 },
        transaction
      });

      // 3. Avanzar al estudiante a PENDIENTE_INICIO (Fase 2)
      await estudiante.update({
        estadoProceso: ESTADOS_PROCESO.PENDIENTE_INICIO
      }, { transaction });

      // 4. Notificar al estudiante
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: '¡Inscripción aprobada por el Administrador!',
        mensaje: `Tu inscripción al convenio "${inscripcion.convenio.nombreEmpresa}" ha sido aprobada. Ahora estás habilitado para iniciar prácticas. Sube tus documentos de Fase 2.`,
        tipo: 'aprobacion',
        enlace: '/estudiante/mis-practicas'
      }, { transaction });

      await transaction.commit();
      return res.json({ success: true, message: 'Inscripción aprobada con éxito.' });

    } else {
      // RECHAZADA
      // 1. Mantener inscripción en pendiente pero marcar documentos como rechazados
      await inscripcion.update({
        estadoInscripcion: ESTADOS_INSCRIPCION.PENDIENTE, // Sigue pendiente para permitir corrección
        estadoDocumentosRequisitos: 'rechazado',
        comentarioAdmin: comentario
      }, { transaction });

      // 2. Marcar documentos de Fase 1 como rechazados en la BD
      await Documento.update({
        estado: 'rechazado',
        comentarioAdmin: comentario,
        fechaRevision: new Date()
      }, {
        where: { inscripcionId: inscripcion.id, fase: 1 },
        transaction
      });

      // 3. Notificar al estudiante
      await Notificacion.create({
        usuarioId: estudiante.usuarioId,
        titulo: 'Requisitos de inscripción rechazados',
        mensaje: `Tus documentos de inscripción fueron rechazados. Motivo: ${comentario}. Por favor, corrígelos en tu panel.`,
        tipo: 'rechazo',
        enlace: '/dashboard'
      }, { transaction });

      await transaction.commit();
      return res.json({ success: true, message: 'Inscripción rechazada. Se ha notificado al estudiante para correcciones.' });
    }

  } catch (error) {
    await transaction.rollback();
    console.error('Error en revisarInscripcion:', error);
    res.status(500).json({ success: false, message: 'Error al revisar inscripción.', error: error.message });
  }
};

/**
 * @desc    Reabrir/Extender el plazo para subir requisitos a un estudiante
 * @route   PUT /api/admin/inscripciones/:inscripcionId/reabrir-plazo
 * @access  Private/Admin
 */
const reabrirPlazoRequisitos = async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { diasExtension, fechaLimite } = req.body;

    const inscripcion = await Inscripcion.findByPk(inscripcionId, {
      include: [{ model: Estudiante, as: 'estudiante' }]
    });

    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada.' });
    }

    let nuevaFechaLimite;
    let mensajeRespuesta;

    if (fechaLimite) {
      nuevaFechaLimite = new Date(fechaLimite);
      if (isNaN(nuevaFechaLimite.getTime())) {
        return res.status(400).json({ success: false, message: 'La fecha límite proporcionada no es válida.' });
      }
      mensajeRespuesta = `Plazo de entrega extendido de forma exitosa.`;
    } else {
      const dias = diasExtension ? parseInt(diasExtension, 10) : 3;
      nuevaFechaLimite = new Date();
      nuevaFechaLimite.setDate(nuevaFechaLimite.getDate() + dias);
      mensajeRespuesta = `Plazo extendido por ${dias} días de forma exitosa.`;
    }

    await inscripcion.update({
      fechaLimiteDocumentos: nuevaFechaLimite,
      estadoDocumentosRequisitos: 'pendiente_entrega' // Volver a habilitar la subida
    });

    // Notificar al estudiante
    await Notificacion.create({
      usuarioId: inscripcion.estudiante.usuarioId,
      titulo: 'Plazo de entrega extendido',
      mensaje: `El administrador ha extendido tu plazo de entrega de requisitos. Tienes hasta el ${nuevaFechaLimite.toLocaleString('es-EC')} para subirlos.`,
      tipo: 'sistema',
      enlace: '/dashboard'
    });

    res.json({
      success: true,
      message: mensajeRespuesta,
      data: {
        fechaLimiteDocumentos: nuevaFechaLimite
      }
    });

  } catch (error) {
    console.error('Error en reabrirPlazoRequisitos:', error);
    res.status(500).json({ success: false, message: 'Error al reabrir el plazo.', error: error.message });
  }
};

// Final of controller
module.exports = {
  obtenerRegistrosPendientes,
  aprobarRegistro,
  rechazarRegistro,
  obtenerEstudiantes,
  obtenerDetalleEstudiante,
  cambiarConvenio,
  resetearEstudiante,
  obtenerEstadisticas,
  crearDocente,
  obtenerDocentes,
  actualizarDocente,
  autoAsignarTutores,
  asignarTutorManual,
  obtenerCalificacionesEstudiante,
  descargarEntregaEstudiante,
  revisarInscripcion,
  reabrirPlazoRequisitos,
};