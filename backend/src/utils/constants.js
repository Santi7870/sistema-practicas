// Estados de cuenta de usuario
const ESTADOS_CUENTA = {
  PENDIENTE: 'pendiente',
  ACTIVO: 'activo',
  RECHAZADO: 'rechazado',
  INACTIVO: 'inactivo',
};

// Estados del proceso de prácticas
const ESTADOS_PROCESO = {
  SIN_ASIGNAR: 'sin_asignar',
  ASIGNADO: 'asignado',
  PENDIENTE_INICIO: 'pendiente_inicio',
  EN_PROCESO: 'en_proceso',
  FINALIZADO: 'finalizado',
};

// Estados de inscripción
const ESTADOS_INSCRIPCION = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
};

// Estados de documentos
const ESTADOS_DOCUMENTO = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
};

// Fases del proceso
const FASES = {
  FASE_1: 1,
  FASE_2: 2,
  FASE_3: 3,
  FASE_4: 4,
};

// Tipos de documentos por fase
const TIPOS_DOCUMENTOS = {
  FASE_2: ['Oficio de practicas', 'Anexo A'],
  FASE_3: ['Respuesta de la empresa'],
  FASE_4: ['Certificado de practicas realizadas'],
};

// Roles de usuario
const ROLES = {
  ADMIN: 'admin',
  ESTUDIANTE: 'estudiante',
  DOCENTE: 'docente',
};

// Tipos de notificaciones
const TIPOS_NOTIFICACION = {
  REGISTRO: 'registro',
  APROBACION: 'aprobacion',
  RECHAZO: 'rechazo',
  DOCUMENTO_SUBIDO: 'documento_subido',
  DOCUMENTO_REVISADO: 'documento_revisado',
  CAMBIO_ESTADO: 'cambio_estado',
  SISTEMA: 'sistema',
};

// Configuración de archivos
const CONFIG_ARCHIVOS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['.pdf', '.doc', '.docx'],
  UPLOAD_DIR: 'uploads/documentos',
};

// Tipos de prácticas
const TIPOS_PRACTICA = {
  LABORAL: 'laboral',
  COMUNITARIA: 'comunitaria',
};

module.exports = {
  ESTADOS_CUENTA,
  ESTADOS_PROCESO,
  ESTADOS_INSCRIPCION,
  ESTADOS_DOCUMENTO,
  FASES,
  TIPOS_DOCUMENTOS,
  ROLES,
  TIPOS_NOTIFICACION,
  CONFIG_ARCHIVOS,
  TIPOS_PRACTICA,
};