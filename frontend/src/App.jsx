import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Páginas públicas
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CambiarPasswordObligatorio from './pages/auth/CambiarPasswordObligatorio';

// Páginas comunes (admin y estudiante)
import Dashboard from './pages/Dashboard';
import Notificaciones from './pages/Notificaciones';

// Páginas de administrador
import RegistrosPendientes from './pages/admin/RegistrosPendientes';
import ListaEstudiantes from './pages/admin/ListaEstudiantes';
import DetalleEstudiante from './pages/admin/DetalleEstudiante';
import GestionConvenios from './pages/admin/GestionConvenios';
import GestionDocentes from './pages/admin/GestionDocentes';
import GestionParalelos from './pages/admin/GestionParalelos';

// Páginas de estudiante
import CompletarDatos from './pages/estudiante/CompletarDatos';
import Inscripcion from './pages/estudiante/Inscripcion';
import MisPracticas from './pages/estudiante/MisPracticas';

// Páginas de docente
import DocenteDashboard from './pages/docente/Dashboard';
import DocenteEstudiantes from './pages/docente/Estudiantes';
import DocenteDetalleEstudiante from './pages/docente/DetalleEstudiante';
import GestionCiclos from './pages/docente/GestionCiclos';
import DetalleTarea from './pages/docente/DetalleTarea';
import LibroCalificaciones from './pages/docente/LibroCalificaciones';
import EntregasPendientes from './pages/docente/EntregasPendientes';
import MisCalificaciones from './pages/estudiante/MisCalificaciones';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Cambio de password obligatorio */}
          <Route
            path="/cambiar-password-obligatorio"
            element={
              <PrivateRoute allowPasswordChangePending>
                <CambiarPasswordObligatorio />
              </PrivateRoute>
            }
          />

          {/* Rutas protegidas - Dashboard dinámico */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Rutas protegidas - Notificaciones */}
          <Route
            path="/notificaciones"
            element={
              <PrivateRoute>
                <Notificaciones />
              </PrivateRoute>
            }
          />

          {/* Rutas de Administrador */}
          <Route
            path="/admin/registros-pendientes"
            element={
              <PrivateRoute adminOnly>
                <RegistrosPendientes />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/estudiantes"
            element={
              <PrivateRoute adminOnly>
                <ListaEstudiantes />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/estudiantes/:id"
            element={
              <PrivateRoute adminOnly>
                <DetalleEstudiante />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/convenios"
            element={
              <PrivateRoute adminOnly>
                <GestionConvenios />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/docentes"
            element={
              <PrivateRoute adminOnly>
                <GestionDocentes />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/paralelos"
            element={
              <PrivateRoute adminOnly>
                <GestionParalelos />
              </PrivateRoute>
            }
          />

          {/* Rutas de Estudiante */}
          <Route
            path="/estudiante/completar-datos"
            element={
              <PrivateRoute>
                <CompletarDatos />
              </PrivateRoute>
            }
          />
          <Route
            path="/estudiante/inscripcion"
            element={
              <PrivateRoute>
                <Inscripcion />
              </PrivateRoute>
            }
          />
          <Route
            path="/estudiante/mis-practicas"
            element={
              <PrivateRoute>
                <MisPracticas />
              </PrivateRoute>
            }
          />
          <Route
            path="/estudiante/calificaciones"
            element={
              <PrivateRoute estudianteOnly>
                <MisCalificaciones />
              </PrivateRoute>
            }
          />

          {/* Rutas de Docente */}
          <Route
            path="/docente/dashboard"
            element={
              <PrivateRoute docenteOnly>
                <DocenteDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/docente/estudiantes"
            element={
              <PrivateRoute docenteOnly>
                <DocenteEstudiantes />
              </PrivateRoute>
            }
          />
          <Route
            path="/docente/estudiantes/:id"
            element={
              <PrivateRoute docenteOnly>
                <DocenteDetalleEstudiante />
              </PrivateRoute>
            }
          />
          <Route path="/docente/ciclos" element={<PrivateRoute docenteOnly><GestionCiclos /></PrivateRoute>} />
          <Route path="/docente/tareas/:tareaId" element={<PrivateRoute docenteOnly><DetalleTarea /></PrivateRoute>} />
          <Route path="/docente/estudiantes/:id/calificaciones" element={<PrivateRoute docenteOnly><LibroCalificaciones /></PrivateRoute>} />
          <Route path="/docente/entregas-pendientes" element={<PrivateRoute docenteOnly><EntregasPendientes /></PrivateRoute>} />

          {/* Ruta por defecto */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
                  <a href="/dashboard" className="btn btn-primary">
                    Volver al Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
