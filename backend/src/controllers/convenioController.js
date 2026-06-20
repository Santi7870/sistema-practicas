const { Convenio, Inscripcion, Estudiante, sequelize } = require('../models');
const { Op } = require('sequelize');
const { verificarConveniosVencidos } = require('../utils/verificadorExpiracion');

/**
 * @desc    Obtener todos los convenios
 * @route   GET /api/convenios
 * @access  Private
 */
const obtenerConvenios = async (req, res) => {
  try {
    await verificarConveniosVencidos();
    const { activo, buscar } = req.query;

    const where = { eliminado: false };
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

const obtenerConveniosDisponibles = async (req, res) => {
  try {
    await verificarConveniosVencidos();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hoy = `${year}-${month}-${day}`;

    const convenios = await Convenio.findAll({
      where: {
        eliminado: false,
        activo: true,
        [Op.or]: [
          { fechaVencimiento: null },
          { fechaVencimiento: { [Op.gte]: hoy } }
        ],
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
      fechaVencimiento,
    } = req.body;

    // Validaciones
    if (!nombreEmpresa || !area || !fechaVencimiento) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona el nombre de la empresa, el área de especialidad y la fecha de vencimiento del convenio.',
      });
    }

    if (contacto && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-\(\)\/]+$/.test(contacto)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del contacto/representante contiene caracteres no válidos.',
      });
    }

    if (telefono && !/^[0-9\s\-\+\/\(\)]+$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono contiene caracteres no válidos.',
      });
    }

    // Verificar si ya existe un convenio con el mismo nombre y no está eliminado
    const cleanNombre = nombreEmpresa.trim().toLowerCase();
    const convenioExistente = await Convenio.findOne({
      where: {
        eliminado: false,
        [Op.and]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nombre_empresa'))),
            cleanNombre
          )
        ]
      }
    });

    if (convenioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un convenio registrado con esta empresa.',
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
      fechaVencimiento: fechaVencimiento || null,
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
      fechaVencimiento,
    } = req.body;

    const convenio = await Convenio.findByPk(id);

    if (!convenio) {
      return res.status(404).json({
        success: false,
        message: 'Convenio no encontrado.',
      });
    }

    if (nombreEmpresa === '' || area === '' || fechaVencimiento === '' || fechaVencimiento === null) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la empresa, el área de especialidad y la fecha de vencimiento son campos obligatorios y no pueden dejarse vacíos.',
      });
    }

    if (contacto && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-\(\)\/]+$/.test(contacto)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del contacto/representante contiene caracteres no válidos.',
      });
    }

    if (telefono && !/^[0-9\s\-\+\/\(\)]+$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono contiene caracteres no válidos.',
      });
    }

    // Validar unicidad del nombre de empresa de forma insensible a mayúsculas/minúsculas y que no esté eliminado
    if (nombreEmpresa && nombreEmpresa.trim().toLowerCase() !== convenio.nombreEmpresa.trim().toLowerCase()) {
      const cleanNombre = nombreEmpresa.trim().toLowerCase();
      const convenioExistente = await Convenio.findOne({
        where: {
          eliminado: false,
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nombre_empresa'))),
              cleanNombre
            )
          ]
        }
      });
      if (convenioExistente && convenioExistente.id !== convenio.id) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro convenio registrado con este nombre de empresa.',
        });
      }
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
      fechaVencimiento: fechaVencimiento !== undefined ? fechaVencimiento : convenio.fechaVencimiento,
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
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const hoyStr = `${year}-${month}-${day}`;

      const esVencido = convenio.fechaVencimiento && convenio.fechaVencimiento < hoyStr;

      if (!esVencido) {
        return res.status(400).json({
          success: false,
          message:
            'No puedes eliminar este convenio porque está vigente y tiene estudiantes asignados. Desactívalo en su lugar.',
        });
      }
    }

    // Eliminación lógica para no romper FKs ni registros históricos de estudiantes
    await convenio.update({ eliminado: true, activo: false });

    res.json({
      success: true,
      message: 'Convenio eliminado lógicamente de forma exitosa.',
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
  let transaction;
  try {
    const { convenios } = req.body;

    if (!convenios || !Array.isArray(convenios)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona una lista de convenios válida.',
      });
    }

    const nombresEnPeticion = new Set();
    const duplicadosInternos = [];
    for (const data of convenios) {
      const clean = (data.nombreEmpresa || '').trim().toLowerCase();
      if (clean) {
        if (nombresEnPeticion.has(clean)) {
          duplicadosInternos.push(data.nombreEmpresa.trim());
        }
        nombresEnPeticion.add(clean);
      }
    }

    if (duplicadosInternos.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El archivo contiene nombres de empresa duplicados: ${[...new Set(duplicadosInternos)].join(', ')}.`,
      });
    }

    transaction = await sequelize.transaction();

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
          fechaVencimiento,
        } = data;

        if (!nombreEmpresa || !area || !fechaVencimiento) {
          errores.push({
            id: data.id,
            nombreEmpresa: nombreEmpresa || '(Sin nombre)',
            error: 'El nombre de la empresa, el área y la fecha de vencimiento son obligatorios.',
          });
          continue;
        }

        if (contacto && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-\(\)\/]+$/.test(contacto)) {
          errores.push({
            id: data.id,
            nombreEmpresa,
            error: 'El nombre del contacto/representante contiene caracteres no válidos.',
          });
          continue;
        }

        if (telefono && !/^[0-9\s\-\+\/\(\)]+$/.test(telefono)) {
          errores.push({
            id: data.id,
            nombreEmpresa,
            error: 'El número de teléfono contiene caracteres no válidos.',
          });
          continue;
        }

        // Buscar si ya existe por nombre y no está eliminado (insensible a mayúsculas/minúsculas y eliminando espacios en blanco)
        const cleanNombre = nombreEmpresa.trim().toLowerCase();
        const convenioExistente = await Convenio.findOne({
          where: {
            eliminado: false,
            [Op.and]: [
              sequelize.where(
                sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nombre_empresa'))),
                cleanNombre
              )
            ]
          },
          transaction,
        });

        if (convenioExistente) {
          const laborTotales = cuposLaboralesTotales !== undefined ? cuposLaboralesTotales : convenioExistente.cuposLaboralesTotales;
          const comunTotales = cuposComunitariosTotales !== undefined ? cuposComunitariosTotales : convenioExistente.cuposComunitariosTotales;

          // Validar que los cupos no se reduzcan por debajo de los ocupados actuales
          if (laborTotales < convenioExistente.cuposLaboralesOcupados) {
            errores.push({
              id: data.id,
              nombreEmpresa,
              error: `No puedes reducir los cupos laborales a ${laborTotales} porque ya hay ${convenioExistente.cuposLaboralesOcupados} cupos ocupados.`,
            });
            continue;
          }

          if (comunTotales < convenioExistente.cuposComunitariosOcupados) {
            errores.push({
              id: data.id,
              nombreEmpresa,
              error: `No puedes reducir los cupos comunitarios a ${comunTotales} porque ya hay ${convenioExistente.cuposComunitariosOcupados} cupos ocupados.`,
            });
            continue;
          }

          // Actualizar campos
          await convenioExistente.update({
            area: area || convenioExistente.area,
            contacto: contacto !== undefined ? contacto : convenioExistente.contacto,
            telefono: telefono !== undefined ? telefono : convenioExistente.telefono,
            actividades: actividades !== undefined ? actividades : convenioExistente.actividades,
            horario: horario !== undefined ? horario : convenioExistente.horario,
            cuposLaboralesTotales: laborTotales,
            cuposComunitariosTotales: comunTotales,
            fechaVencimiento: fechaVencimiento !== undefined ? fechaVencimiento : convenioExistente.fechaVencimiento,
          }, { transaction });
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
            fechaVencimiento,
          }, { transaction });
          creados.push(nuevo);
        }
      } catch (err) {
        errores.push({
          id: data.id,
          nombreEmpresa: data.nombreEmpresa || '(Sin nombre)',
          error: err.message,
        });
      }
    }

    if (errores.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Se encontraron errores de validación en la lista de convenios.',
        errores,
      });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `¡Carga masiva completada con éxito! Creados/Actualizados: ${creados.length} convenios.`,
      data: {
        cantidadCreados: creados.length,
      },
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error al realizar rollback en crearConveniosMasivo:', rollbackErr);
      }
    }
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