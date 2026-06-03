const { Paralelo, Docente, Inscripcion, Estudiante, Usuario } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Obtener todos los paralelos con sus docentes y estudiantes asignados
 * @route   GET /api/admin/paralelos
 * @access  Private/Admin
 */
const obtenerParalelos = async (req, res) => {
  try {
    const { tipo } = req.query; // 'laboral' o 'comunitaria'

    const where = {};
    if (tipo) {
      where.tipoPractica = tipo;
    }

    const paralelos = await Paralelo.findAll({
      where,
      include: [
        {
          model: Docente,
          as: 'docente',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['email'],
            },
          ],
        },
        {
          model: Inscripcion,
          as: 'inscripciones',
          where: { activa: true },
          required: false,
          include: [
            {
              model: Estudiante,
              as: 'estudiante',
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['email'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['tipoPractica', 'ASC'],
        ['nombre', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: paralelos,
    });
  } catch (error) {
    console.error('Error en obtenerParalelos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los paralelos.',
      error: error.message,
    });
  }
};

/**
 * @desc    Distribuir equitativamente estudiantes sin paralelo asignado
 * @route   POST /api/admin/paralelos/distribuir-estudiantes
 * @access  Private/Admin
 */
const distribuirEstudiantes = async (req, res) => {
  try {
    const { tipoPractica } = req.body; // 'laboral' o 'comunitaria'

    if (!tipoPractica || !['laboral', 'comunitaria'].includes(tipoPractica)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de práctica es obligatorio ("laboral" o "comunitaria").',
      });
    }

    // 1. Obtener los 8 paralelos de esta modalidad
    const paralelos = await Paralelo.findAll({
      where: { tipoPractica },
      order: [['nombre', 'ASC']],
    });

    if (paralelos.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No se encontraron paralelos inicializados para esta modalidad.',
      });
    }

    // 2. Obtener las inscripciones aprobadas activas sin paralelo
    const inscripciones = await Inscripcion.findAll({
      where: {
        tipoPractica,
        estadoInscripcion: 'aprobada',
        activa: true,
        paraleloId: null,
      },
      order: [['id', 'ASC']],
    });

    if (inscripciones.length === 0) {
      return res.json({
        success: true,
        message: 'No hay estudiantes pendientes de asignación de paralelo para esta modalidad.',
        data: { asignados: 0 },
      });
    }

    // 3. Distribuir equitativamente usando Round-Robin sobre los 8 paralelos
    // Primero, calculemos cuántos estudiantes tiene actualmente cada paralelo para equilibrarlos perfectamente
    const conteoParalelos = await Promise.all(
      paralelos.map(async (p) => {
        const count = await Inscripcion.count({
          where: { paraleloId: p.id, activa: true },
        });
        return { paralelo: p, count };
      })
    );

    let asignados = 0;
    for (const inscripcion of inscripciones) {
      // Encontrar el paralelo con menor cantidad de estudiantes actualmente
      conteoParalelos.sort((a, b) => a.count - b.count);
      const paraleloElegido = conteoParalelos[0];

      // Asignar paralelo y sincronizar tutorId
      await inscripcion.update({
        paraleloId: paraleloElegido.paralelo.id,
        tutorId: paraleloElegido.paralelo.docenteId || null,
      });

      // Incrementar conteo local para la distribución
      paraleloElegido.count++;
      asignados++;
    }

    res.json({
      success: true,
      message: `Distribución masiva completada. Se asignaron ${asignados} estudiantes de forma equitativa.`,
      data: { asignados },
    });
  } catch (error) {
    console.error('Error en distribuirEstudiantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al distribuir estudiantes.',
      error: error.message,
    });
  }
};

/**
 * @desc    Distribuir equitativamente docentes de la modalidad entre sus paralelos
 * @route   POST /api/admin/paralelos/distribuir-docentes
 * @access  Private/Admin
 */
const distribuirDocentes = async (req, res) => {
  try {
    const { tipoPractica } = req.body; // 'laboral' o 'comunitaria'

    if (!tipoPractica || !['laboral', 'comunitaria'].includes(tipoPractica)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de práctica es obligatorio ("laboral" o "comunitaria").',
      });
    }

    // 1. Obtener los 8 paralelos de esta modalidad
    const paralelos = await Paralelo.findAll({
      where: { tipoPractica },
      order: [['nombre', 'ASC']],
    });

    // 2. Obtener los docentes específicos para esta modalidad (específicos + ambas)
    const tipoTutor = tipoPractica === 'laboral' ? 'laborales' : 'comunales';
    const docentes = await Docente.findAll({
      where: {
        tipoTutor: {
          [Op.in]: [tipoTutor, 'ambas'],
        },
      },
      order: [['nombres', 'ASC']],
    });

    if (docentes.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No existen docentes específicos registrados para prácticas ${tipoPractica}s.`,
      });
    }

    // 3. Distribuir docentes equitativamente (máximo 1 paralelo por docente)
    let docentesAsignados = 0;
    for (let i = 0; i < paralelos.length; i++) {
      const paralelo = paralelos[i];
      // Si hay docentes disponibles, asignar uno a uno. De lo contrario, dejar como null (sin duplicar)
      const docente = i < docentes.length ? docentes[i] : null;

      // Actualizar el docente en el paralelo
      await paralelo.update({ docenteId: docente ? docente.id : null });

      // Sincronizar el tutorId de todas las inscripciones activas dentro de este paralelo
      await Inscripcion.update(
        { tutorId: docente ? docente.id : null },
        { where: { paraleloId: paralelo.id, activa: true } }
      );

      if (docente) {
        docentesAsignados++;
      }
    }

    res.json({
      success: true,
      message: `Distribución de docentes completada con éxito. Se asignaron docentes a ${docentesAsignados} paralelos.`,
    });
  } catch (error) {
    console.error('Error en distribuirDocentes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al distribuir docentes.',
      error: error.message,
    });
  }
};

/**
 * @desc    Asignar manualmente un docente a un paralelo
 * @route   PUT /api/admin/paralelos/:id/docente
 * @access  Private/Admin
 */
const asignarDocenteAParalelo = async (req, res) => {
  try {
    const { id } = req.params;
    const { docenteId } = req.body; // Puede ser null para desasignar

    const paralelo = await Paralelo.findByPk(id);
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: 'Paralelo no encontrado.',
      });
    }

    let docente = null;
    if (docenteId) {
      docente = await Docente.findByPk(docenteId);
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: 'Docente no encontrado.',
        });
      }

      // Validar tipo de especialidad
      const especialidadRequerida = paralelo.tipoPractica === 'laboral' ? 'laborales' : 'comunales';
      if (docente.tipoTutor !== especialidadRequerida && docente.tipoTutor !== 'ambas') {
        return res.status(400).json({
          success: false,
          message: `Este docente tiene especialidad en "${docente.tipoTutor}" y no puede asignarse a un paralelo de prácticas ${paralelo.tipoPractica}s.`,
        });
      }

      // Validar si el docente ya está asignado a otro paralelo diferente
      const paraleloExistente = await Paralelo.findOne({
        where: {
          docenteId,
          id: { [Op.ne]: paralelo.id }
        }
      });
      if (paraleloExistente) {
        // Transferencia automática: liberar el paralelo anterior
        await paraleloExistente.update({ docenteId: null });
        
        // Sincronizar las inscripciones del paralelo anterior a tutorId null
        await Inscripcion.update(
          { tutorId: null },
          { where: { paraleloId: paraleloExistente.id, activa: true } }
        );
      }
    }

    // Actualizar paralelo
    await paralelo.update({ docenteId: docenteId || null });

    // Sincronizar tutorId en las inscripciones de este paralelo
    await Inscripcion.update(
      { tutorId: docenteId || null },
      { where: { paraleloId: paralelo.id, activa: true } }
    );

    res.json({
      success: true,
      message: docenteId 
        ? `Tutor ${docente.nombres} asignado al Paralelo ${paralelo.nombre} con éxito.`
        : `Tutor removido del Paralelo ${paralelo.nombre} con éxito.`,
    });
  } catch (error) {
    console.error('Error en asignarDocenteAParalelo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar docente al paralelo.',
      error: error.message,
    });
  }
};

/**
 * @desc    Mover o quitar estudiante de un paralelo manualmente
 * @route   PUT /api/admin/paralelos/mover-estudiante
 * @access  Private/Admin
 */
const moverEstudiante = async (req, res) => {
  try {
    const { inscripcionId, paraleloId } = req.body; // paraleloId puede ser null

    const inscripcion = await Inscripcion.findByPk(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada.',
      });
    }

    if (paraleloId === null) {
      // Quitar de paralelo y tutor
      await inscripcion.update({
        paraleloId: null,
        tutorId: null,
      });

      return res.json({
        success: true,
        message: 'Estudiante removido del paralelo con éxito.',
      });
    }

    const nuevoParalelo = await Paralelo.findByPk(paraleloId);
    if (!nuevoParalelo) {
      return res.status(404).json({
        success: false,
        message: 'El paralelo de destino no existe.',
      });
    }

    // Validar que el paralelo corresponda a la modalidad de la inscripción
    if (nuevoParalelo.tipoPractica !== inscripcion.tipoPractica) {
      return res.status(400).json({
        success: false,
        message: `No se puede mover un estudiante de prácticas "${inscripcion.tipoPractica}s" a un paralelo de tipo "${nuevoParalelo.tipoPractica}".`,
      });
    }

    // Mover estudiante y asignar el tutor de ese paralelo de forma directa
    await inscripcion.update({
      paraleloId: nuevoParalelo.id,
      tutorId: nuevoParalelo.docenteId || null,
    });

    res.json({
      success: true,
      message: `Estudiante movido exitosamente al Paralelo ${nuevoParalelo.nombre}.`,
    });
  } catch (error) {
    console.error('Error en moverEstudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al mover estudiante de paralelo.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerParalelos,
  distribuirEstudiantes,
  distribuirDocentes,
  asignarDocenteAParalelo,
  moverEstudiante,
};
