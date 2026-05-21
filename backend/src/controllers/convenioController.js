const { Convenio, Inscripcion, Estudiante, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Obtener todos los convenios
 * @route   GET /api/convenios
 * @access  Private
 */
const obtenerConvenios = async (req, res) => {
  try {
    const { activo, buscar } = req.query;

    const where = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    let convenios = await Convenio.findAll({
      where,
      order: [['nombreEmpresa', 'ASC']],
    });

    // Filtrar por búsqueda si se proporciona
    if (buscar) {
      const buscarLower = buscar.toLowerCase();
      convenios = convenios.filter(
        (conv) =>
          conv.nombreEmpresa.toLowerCase().includes(buscarLower) ||
          conv.area.toLowerCase().includes(buscarLower)
      );
    }

    res.json({
      success: true,
      cantidad: convenios.length,
      data: convenios,
    });
  } catch (error) {
    console.error('Error en obtenerConvenios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener convenios.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener convenios disponibles (con cupos)
 * @route   GET /api/convenios/disponibles
 * @access  Private
 */
const obtenerConveniosDisponibles = async (req, res) => {
  try {
    const convenios = await Convenio.findAll({
      where: {
        activo: true,
        [Op.and]: [
          {
            cuposOcupados: {
              [Op.lt]: require('sequelize').col('cupos_totales'),
            },
          },
        ],
      },
      order: [['nombreEmpresa', 'ASC']],
    });

    // Filtrar manualmente para asegurar disponibilidad
    const conveniosDisponibles = convenios.filter((conv) =>
      conv.tieneDisponibilidad()
    );

    res.json({
      success: true,
      cantidad: conveniosDisponibles.length,
      data: conveniosDisponibles,
    });
  } catch (error) {
    console.error('Error en obtenerConveniosDisponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener convenios disponibles.',
      error: error.message,
    });
  }
};

/**
 * @desc    Obtener un convenio por ID
 * @route   GET /api/convenios/:id
 * @access  Private
 */
const obtenerConvenioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const convenio = await Convenio.findByPk(id, {
      include: [
        {
          model: Inscripcion,
          as: 'inscripciones',
          include: [
            {
              model: Estudiante,
              as: 'estudiante',
              attributes: ['id', 'nombres', 'codigo', 'semestre'],
            },
          ],
        },
      ],
    });

    if (!convenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    res.json({
      success: true,
      data: convenio,
    });
  } catch (error) {
    console.error('Error en obtenerConvenioPorId:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener convenio.',
      error: error.message,
    });
  }
};

/**
 * @desc    Crear nuevo convenio
 * @route   POST /api/convenios
 * @access  Private/Admin
 */
const crearConvenio = async (req, res) => {
  try {
    const {
      nombreEmpresa,
      area,
      contacto,
      telefono,
      actividades,
      horario,
      cuposLaboralesTotales,
      cuposComunitariosTotales,
    } = req.body;

    // Validaciones
    if (!nombreEmpresa || !area) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona el nombre de la empresa y el área.',
      });
    }

    // Verificar si ya existe un convenio con el mismo nombre
    const convenioExistente = await Convenio.findOne({
      where: { nombreEmpresa },
    });

    if (convenioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un convenio con esta empresa.',
      });
    }

    const convenio = await Convenio.create({
      nombreEmpresa,
      area,
      contacto,
      telefono,
      actividades,
      horario,
      cuposLaboralesTotales: cuposLaboralesTotales !== undefined ? cuposLaboralesTotales : 0,
      cuposComunitariosTotales: cuposComunitariosTotales !== undefined ? cuposComunitariosTotales : 0,
      cuposLaboralesOcupados: 0,
      cuposComunitariosOcupados: 0,
      activo: true,
    });

    res.status(201).json({
      success: true,
      message: 'Convenio creado exitosamente.',
      data: convenio,
    });
  } catch (error) {
    console.error('Error en crearConvenio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear convenio.',
      error: error.message,
    });
  }
};

/**
 * @desc    Actualizar convenio
 * @route   PUT /api/convenios/:id
 * @access  Private/Admin
 */
const actualizarConvenio = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombreEmpresa,
      area,
      contacto,
      telefono,
      actividades,
      horario,
      cuposLaboralesTotales,
      cuposComunitariosTotales,
      activo,
    } = req.body;

    const convenio = await Convenio.findByPk(id);

    if (!convenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    // Validar que los cupos no se reduzcan por debajo de los ocupados actuales
    if (cuposLaboralesTotales !== undefined && cuposLaboralesTotales < convenio.cuposLaboralesOcupados) {
      return res.status(400).json({
        success: false,
        message: `No puedes reducir los cupos laborales a ${cuposLaboralesTotales} porque ya hay ${convenio.cuposLaboralesOcupados} cupos laborales ocupados.`,
      });
    }

    if (cuposComunitariosTotales !== undefined && cuposComunitariosTotales < convenio.cuposComunitariosOcupados) {
      return res.status(400).json({
        success: false,
        message: `No puedes reducir los cupos comunitarios a ${cuposComunitariosTotales} porque ya hay ${convenio.cuposComunitariosOcupados} cupos comunitarios ocupados.`,
      });
    }

    // Actualizar
    await convenio.update({
      nombreEmpresa: nombreEmpresa || convenio.nombreEmpresa,
      area: area || convenio.area,
      contacto: contacto !== undefined ? contacto : convenio.contacto,
      telefono: telefono !== undefined ? telefono : convenio.telefono,
      actividades: actividades !== undefined ? actividades : convenio.actividades,
      horario: horario !== undefined ? horario : convenio.horario,
      cuposLaboralesTotales: cuposLaboralesTotales !== undefined ? cuposLaboralesTotales : convenio.cuposLaboralesTotales,
      cuposComunitariosTotales: cuposComunitariosTotales !== undefined ? cuposComunitariosTotales : convenio.cuposComunitariosTotales,
      activo: activo !== undefined ? activo : convenio.activo,
    });

    res.json({
      success: true,
      message: 'Convenio actualizado exitosamente.',
      data: convenio,
    });
  } catch (error) {
    console.error('Error en actualizarConvenio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar convenio.',
      error: error.message,
    });
  }
};

/**
 * @desc    Eliminar convenio
 * @route   DELETE /api/convenios/:id
 * @access  Private/Admin
 */
const eliminarConvenio = async (req, res) => {
  try {
    const { id } = req.params;

    const convenio = await Convenio.findByPk(id);

    if (!convenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    // Verificar si hay estudiantes asignados
    if (convenio.cuposOcupados > 0) {
      return res.status(400).json({
        success: false,
        message:
          'No puedes eliminar este convenio porque tiene estudiantes asignados. Desactívalo en su lugar.',
      });
    }

    await convenio.destroy();

    res.json({
      success: true,
      message: 'Convenio eliminado exitosamente.',
    });
  } catch (error) {
    console.error('Error en eliminarConvenio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar convenio.',
      error: error.message,
    });
  }
};

/**
 * @desc    Crear múltiples convenios de forma masiva
 * @route   POST /api/convenios/bulk
 * @access  Private/Admin
 */
const crearConveniosMasivo = async (req, res) => {
  try {
    const { convenios } = req.body;

    if (!convenios || !Array.isArray(convenios)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona una lista de convenios válida.',
      });
    }

    const creados = [];
    const errores = [];

    // Iterar para procesar uno a uno y ejecutar hooks de la instancia (como beforeSave para cuposTotales)
    for (const data of convenios) {
      try {
        const {
          nombreEmpresa,
          area,
          contacto,
          telefono,
          actividades,
          horario,
          cuposLaboralesTotales,
          cuposComunitariosTotales,
        } = data;

        if (!nombreEmpresa || !area) {
          errores.push({
            convenio: data,
            error: 'El nombre de la empresa y el área son obligatorios.',
          });
          continue;
        }

        // Buscar si ya existe por nombre (insensible a mayúsculas/minúsculas y eliminando espacios en blanco)
        const cleanNombre = nombreEmpresa.trim().toLowerCase();
        const convenioExistente = await Convenio.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nombre_empresa'))),
            cleanNombre
          ),
        });

        if (convenioExistente) {
          // Actualizar campos
          await convenioExistente.update({
            area: area || convenioExistente.area,
            contacto: contacto !== undefined ? contacto : convenioExistente.contacto,
            telefono: telefono !== undefined ? telefono : convenioExistente.telefono,
            actividades: actividades !== undefined ? actividades : convenioExistente.actividades,
            horario: horario !== undefined ? horario : convenioExistente.horario,
            cuposLaboralesTotales: cuposLaboralesTotales !== undefined ? cuposLaboralesTotales : convenioExistente.cuposLaboralesTotales,
            cuposComunitariosTotales: cuposComunitariosTotales !== undefined ? cuposComunitariosTotales : convenioExistente.cuposComunitariosTotales,
          });
          creados.push(convenioExistente);
        } else {
          // Crear nuevo
          const nuevo = await Convenio.create({
            nombreEmpresa,
            area,
            contacto: contacto || '',
            telefono: telefono || '',
            actividades: actividades || '',
            horario: horario || '',
            cuposLaboralesTotales: cuposLaboralesTotales || 0,
            cuposComunitariosTotales: cuposComunitariosTotales || 0,
            cuposLaboralesOcupados: 0,
            cuposComunitariosOcupados: 0,
            activo: true,
          });
          creados.push(nuevo);
        }
      } catch (err) {
        errores.push({
          convenio: data,
          error: err.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Proceso masivo completado. Creados/Actualizados: ${creados.length}, Errores: ${errores.length}`,
      data: {
        cantidadCreados: creados.length,
        cantidadErrores: errores.length,
        errores,
      },
    });
  } catch (error) {
    console.error('Error en crearConveniosMasivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la carga masiva de convenios.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerConvenios,
  obtenerConveniosDisponibles,
  obtenerConvenioPorId,
  crearConvenio,
  actualizarConvenio,
  eliminarConvenio,
  crearConveniosMasivo,
};