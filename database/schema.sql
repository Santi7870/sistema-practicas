-- ============================================
-- SISTEMA DE GESTIÓN DE PRÁCTICAS PREPROFESIONALES
-- ESPOCH - Carrera de Software
-- ============================================

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS convenios CASCADE;
DROP TABLE IF EXISTS estudiantes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Crear tipos ENUM
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'estudiante');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_cuenta AS ENUM ('pendiente', 'activo', 'rechazado', 'inactivo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_proceso AS ENUM ('sin_asignar', 'asignado', 'pendiente_inicio', 'en_proceso', 'finalizado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_inscripcion AS ENUM ('pendiente', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_documento AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_practica AS ENUM ('laboral', 'comunitaria');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'estudiante',
    estado_cuenta estado_cuenta NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_espoch CHECK (email LIKE '%@espoch.edu.ec')
);

-- ============================================
-- TABLA: estudiantes
-- ============================================
CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(200),
    codigo VARCHAR(4) UNIQUE,
    semestre INTEGER,
    estado_proceso estado_proceso NOT NULL DEFAULT 'sin_asignar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_codigo_length CHECK (LENGTH(codigo) = 4),
    CONSTRAINT check_semestre_range CHECK (semestre >= 1 AND semestre <= 10)
);

-- ============================================
-- TABLA: convenios
-- ============================================
CREATE TABLE convenios (
    id SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(200) NOT NULL,
    area VARCHAR(200) NOT NULL,
    contacto VARCHAR(200),
    telefono VARCHAR(20),
    actividades TEXT,
    horario VARCHAR(200),
    cupos_laborales_totales INTEGER NOT NULL DEFAULT 0,
    cupos_laborales_ocupados INTEGER NOT NULL DEFAULT 0,
    cupos_comunitarios_totales INTEGER NOT NULL DEFAULT 0,
    cupos_comunitarios_ocupados INTEGER NOT NULL DEFAULT 0,
    cupos_totales INTEGER NOT NULL DEFAULT 0,
    cupos_ocupados INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_cupos_laborales_positivos CHECK (cupos_laborales_totales >= 0),
    CONSTRAINT check_cupos_laborales_ocupados CHECK (cupos_laborales_ocupados >= 0 AND cupos_laborales_ocupados <= cupos_laborales_totales),
    CONSTRAINT check_cupos_comunitarios_positivos CHECK (cupos_comunitarios_totales >= 0),
    CONSTRAINT check_cupos_comunitarios_ocupados CHECK (cupos_comunitarios_ocupados >= 0 AND cupos_comunitarios_ocupados <= cupos_comunitarios_totales),
    CONSTRAINT check_cupos_totales_positivos CHECK (cupos_totales >= 0),
    CONSTRAINT check_cupos_totales_ocupados CHECK (cupos_ocupados >= 0 AND cupos_ocupados <= cupos_totales)
);

-- ============================================
-- TABLA: inscripciones
-- ============================================
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL UNIQUE REFERENCES estudiantes(id) ON DELETE CASCADE,
    convenio_id INTEGER NOT NULL REFERENCES convenios(id),
    tipo_practica tipo_practica NOT NULL DEFAULT 'laboral',
    estado_inscripcion estado_inscripcion NOT NULL DEFAULT 'pendiente',
    comentario_admin TEXT,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: documentos
-- ============================================
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    inscripcion_id INTEGER NOT NULL REFERENCES inscripciones(id) ON DELETE CASCADE,
    fase INTEGER NOT NULL CHECK (fase IN (2, 3, 4)),
    tipo_documento VARCHAR(100) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    estado estado_documento NOT NULL DEFAULT 'pendiente',
    comentario_admin TEXT,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_revision TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tipo_documento CHECK (
        tipo_documento IN (
            'Oficio de practicas',
            'Anexo A',
            'Respuesta de la empresa',
            'Certificado de practicas realizadas'
        )
    )
);

-- ============================================
-- TABLA: notificaciones
-- ============================================
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tipo_notificacion CHECK (
        tipo IN (
            'registro',
            'aprobacion',
            'rechazo',
            'documento_subido',
            'documento_revisado',
            'cambio_estado',
            'sistema'
        )
    )
);

-- ============================================
-- ÍNDICES para optimización
-- ============================================
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_estudiantes_usuario ON estudiantes(usuario_id);
CREATE INDEX idx_estudiantes_codigo ON estudiantes(codigo);
CREATE INDEX idx_estudiantes_estado ON estudiantes(estado_proceso);
CREATE INDEX idx_convenios_activo ON convenios(activo);
CREATE INDEX idx_inscripciones_estudiante ON inscripciones(estudiante_id);
CREATE INDEX idx_inscripciones_convenio ON inscripciones(convenio_id);
CREATE INDEX idx_inscripciones_estado ON inscripciones(estado_inscripcion);
CREATE INDEX idx_documentos_inscripcion ON documentos(inscripcion_id);
CREATE INDEX idx_documentos_fase ON documentos(fase);
CREATE INDEX idx_documentos_estado ON documentos(estado);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS para actualizar updated_at
-- ============================================
CREATE TRIGGER trigger_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_estudiantes_updated_at
    BEFORE UPDATE ON estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_convenios_updated_at
    BEFORE UPDATE ON convenios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_inscripciones_updated_at
    BEFORE UPDATE ON inscripciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_documentos_updated_at
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_notificaciones_updated_at
    BEFORE UPDATE ON notificaciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- ============================================
-- Mensaje de éxito
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos creada exitosamente';
    RAISE NOTICE '📊 Tablas: usuarios, estudiantes, convenios, inscripciones, documentos, notificaciones';
END $$;