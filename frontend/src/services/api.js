import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor: añadir token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flync_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401 (token expirado → refresh)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && error.response?.data?.code === 'TOKEN_EXPIRED') {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('flync_refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem('flync_access_token', data.access_token);
        localStorage.setItem('flync_refresh_token', data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  cambiarPassword: (data) => api.post('/auth/cambiar-password', data).then(r => r.data),
};

// ── SOCIOS ────────────────────────────────────────────────────────
export const sociosAPI = {
  listar: (params) => api.get('/socios', { params }).then(r => r.data),
  stats: () => api.get('/socios/stats').then(r => r.data),
  obtener: (id) => api.get(`/socios/${id}`).then(r => r.data),
  crear: (data) => api.post('/socios', data).then(r => r.data),
  actualizar: (id, data) => api.put(`/socios/${id}`, data).then(r => r.data),
  darBaja: (id) => api.delete(`/socios/${id}`).then(r => r.data),
  qr: (id) => api.get(`/socios/${id}/qr`).then(r => r.data),
  añadirCreditos: (id, data) => api.post(`/socios/${id}/creditos`, data).then(r => r.data),
  accesos: (id) => api.get(`/socios/${id}/accesos`).then(r => r.data),
  importarCSV: (socios) => api.post('/socios/importar-csv', { socios }).then(r => r.data),
};

// ── MEMBRESÍAS ────────────────────────────────────────────────────
export const membresiasAPI = {
  listar: (params) => api.get('/membresias', { params }).then(r => r.data),
  obtener: (id) => api.get(`/membresias/${id}`).then(r => r.data),
  crear: (data) => api.post('/membresias', data).then(r => r.data),
  actualizar: (id, data) => api.put(`/membresias/${id}`, data).then(r => r.data),
  eliminar: (id) => api.delete(`/membresias/${id}`).then(r => r.data),
  categorias: () => api.get('/membresias/categorias/todas').then(r => r.data),
  crearCategoria: (data) => api.post('/membresias/categorias', data).then(r => r.data),
};

// ── CRÉDITOS ──────────────────────────────────────────────────────
export const creditosAPI = {
  tipos: () => api.get('/creditos/tipos').then(r => r.data),
  crearTipo: (data) => api.post('/creditos/tipos', data).then(r => r.data),
  usuario: (id) => api.get(`/creditos/usuario/${id}`).then(r => r.data),
};

// ── CONTRATOS ─────────────────────────────────────────────────────
export const contratosAPI = {
  usuario: (id) => api.get(`/contratos/usuario/${id}`).then(r => r.data),
  crear: (data) => api.post('/contratos', data).then(r => r.data),
  cambiarEstado: (id, estado, motivo) => api.put(`/contratos/${id}/estado`, { estado, motivo }).then(r => r.data),
};

// ── CLASES ────────────────────────────────────────────────────────
export const clasesAPI = {
  listar: (params) => api.get('/clases', { params }).then(r => r.data),
  obtener: (id) => api.get(`/clases/${id}`).then(r => r.data),
  crear: (data) => api.post('/clases', data).then(r => r.data),
  actualizar: (id, data) => api.put(`/clases/${id}`, data).then(r => r.data),
  cancelar: (id, motivo) => api.delete(`/clases/${id}`, { data: { motivo } }).then(r => r.data),
  salas: () => api.get('/clases/salas').then(r => r.data),
  actividades: () => api.get('/clases/actividades').then(r => r.data),
};

// ── RESERVAS ──────────────────────────────────────────────────────
export const reservasAPI = {
  crear: (clase_id) => api.post('/reservas', { clase_id }).then(r => r.data),
  cancelar: (id) => api.delete(`/reservas/${id}`).then(r => r.data),
  misReservas: () => api.get('/reservas/mis-reservas').then(r => r.data),
};

// ── ACCESOS ───────────────────────────────────────────────────────
export const accesosAPI = {
  validar: (token, device_id) => api.post('/accesos/validar', { token, device_id }).then(r => r.data),
  listar: (params) => api.get('/accesos', { params }).then(r => r.data),
  hoy: () => api.get('/accesos/hoy').then(r => r.data),
  manual: (data) => api.post('/accesos/manual', data).then(r => r.data),
};

// ── QR ────────────────────────────────────────────────────────────
export const qrAPI = {
  generar: () => api.get('/qr/generar').then(r => r.data),
  socio: (id) => api.get(`/qr/socio/${id}`).then(r => r.data),
};

// ── PAGOS ─────────────────────────────────────────────────────────
export const pagosAPI = {
  listar: (params) => api.get('/pagos', { params }).then(r => r.data),
  crear: (data) => api.post('/pagos', data).then(r => r.data),
  resumen: () => api.get('/pagos/resumen').then(r => r.data),
};

// ── DASHBOARD ─────────────────────────────────────────────────────
export const dashboardAPI = {
  obtener: () => api.get('/dashboard').then(r => r.data),
};

// ── NOTIFICACIONES ────────────────────────────────────────────────
export const notificacionesAPI = {
  listar: () => api.get('/notificaciones').then(r => r.data),
  enviar: (data) => api.post('/notificaciones', data).then(r => r.data),
};

// ── CONFIG ────────────────────────────────────────────────────────
export const configAPI = {
  obtener: () => api.get('/config').then(r => r.data),
  actualizar: (data) => api.put('/config', data).then(r => r.data),
  stripe: (data) => api.put('/config/stripe', data).then(r => r.data),
  imc2: (data) => api.put('/config/imc2', data).then(r => r.data),
};

// ── ESTADÍSTICAS ──────────────────────────────────────────────────
export const statsAPI = {
  ingresos: () => api.get('/estadisticas/ingresos').then(r => r.data),
  accesosHora: () => api.get('/estadisticas/accesos-hora').then(r => r.data),
  retencion: () => api.get('/estadisticas/retencion').then(r => r.data),
};

// ── IMC2 ──────────────────────────────────────────────────────────
export const imc2API = {
  estado: () => api.get('/imc2/estado').then(r => r.data),
};

export default api;
