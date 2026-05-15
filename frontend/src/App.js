import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { authAPI } from './services/api';

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('flync_access_token');
    if (!token) { setLoading(false); return; }
    try {
      const me = await authAPI.me();
      setUser(me);
    } catch {
      localStorage.removeItem('flync_access_token');
      localStorage.removeItem('flync_refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem('flync_access_token', data.access_token);
    localStorage.setItem('flync_refresh_token', data.refresh_token);
    setUser(data.usuario);
    return data;
  };

  const logout = async () => {
    try { await authAPI.logout(localStorage.getItem('flync_refresh_token')); } catch {}
    localStorage.clear();
    setUser(null);
  };

  const isAdmin = user && ['superadmin','admin','staff'].includes(user.rol);
  const isEntrenador = user && ['superadmin','admin','staff','entrenador'].includes(user.rol);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isEntrenador }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children, requireAdmin }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0b0b0e',color:'#f97316',fontSize:18,gap:12}}>🔥 Cargando FLY NC...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/app/dashboard" replace />;
  return children;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } } });

const Login = React.lazy(() => import('./pages/Login.jsx'));
const Layout = React.lazy(() => import('./pages/Layout.jsx'));
const Dashboard = React.lazy(() => import('./pages/Dashboard.jsx'));
const Socios = React.lazy(() => import('./pages/Socios.jsx'));
const SocioDetalle = React.lazy(() => import('./pages/SocioDetalle.jsx'));
const Membresias = React.lazy(() => import('./pages/Membresias.jsx'));
const { Horario, AccesoQR, Pagos, Notificaciones, Configuracion, MiQR, MisReservas } = React.lazy(() => import('./pages/OtherPages.jsx')) || {};

const Spinner = () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0b0b0e',color:'#f97316'}}>🔥 Cargando...</div>;

// Lazy individual para las otras páginas
const LazyPage = (importFn) => React.lazy(async () => {
  const mod = await importFn();
  return mod;
});

const HorarioPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.Horario})));
const AccesoPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.AccesoQR})));
const PagosPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.Pagos})));
const NotifPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.Notificaciones})));
const ConfigPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.Configuracion})));
const MiQRPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.MiQR})));
const MisReservasPage = React.lazy(() => import('./pages/OtherPages.jsx').then(m=>({default:m.MisReservas})));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <React.Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="socios" element={<ProtectedRoute requireAdmin><Socios /></ProtectedRoute>} />
                <Route path="socios/:id" element={<ProtectedRoute requireAdmin><SocioDetalle /></ProtectedRoute>} />
                <Route path="horario" element={<HorarioPage />} />
                <Route path="acceso" element={<ProtectedRoute requireAdmin><AccesoPage /></ProtectedRoute>} />
                <Route path="membresias" element={<ProtectedRoute requireAdmin><Membresias /></ProtectedRoute>} />
                <Route path="pagos" element={<ProtectedRoute requireAdmin><PagosPage /></ProtectedRoute>} />
                <Route path="notificaciones" element={<ProtectedRoute requireAdmin><NotifPage /></ProtectedRoute>} />
                <Route path="config" element={<ProtectedRoute requireAdmin><ConfigPage /></ProtectedRoute>} />
                <Route path="mi-qr" element={<MiQRPage />} />
                <Route path="mis-reservas" element={<MisReservasPage />} />
              </Route>
            </Routes>
          </React.Suspense>
          <Toaster position="bottom-right" toastOptions={{
            style: { background:'#1d1d25', color:'#eeeef5', border:'1px solid rgba(255,255,255,.1)' },
            success: { iconTheme: { primary:'#22c55e', secondary:'#fff' } },
            error: { iconTheme: { primary:'#ef4444', secondary:'#fff' } }
          }} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
