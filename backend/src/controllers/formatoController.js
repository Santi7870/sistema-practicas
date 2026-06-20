const { FormatoDocumento, Docente, Estudiante, Inscripcion, Paralelo } = require('../models');
const fs = require('fs').promises;
const path = require('path');

/**
 * @desc    Obtener lista de todos los formatos de documentos oficiales
 * @route   GET /api/formatos
 * @access  Private
 */
const obtenerFormatos = async (req, res) => {
  try {
    let formatsQuery = {};

    if (req.usuario.rol === 'admin') {
      // Admin puede ver todos
      formatsQuery = {};
    } else if (req.usuario.rol === 'docente') {
      // Docente ve sólo sus formatos
      const docente = await Docente.findOne({ where: { usuarioId: req.usuario.id } });
      if (!docente) {
        return res.status(403).json({ success: false, message: 'No tienes perfil de docente.' });
      }
      formatsQuery = { docenteId: docente.id };
    } else if (req.usuario.rol === 'estudiante') {
      // Estudiante ve los formatos del docente asignado
      const estudiante = await Estudiante.findOne({
        where: { usuarioId: req.usuario.id },
        include: [
          {
            model: Inscripcion,
            as: 'inscripcion',
            required: false,
            include: [
              {
                model: Paralelo,
                as: 'paralelo',
                attributes: ['id', 'docenteId']
              }
            ]
          }
        ]
      });

      if (!estudiante) {
        return res.status(404).json({ success: false, message: 'Estudiante no encontrado.' });
      }

      let docenteId = null;
      if (estudiante.inscripcion) {
        if (estudiante.inscripcion.tutorId) {
          docenteId = estudiante.inscripcion.tutorId;
        } else if (estudiante.inscripcion.paralelo && estudiante.inscripcion.paralelo.docenteId) {
          docenteId = estudiante.inscripcion.paralelo.docenteId;
        }
      }

      if (!docenteId) {
        return res.json({
          success: true,
          data: [],
          message: 'No tienes un tutor académico o paralelo asignado para ver sus formatos.'
        });
      }

      formatsQuery = { docenteId };
    }

    const formatos = await FormatoDocumento.findAll({
      where: formatsQuery,
      order: [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      data: formatos
    });
  } catch (error) {
    console.error('Error en obtenerFormatos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener formatos oficiales.',
      error: error.message
    });
  }
};

/**
 * @desc    Subir un formato oficial de documento
 * @route   POST /api/formatos
 * @access  Private/Docente
 */
const subirFormato = async (req, res) => {
  try {
    let { nombre, descripcion } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Por favor selecciona un archivo.' });
    }

    if (!nombre) {
      const ext = path.extname(req.file.originalname);
      nombre = path.basename(req.file.originalname, ext);
    }

    const docente = await Docente.findOne({ where: { usuarioId: req.usuario.id } });
    if (!docente) {
      return res.status(403).json({ success: false, message: 'No tienes perfil de docente para subir formatos.' });
    }

    const formato = await FormatoDocumento.create({
      nombre,
      descripcion: descripcion || '',
      nombreArchivo: req.file.filename,
      rutaArchivo: req.file.path,
      docenteId: docente.id
    });

    res.status(201).json({
      success: true,
      message: 'Formato de documento subido exitosamente.',
      data: formato
    });

  } catch (error) {
    console.error('Error en subirFormato:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Error al borrar archivo después de fallo:', err.message);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Error al subir el formato.',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar un formato oficial de documento (base de datos y archivo físico)
 * @route   DELETE /api/formatos/:id
 * @access  Private/Docente
 */
const eliminarFormato = async (req, res) => {
  try {
    const { id } = req.params;

    const docente = await Docente.findOne({ where: { usuarioId: req.usuario.id } });
    if (!docente) {
      return res.status(403).json({ success: false, message: 'No tienes permisos.' });
    }

    const formato = await FormatoDocumento.findByPk(id);
    if (!formato) {
      return res.status(404).json({ success: false, message: 'Formato no encontrado.' });
    }

    if (formato.docenteId !== docente.id) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar este formato.' });
    }

    // Borrar físico
    try {
      await fs.unlink(formato.rutaArchivo);
    } catch (err) {
      console.error('Error al borrar formato físico:', err.message);
    }

    // Borrar de base de datos
    await formato.destroy();

    res.json({
      success: true,
      message: 'Formato oficial eliminado exitosamente.'
    });

  } catch (error) {
    console.error('Error en eliminarFormato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el formato.',
      error: error.message
    });
  }
};

/**
 * @desc    Descargar un formato oficial de documento
 * @route   GET /api/formatos/:id/descargar
 * @access  Private
 */
const descargarFormato = async (req, res) => {
  try {
    const { id } = req.params;
    const formato = await FormatoDocumento.findByPk(id);

    if (!formato) {
      return res.status(404).json({
        success: false,
        message: 'Formato de documento no encontrado.'
      });
    }

    const resolvedPath = path.resolve(formato.rutaArchivo);
    res.download(resolvedPath, formato.nombreArchivo);
  } catch (error) {
    console.error('Error en descargarFormato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar el formato de documento.',
      error: error.message
    });
  }
};

module.exports = {
  obtenerFormatos,
  subirFormato,
  eliminarFormato,
  descargarFormato
};
