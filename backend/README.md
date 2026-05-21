# 🎓 Sistema de Gestión de Prácticas Preprofesionales - ESPOCH

Sistema web para la gestión y seguimiento de prácticas preprofesionales de la carrera de Software de la ESPOCH.

## 📋 Tecnologías Utilizadas

### Backend
- Node.js v18+
- Express.js
- PostgreSQL 14+
- Sequelize ORM
- JWT para autenticación
- Multer para manejo de archivos
- Nodemailer para emails

### Frontend (Próximamente)
- React 18+
- Vite
- Tailwind CSS
- React Router v6
- Axios

## 🚀 Configuración Inicial del Backend

### Paso 1: Requisitos Previos

Asegúrate de tener instalado:
- Node.js v18 o superior
- PostgreSQL 14 o superior
- Git

### Paso 2: Clonar e Instalar Dependencias

```bash
# Navegar a la carpeta del backend
cd backend

# Instalar dependencias
npm install
```

### Paso 3: Configurar PostgreSQL

1. Abre pgAdmin 4 o psql
2. Crea una nueva base de datos:

```sql
CREATE DATABASE practicas_espoch;
```

3. Ejecuta el esquema de la base de datos:
   - Abre el archivo `database/schema.sql`
   - Ejecuta todo el contenido en la base de datos `practicas_espoch`

### Paso 4: Configurar Variables de Entorno

1. En la carpeta `backend`, crea un archivo `.env` (copia de `.env.example`):

```bash
# En Windows PowerShell
copy .env.example .env

# En Windows CMD
copy .env.example .env
```

2. Edita el archivo `.env` con tus configuraciones:

```env
# CONFIGURACIÓN DEL SERVIDOR
NODE_ENV=development
PORT=5000

# CONFIGURACIÓN DE BASE DE DATOS PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=practicas_espoch
DB_USER=postgres
DB_PASSWORD=tu_password_de_postgres

# JWT SECRET (Generar uno nuevo para producción)
JWT_SECRET=mi_super_secret_key_123456789
JWT_EXPIRE=7d

# CONFIGURACIÓN DE EMAIL (Opcional por ahora)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=Sistema Prácticas ESPOCH <noreply@espoch.edu.ec>

# URL DEL FRONTEND
FRONTEND_URL=http://localhost:5173

# CONFIGURACIÓN DE ARCHIVOS
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=.pdf,.doc,.docx
```

### Paso 5: Crear Usuario Administrador

Tienes dos opciones:

#### Opción A: Usando un script Node.js (Recomendado)

Crea un archivo `backend/scripts/createAdmin.js`:

```javascript
const bcrypt = require('bcryptjs');
const { Usuario } = require('../src/models');
require('dotenv').config();

async function crearAdmin() {
  try {
    const hash = await bcrypt.hash('Admin123!', 10);
    
    await Usuario.create({
      email: 'admin@espoch.edu.ec',
      password: hash,
      rol: 'admin',
      estadoCuenta: 'activo'
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@espoch.edu.ec');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  CAMBIAR LA CONTRASEÑA INMEDIATAMENTE');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearAdmin();
```

Luego ejecuta:

```bash
node scripts/createAdmin.js
```

#### Opción B: Manualmente en psql

```sql
-- Primero genera el hash en Node.js
-- En una terminal de Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('Admin123!', 10).then(hash => console.log(hash));

INSERT INTO usuarios (email, password, rol, estado_cuenta)
VALUES ('admin@espoch.edu.ec', 'TU_HASH_AQUI', 'admin', 'activo');
```

### Paso 6: Iniciar el Servidor

```bash
# Modo desarrollo (con nodemon - reinicio automático)
npm run dev

# Modo producción
npm start
```

Deberías ver:
```
✅ Conexión a PostgreSQL establecida correctamente.
✅ Modelos sincronizados con la base de datos.
🚀 Servidor corriendo en http://localhost:5000
📊 Entorno: development
```

### Paso 7: Probar la API

Abre tu navegador o Postman y visita:
```
http://localhost:5000/api/health
```

Deberías recibir:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2024-01-17T..."
}
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones (DB, email, etc.)
│   ├── controllers/     # Controladores (lógica de negocio)
│   ├── models/          # Modelos de Sequelize
│   ├── routes/          # Rutas de la API
│   ├── middlewares/     # Middlewares (auth, upload, etc.)
│   ├── services/        # Servicios (email, notificaciones)
│   ├── validators/      # Validaciones
│   ├── utils/           # Utilidades (JWT, constantes)
│   └── app.js           # Configuración de Express
├── uploads/             # Archivos subidos
│   └── documentos/
├── .env                 # Variables de entorno (NO subir a Git)
├── .env.example         # Ejemplo de variables de entorno
├── package.json
└── server.js            # Punto de entrada
```

## 🔐 Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registrar nuevo estudiante
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Administrador
- `GET /api/admin/registros-pendientes` - Ver registros pendientes
- `PUT /api/admin/aprobar-registro/:id` - Aprobar registro
- `GET /api/admin/estudiantes` - Ver todos los estudiantes
- `GET /api/admin/dashboard` - Estadísticas

### Convenios
- `GET /api/convenios` - Listar todos los convenios
- `POST /api/convenios` - Crear convenio (admin)
- `PUT /api/convenios/:id` - Actualizar convenio (admin)

### Inscripciones
- `POST /api/inscripciones` - Crear inscripción (estudiante)
- `PUT /api/inscripciones/:id/aprobar` - Aprobar inscripción (admin)

### Documentos
- `POST /api/documentos/subir` - Subir documento (estudiante)
- `PUT /api/documentos/:id/aprobar` - Aprobar documento (admin)
- `DELETE /api/documentos/:id` - Eliminar documento (admin)

### Notificaciones
- `GET /api/notificaciones` - Ver notificaciones
- `PUT /api/notificaciones/marcar-todas-leidas` - Marcar como leídas

## 🐛 Solución de Problemas

### Error de conexión a PostgreSQL

```
❌ Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `.env`
3. Verifica que el puerto 5432 esté libre

### Error de autenticación

```
❌ password authentication failed for user "postgres"
```

**Solución:**
- Verifica que `DB_PASSWORD` en `.env` sea correcta
- Verifica el usuario `DB_USER` en `.env`

### Puerto 5000 en uso

```
❌ Error: listen EADDRINUSE: address already in use :::5000
```

**Solución:**
- Cambia el `PORT` en `.env` a otro puerto (ej: 5001)
- O mata el proceso que está usando el puerto 5000

## 📝 Próximos Pasos

1. ✅ Configuración inicial del backend - **COMPLETADO**
2. ⏳ Implementar controladores (authController, adminController, etc.)
3. ⏳ Configurar frontend con React
4. ⏳ Implementar sistema de notificaciones
5. ⏳ Implementar envío de emails
6. ⏳ Realizar pruebas

## 👨‍💻 Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Ejecutar pruebas (cuando estén implementadas)
npm test
```

## 📧 Contacto

Para dudas o soporte, contacta al desarrollador del sistema.

---

**Desarrollado para la ESPOCH - Carrera de Software**