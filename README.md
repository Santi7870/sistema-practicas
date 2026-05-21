# Sistema de Gestión de Prácticas Preprofesionales — ESPOCH (Software)

Este repositorio contiene la plataforma web integral para la administración, postulación y seguimiento de las Prácticas Preprofesionales (Comunitarias y Laborales) de la carrera de Software de la Escuela Superior Politécnica de Chimborazo (ESPOCH). 

El sistema está diseñado bajo una arquitectura de alto rendimiento con un **Backend en Node.js (Express + Sequelize + PostgreSQL)** y un **Frontend SPA en React (Vite + Tailwind CSS)**.

---

## 📋 Resumen Ejecutiva de Cambios, Mejoras e Implementaciones

A lo largo del ciclo de desarrollo, la plataforma ha sido robustecida y rediseñada para alcanzar un estándar premium de experiencia de usuario (UX/UI) y una rigurosa lógica de base de datos que garantiza la consistencia del proceso académico. A continuación se detallan las implementaciones clave realizadas:

### 🗄️ 1. Adaptación de Base de Datos al "Excel de Convenios" e Integridad de Cupos
* **Reestructuración del Esquema de Convenios**: Se adaptó el modelo relacional de la base de datos para mapear perfectamente la estructura del Excel oficial de convenios de la ESPOCH (datos de empresas, tutores de vinculación, áreas de especialidad, etc.).
* **Gestión Dual de Cupos**: Se dividieron y sistematizaron de manera independiente los cupos de las modalidades:
  * 💼 **Práctica Laboral** (`cuposLaborales`)
  * 🤝 **Práctica Comunitaria** (`cuposComunitarios`)
* **Control de Asignación en Tiempo Real**: El sistema incrementa y decrementa automáticamente los cupos disponibles cuando un estudiante es asignado, aprobado, cambiado de convenio o reseteado, evitando la sobre-suscripción de plazas.

---

### 🛡️ 2. Regla de Exclusividad de Modalidades (Comunitaria vs Laboral)
* **Frontend Inteligente**: El formulario de inscripción (`Inscripcion.jsx`) detecta dinámicamente si el estudiante ya cuenta con una práctica comunitaria aprobada en su historial (`tieneComunitariaAprobada === true`). Si es así:
  * Se bloquea visualmente la opción de seleccionar la modalidad *"Práctica Comunitaria"* aplicando una opacidad del 60% y desactivando el control interactivo.
  * Se despliega un distintivo verde esmeralda: `✓ Ya has aprobado tus Prácticas Comunitarias` para retroalimentación instantánea.
* **Refuerzo en el Servidor (Backend)**: El controlador de inscripciones valida en el servidor la regla de negocio antes de registrar la postulación. Si un usuario intenta saltarse la validación del navegador mediante llamadas directas a la API, el backend responde con un error `400 Bad Request` informando que la modalidad ya está aprobada.

---

### 📂 3. Historial de Prácticas Realizadas y Modo "Solo Lectura"
* **Sección de Historial en Estudiante**: Cuando un estudiante no tiene una práctica activa y está en proceso de buscar un nuevo convenio, la pestaña **"Mis Prácticas"** ya no muestra un mensaje vacío. En su lugar, carga un panel elegante con la tarjeta de invitación a postularse y, debajo, la sección **"Historial de Prácticas Realizadas"** listando sus prácticas aprobadas anteriores.
* **Detalle Histórico Seguro (Solo Lectura)**: El estudiante puede hacer clic en cualquiera de sus prácticas archivadas para visualizar las 4 fases de entregables. Sin embargo, el sistema bloquea cualquier acción de escritura:
  * Oculta los controles de carga de archivos (botones de subida).
  * Oculta los botones de eliminación de entregables.
  * Muestra una cabecera informativa con efecto *Glassmorphism* indicando que es una **Vista de Historial (Solo Lectura)**.
  * Mantiene disponible de forma exclusiva la descarga de los documentos que subió en el pasado.

---

### 🎨 4. Refinamientos Estéticos Premium (Diseño Píxel-Perfect)
* **Restauración del Banner Gradiente**: Se recuperó y pulió la amada estética de la tarjeta de invitación en el Dashboard del estudiante, utilizando degradados radiales en tonos púrpura, azul y verde esmeralda con fondos difuminados 3D y el icono representativo de trofeo (`FiAward`).
* **Visualización de Modalidad para el Administrador**:
  * **Lista de Estudiantes**: En la columna *"Convenio"* de la tabla principal, se renderiza el nombre de la empresa acompañado de un mini-badge redondeado indicando la modalidad: `🤝 Comunitaria` (verde) o `💼 Laboral` (azul/índigo).
  * **Detalle del Estudiante**: La ficha del convenio incluye ahora un campo explícito para la modalidad con iconos estilizados que facilitan una lectura rápida.
* **Badge de Notificaciones Consistente en el Navbar**: Se corrigió el bug de los badges de notificación deformes del Navbar en responsive. Ahora, gracias al uso de anchos mínimos dinámicos (`min-w-[16px] h-4` en desktop, `min-w-[20px] h-5` en móvil) y centrado perfecto (`leading-none flex items-center justify-center`), el badge se muestra como un círculo perfecto con un dígito y transiciona elegantemente a una píldora si tiene dos o más dígitos.

---

### ✉️ 5. Redirección Dinámica e Inteligente de Notificaciones (UX Premium)
* **Redirección Contextual en un Clic**: Al hacer clic en el cuerpo de una notificación, el sistema la marca automáticamente como leída en segundo plano y te **redirige de inmediato a la sección exacta** donde debes tomar acción:
  * **Para el Administrador**: Clicar en *"Nueva inscripción de estudiante"* o *"Nuevo documento subido"* te lleva directo al perfil de detalle del estudiante correspondiente (`/admin/estudiantes/:id`) para revisar la información y presionar Aprobar/Rechazar con contexto total.
  * **Para el Estudiante**: Clicar en *"Inscripción aprobada"*, *"Documento rechazado"*, etc., te lleva directo a la pantalla de tus prácticas (`/estudiante/mis-practicas`) o al formulario de inscripción (`/dashboard`).
* **Corrector Automático al Vuelo (Retrocompatibilidad)**: El frontend incluye un traductor dinámico que intercepta notificaciones históricas creadas antes de la actualización (o que guarden rutas obsoletas como `/mis-practicas`) y las mapea al vuelo a las rutas válidas oficiales, previniendo errores 404.
* **Acción de Descarte Independiente**: Las opciones de la tarjeta (icono de visto bueno y papelera de eliminación) conservan sus disparadores aislados (`e.stopPropagation()`), permitiéndote limpiar la bandeja de notificaciones rápidamente sin salir de la página actual.

---

## 🛠️ Estructura del Proyecto

El proyecto está organizado en un monorepositorio con dos carpetas principales:

```bash
Sistema-Practicas/
├── backend/            # API REST en Node.js, Express y Sequelize ORM
│   ├── src/
│   │   ├── config/     # Configuración de base de datos y variables de entorno
│   │   ├── controllers/# Controladores (Inscripción, Documento, Admin, Auth, etc.)
│   │   ├── middlewares/# Seguridad, autenticación y subida de archivos (Multer)
│   │   ├── models/     # Modelos relacionales de Sequelize (Estudiante, Convenio, etc.)
│   │   ├── routes/     # Endpoints de la API REST
│   │   ├── utils/      # Funciones utilitarias (generación de notificaciones)
│   │   └── app.js      # Inicialización del servidor Express
│   └── uploads/        # Carpeta física de almacenamiento local de archivos subidos
│
├── frontend/           # Aplicación React construida con Vite y Tailwind CSS
│   ├── src/
│   │   ├── components/ # Componentes reutilizables (Navbar, PrivateRoute, etc.)
│   │   ├── context/    # Contextos globales (AuthContext para roles e inicio de sesión)
│   │   ├── pages/      # Vistas (Dashboard, Notificaciones, Formularios de Inscripción)
│   │   │   ├── admin/      # Páginas exclusivas de administración y revisión
│   │   │   └── estudiante/ # Páginas de seguimiento, historial y postulación del alumno
│   │   └── services/   # Cliente API configurado con Axios
│   └── dist/           # Bundle optimizado generado para producción
│
└── database/           # Scripts SQL y respaldo de la base de datos PostgreSQL
```

---

## 🚀 Guía de Despliegue y Ejecución

### Requisitos Previos
* **Node.js** (Versión 16 o superior recomendada)
* **PostgreSQL** (Base de datos relacional activa)

---

### Paso 1: Configuración del Servidor de Base de Datos
1. Crea una base de datos en tu servidor PostgreSQL (ejemplo: `sistema_practicas`).
2. Configura los parámetros en el archivo `.env` del **Backend**.

---

### Paso 2: Instalación e Inicio del Backend
1. Navega a la carpeta de backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno creando un archivo `.env` en la raíz de la carpeta `backend`:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=tu_usuario_postgres
   DB_PASS=tu_contraseña_postgres
   DB_NAME=sistema_practicas
   DB_PORT=5432
   JWT_SECRET=tu_clave_secreta_super_segura
   ```
4. Inicia el servidor de desarrollo. Sequelize creará y sincronizará la base de datos automáticamente:
   ```bash
   npm run dev
   ```

---

### Paso 3: Instalación e Inicio del Frontend
1. Abre una nueva terminal y navega a la carpeta de frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Asegúrate de configurar la URL de la API en `frontend/src/services/api.js` (apuntando a tu backend, por defecto `http://localhost:3000/api`).
4. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador la dirección indicada (por defecto `http://localhost:5173` o similar).

---

### Paso 4: Compilación para Producción
Cuando estés listo para desplegar el frontend a un hosting masivo, genera el bundle optimizado y minificado de producción:
```bash
cd frontend
npm run build
```
Este comando generará la carpeta `dist/` en segundos, lista para ser servida por servidores web de alto rendimiento como **Nginx** o **Apache**.

---

## 🔒 Seguridad y Buenas Prácticas de Almacenamiento
* **Almacenamiento Local Eficiente**: Los documentos en formatos PDF y Word que suben los estudiantes se almacenan físicamente en la carpeta del servidor `backend/uploads/` asegurando nombres únicos para prevenir colisiones.
* **Cálculo de Consumo**: Con un límite saludable de peso de archivos, **100 alumnos activos** consumirán en promedio menos de **1 GB de espacio total en disco** durante todo el año escolar, haciendo innecesarios los servicios externos de pago para este volumen.
* **Limpieza de Archivos Huérfanos**: Cuando un documento es rechazado, eliminado o el proceso de un estudiante es reseteado por el administrador, el backend utiliza el módulo de sistema de archivos de Node (`fs.unlink`) para **borrar físicamente el archivo del disco**, evitando el almacenamiento inútil de archivos basura.
