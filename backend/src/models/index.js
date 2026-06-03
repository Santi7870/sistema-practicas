const sequelize = require('../config/database');

// Import models
const Usuario = require('./usuario');
const Estudiante = require('./estudiante');
const Docente = require('./Docente');
const Convenio = require('./convenio');
const Inscripcion = require('./inscripcion');
const Documento = require('./documento');
const Notificacion = require('./notificacion');
const Ciclo = require('./Ciclo');
const Tarea = require('./Tarea');
const Entrega = require('./Entrega');
const Paralelo = require('./Paralelo');

// Usuario - Estudiante (1:1)
Usuario.hasOne(Estudiante, {
  foreignKey: 'usuarioId',
  as: 'estudiante',
  onDelete: 'CASCADE',
});
Estudiante.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});

// Usuario - Docente (1:1)
Usuario.hasOne(Docente, {
  foreignKey: 'usuarioId',
  as: 'docente',
  onDelete: 'CASCADE',
});
Docente.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});

// Estudiante - Inscripcion activa (1:1 scoped)
Estudiante.hasOne(Inscripcion, {
  foreignKey: 'estudianteId',
  as: 'inscripcion',
  onDelete: 'CASCADE',
  scope: { activa: true },
});
Inscripcion.belongsTo(Estudiante, {
  foreignKey: 'estudianteId',
  as: 'estudiante',
});

// Estudiante - Historial de inscripciones (1:N)
Estudiante.hasMany(Inscripcion, {
  foreignKey: 'estudianteId',
  as: 'inscripciones',
  onDelete: 'CASCADE',
});

// Convenio - Inscripcion (1:N)
Convenio.hasMany(Inscripcion, {
  foreignKey: 'convenioId',
  as: 'inscripciones',
});
Inscripcion.belongsTo(Convenio, {
  foreignKey: 'convenioId',
  as: 'convenio',
});

// Docente - Inscripcion (1:N)
Docente.hasMany(Inscripcion, {
  foreignKey: 'tutorId',
  as: 'inscripciones',
  onDelete: 'SET NULL',
});
Inscripcion.belongsTo(Docente, {
  foreignKey: 'tutorId',
  as: 'tutor',
});

// Inscripcion - Documento (1:N)
Inscripcion.hasMany(Documento, {
  foreignKey: 'inscripcionId',
  as: 'documentos',
  onDelete: 'CASCADE',
});
Documento.belongsTo(Inscripcion, {
  foreignKey: 'inscripcionId',
  as: 'inscripcion',
});

// Usuario - Notificacion (1:N)
Usuario.hasMany(Notificacion, {
  foreignKey: 'usuarioId',
  as: 'notificaciones',
  onDelete: 'CASCADE',
});
Notificacion.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});

// Inscripcion - Ciclo (1:N)
Inscripcion.hasMany(Ciclo, {
  foreignKey: 'inscripcionId',
  as: 'ciclos',
  onDelete: 'CASCADE',
});
Ciclo.belongsTo(Inscripcion, {
  foreignKey: 'inscripcionId',
  as: 'inscripcion',
});

// Docente - Tarea (1:N)
Docente.hasMany(Tarea, {
  foreignKey: 'docenteId',
  as: 'tareas',
  onDelete: 'CASCADE',
});
Tarea.belongsTo(Docente, {
  foreignKey: 'docenteId',
  as: 'docente',
});

// Tarea - Entrega (1:N)
Tarea.hasMany(Entrega, {
  foreignKey: 'tareaId',
  as: 'entregas',
  onDelete: 'CASCADE',
});
Entrega.belongsTo(Tarea, {
  foreignKey: 'tareaId',
  as: 'tarea',
});

// Inscripcion - Entrega (1:N)
Inscripcion.hasMany(Entrega, {
  foreignKey: 'inscripcionId',
  as: 'entregas',
  onDelete: 'CASCADE',
});
Entrega.belongsTo(Inscripcion, {
  foreignKey: 'inscripcionId',
  as: 'inscripcion',
});

// Paralelo - Docente (N:1)
Paralelo.belongsTo(Docente, {
  foreignKey: 'docenteId',
  as: 'docente',
  onDelete: 'SET NULL',
});
Docente.hasMany(Paralelo, {
  foreignKey: 'docenteId',
  as: 'paralelos',
});

// Paralelo - Inscripcion (1:N)
Paralelo.hasMany(Inscripcion, {
  foreignKey: 'paraleloId',
  as: 'inscripciones',
  onDelete: 'SET NULL',
});
Inscripcion.belongsTo(Paralelo, {
  foreignKey: 'paraleloId',
  as: 'paralelo',
});

module.exports = {
  sequelize,
  Usuario,
  Estudiante,
  Docente,
  Convenio,
  Inscripcion,
  Documento,
  Notificacion,
  Ciclo,
  Tarea,
  Entrega,
  Paralelo,
};

