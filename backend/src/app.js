const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares con límites aumentados para archivos grandes
app.use(cors());
app.use(express.json({ limit: '25mb' })); // Aumentado a 25MB
app.use(express.urlencoded({ limit: '25mb', extended: true })); // Aumentado a 25MB

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/paralelos', require('./routes/paraleloRoutes'));
app.use('/api/estudiante', require('./routes/estudianteRoutes'));
app.use('/api/docente', require('./routes/docenteRoutes'));
app.use('/api/convenios', require('./routes/convenioRoutes'));
app.use('/api/inscripciones', require('./routes/inscripcionRoutes'));
app.use('/api/documentos', require('./routes/documentoRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionRoutes'));
app.use('/api/formatos', require('./routes/formatoRoutes'));

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path,
  });
});

// Manejo de errores general
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  
  // Error de Multer (archivo muy grande)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Máximo 20MB.',
    });
  }

  // Error de tipo de archivo no permitido
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: err.message,
  });
});

module.exports = app;