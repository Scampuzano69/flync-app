-- ================================================================
-- FLY NC GYM MANAGEMENT SYSTEM — DATABASE SCHEMA v1.0
-- Basado en análisis completo de flync.virtuagym.com
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Negocio ──────────────────────────────────────────────────────
CREATE TABLE negocio (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL DEFAULT 'FLY NC (PLATINIUMBUSINESS SLU)',
  nombre_legal VARCHAR(200) DEFAULT 'PLATINIUMBUSINESS SLU',
  descripcion TEXT DEFAULT 'CENTRO DE ALTO RENDIMIENTO',
  calle VARCHAR(200) DEFAULT 'C/MONCAYO',
  codigo_postal VARCHAR(10) DEFAULT '28810',
  ciudad VARCHAR(100) DEFAULT 'Alcobendas',
  pais VARCHAR(50) DEFAULT 'España',
  telefono VARCHAR(20) DEFAULT '744681017',
  email VARCHAR(150) DEFAULT 'flync2009@gmail.com',
  website VARCHAR(200),
  logo_url TEXT,
  banner_url TEXT,
  iva_defecto DECIMAL(5,2) DEFAULT 21.00,
  moneda VARCHAR(3) DEFAULT 'EUR',
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  titular_cuenta VARCHAR(200) DEFAULT 'PLATINIUM BUSINES SLU',
  iban VARCHAR(35) DEFAULT 'ES0400610404750002820115',
  bic VARCHAR(15) DEFAULT 'BMARES2M',
  horario_24h BOOLEAN DEFAULT TRUE,
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  stripe_webhook_secret TEXT,
  imc2_api_key TEXT,
  imc2_base_url TEXT DEFAULT 'https://api.imc2simplifica.com',
  imc2_device_id TEXT DEFAULT 'entrada_principal',
  smtp_host VARCHAR(100),
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(200),
  smtp_pass TEXT,
  smtp_from VARCHAR(200) DEFAULT 'FLY NC <noreply@flync.es>',
  firebase_server_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Horario apertura ─────────────────────────────────────────────
CREATE TABLE horario_apertura (
  id SERIAL PRIMARY KEY,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  abierto_24h BOOLEAN DEFAULT TRUE,
  hora_apertura TIME,
  hora_cierre TIME,
  cerrado BOOLEAN DEFAULT FALSE
);

-- ── Usuarios ─────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(200) UNIQUE NOT NULL,
  email_verificado BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(200) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'socio'
    CHECK (rol IN ('superadmin','admin','staff','entrenador','socio')),
  activo BOOLEAN DEFAULT TRUE,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100),
  telefono VARCHAR(25),
  fecha_nacimiento DATE,
  dni VARCHAR(20),
  genero VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  codigo_postal VARCHAR(10),
  pais VARCHAR(50) DEFAULT 'España',
  avatar_url TEXT,
  emergency_nombre VARCHAR(100),
  emergency_telefono VARCHAR(25),
  notas TEXT,
  stripe_customer_id VARCHAR(100),
  push_token TEXT,
  qr_secret VARCHAR(100) DEFAULT encode(gen_random_bytes(32), 'hex'),
  ultima_visita TIMESTAMPTZ,
  total_visitas INTEGER DEFAULT 0,
  fecha_alta DATE DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  consentimiento_rgpd BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- ── Refresh tokens ───────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  dispositivo VARCHAR(200),
  ip VARCHAR(50),
  expira_en TIMESTAMPTZ NOT NULL,
  revocado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rt_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_rt_token ON refresh_tokens(token);

-- ── QR Tokens (rotan c/90s) ──────────────────────────────────────
CREATE TABLE qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_token ON qr_tokens(token);
CREATE INDEX idx_qr_usuario ON qr_tokens(usuario_id);

-- ── Tipos de crédito ─────────────────────────────────────────────
CREATE TABLE tipos_credito (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#1D9E75',
  icono VARCHAR(50) DEFAULT 'star',
  periodo_deducible VARCHAR(30) DEFAULT 'inmediato',
  minimo_saldo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Salas ────────────────────────────────────────────────────────
CREATE TABLE salas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  aforo_maximo INTEGER DEFAULT 20,
  color VARCHAR(20) DEFAULT '#1D9E75',
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
);

-- ── Tipos de actividad ───────────────────────────────────────────
CREATE TABLE tipos_actividad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  duracion_minutos INTEGER DEFAULT 60,
  color VARCHAR(20),
  tipo_credito_id INTEGER REFERENCES tipos_credito(id),
  creditos_coste INTEGER DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE
);

-- ── Categorías membresía ─────────────────────────────────────────
CREATE TABLE categorias_membresia (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
);

-- ── Membresías ───────────────────────────────────────────────────
CREATE TABLE membresias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(250) NOT NULL,
  descripcion TEXT,
  descripcion_publica TEXT,
  categoria_id INTEGER REFERENCES categorias_membresia(id),
  precio DECIMAL(10,2) NOT NULL,
  precio_prolongacion DECIMAL(10,2),
  precio_matricula DECIMAL(10,2) DEFAULT 0,
  periodo_gratuito_dias INTEGER DEFAULT 0,
  duracion_cantidad INTEGER DEFAULT 1,
  duracion_unidad VARCHAR(20) DEFAULT 'meses'
    CHECK (duracion_unidad IN ('dias','semanas','meses','anos')),
  renovacion_automatica BOOLEAN DEFAULT FALSE,
  metodo_pago_defecto VARCHAR(50) DEFAULT 'tarjeta',
  dias_factura_antes INTEGER DEFAULT 7,
  horas_acceso VARCHAR(20) DEFAULT 'sin_restriccion',
  categoria_ingreso VARCHAR(50) DEFAULT 'Membresias',
  visible_tienda BOOLEAN DEFAULT TRUE,
  terminos_especificos TEXT,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memb_cat ON membresias(categoria_id);
CREATE INDEX idx_memb_activo ON membresias(activo);

-- ── Créditos de membresía ────────────────────────────────────────
CREATE TABLE membresia_creditos (
  id SERIAL PRIMARY KEY,
  membresia_id INTEGER NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  tipo_credito_id INTEGER NOT NULL REFERENCES tipos_credito(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  es_ilimitado BOOLEAN DEFAULT FALSE,
  frecuencia VARCHAR(20) DEFAULT 'una_vez'
    CHECK (frecuencia IN ('una_vez','diario','semanal','mensual')),
  validez_dias INTEGER,
  extra_inicio INTEGER DEFAULT 0
);

CREATE INDEX idx_mc_membresia ON membresia_creditos(membresia_id);

-- ── Contratos ────────────────────────────────────────────────────
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  membresia_id INTEGER NOT NULL REFERENCES membresias(id),
  estado VARCHAR(25) DEFAULT 'activo'
    CHECK (estado IN ('activo','pausado','cancelado','vencido','pendiente_pago','pendiente_inicio')),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  fecha_pausa DATE,
  precio_pagado DECIMAL(10,2),
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_motivo TEXT,
  metodo_pago VARCHAR(50),
  stripe_subscription_id VARCHAR(150),
  auto_renovar BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contratos_usuario ON contratos(usuario_id);
CREATE INDEX idx_contratos_estado ON contratos(estado);

-- ── Créditos de usuario ──────────────────────────────────────────
CREATE TABLE creditos_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_credito_id INTEGER NOT NULL REFERENCES tipos_credito(id),
  contrato_id UUID REFERENCES contratos(id),
  cantidad_total INTEGER NOT NULL,
  cantidad_usada INTEGER DEFAULT 0,
  cantidad_disponible INTEGER GENERATED ALWAYS AS (cantidad_total - cantidad_usada) STORED,
  es_ilimitado BOOLEAN DEFAULT FALSE,
  fecha_caducidad TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  motivo VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cu_usuario ON creditos_usuario(usuario_id);
CREATE INDEX idx_cu_tipo ON creditos_usuario(tipo_credito_id);
CREATE INDEX idx_cu_activo ON creditos_usuario(activo);

-- ── Clases ───────────────────────────────────────────────────────
CREATE TABLE clases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sala_id INTEGER NOT NULL REFERENCES salas(id),
  tipo_actividad_id INTEGER NOT NULL REFERENCES tipos_actividad(id),
  entrenador_id UUID REFERENCES usuarios(id),
  titulo VARCHAR(200),
  descripcion TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  aforo_maximo INTEGER DEFAULT 8,
  credito_requerido_id INTEGER REFERENCES tipos_credito(id),
  creditos_coste INTEGER DEFAULT 1,
  precio_drop_in DECIMAL(10,2),
  recurrente BOOLEAN DEFAULT FALSE,
  recurrencia_tipo VARCHAR(20),
  recurrencia_dias INTEGER[],
  recurrencia_fin DATE,
  clase_padre_id UUID REFERENCES clases(id),
  cancelada BOOLEAN DEFAULT FALSE,
  cancelada_motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clases_fecha ON clases(fecha_inicio);
CREATE INDEX idx_clases_sala ON clases(sala_id);

-- ── Reservas ─────────────────────────────────────────────────────
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado VARCHAR(20) DEFAULT 'confirmada'
    CHECK (estado IN ('confirmada','cancelada','lista_espera','asistio','no_asistio')),
  credito_usado_id UUID REFERENCES creditos_usuario(id),
  creditos_descontados INTEGER DEFAULT 0,
  fecha_reserva TIMESTAMPTZ DEFAULT NOW(),
  fecha_cancelacion TIMESTAMPTZ,
  notas TEXT,
  UNIQUE(clase_id, usuario_id)
);

CREATE INDEX idx_reservas_clase ON reservas(clase_id);
CREATE INDEX idx_reservas_usuario ON reservas(usuario_id);

-- ── Accesos ──────────────────────────────────────────────────────
CREATE TABLE accesos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  tipo VARCHAR(20) DEFAULT 'entrada' CHECK (tipo IN ('entrada','salida')),
  metodo VARCHAR(20) DEFAULT 'qr'
    CHECK (metodo IN ('qr','rfid','pin','manual','app')),
  credito_consumido_id UUID REFERENCES creditos_usuario(id),
  tipo_credito_id INTEGER REFERENCES tipos_credito(id),
  resultado VARCHAR(25) DEFAULT 'ok'
    CHECK (resultado IN ('ok','denegado','sin_creditos','caducado','no_encontrado','inactivo')),
  motivo_denegacion TEXT,
  dispositivo_id VARCHAR(100),
  dispositivo_nombre VARCHAR(100) DEFAULT 'Terminal Entrada',
  qr_token VARCHAR(200),
  ip_origen VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accesos_usuario ON accesos(usuario_id);
CREATE INDEX idx_accesos_timestamp ON accesos(timestamp);
CREATE INDEX idx_accesos_resultado ON accesos(resultado);

-- ── Pagos ────────────────────────────────────────────────────────
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contrato_id UUID REFERENCES contratos(id),
  concepto VARCHAR(300) NOT NULL,
  importe_base DECIMAL(10,2) NOT NULL,
  iva_porcentaje DECIMAL(5,2) DEFAULT 21.00,
  importe_iva DECIMAL(10,2),
  importe_total DECIMAL(10,2),
  descuento DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','pagado','fallido','reembolsado','cancelado')),
  metodo_pago VARCHAR(50),
  stripe_payment_intent_id VARCHAR(200),
  stripe_invoice_id VARCHAR(200),
  numero_factura VARCHAR(50) UNIQUE,
  serie_factura VARCHAR(20) DEFAULT 'FLY',
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  fecha_pago TIMESTAMPTZ,
  categoria_ingreso VARCHAR(50) DEFAULT 'Membresias',
  notas TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_emision);

-- ── Notificaciones ───────────────────────────────────────────────
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'push'
    CHECK (tipo IN ('push','email','sms','interna')),
  destinatarios_tipo VARCHAR(50) DEFAULT 'todos',
  membresia_filtro INTEGER REFERENCES membresias(id),
  estado_envio VARCHAR(20) DEFAULT 'borrador',
  total_enviados INTEGER DEFAULT 0,
  total_abiertos INTEGER DEFAULT 0,
  enviado_por UUID REFERENCES usuarios(id),
  fecha_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Medidas progreso ─────────────────────────────────────────────
CREATE TABLE medidas_progreso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  peso DECIMAL(5,2),
  altura DECIMAL(5,2),
  grasa_corporal DECIMAL(5,2),
  masa_muscular DECIMAL(5,2),
  cintura DECIMAL(5,2),
  cadera DECIMAL(5,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Productos / POS ──────────────────────────────────────────────
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  categoria VARCHAR(100),
  imagen_url TEXT,
  activo BOOLEAN DEFAULT TRUE
);

-- ── Tareas ───────────────────────────────────────────────────────
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  asignado_a UUID REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'pendiente',
  prioridad VARCHAR(20) DEFAULT 'normal',
  fecha_vencimiento DATE,
  usuario_relacionado UUID REFERENCES usuarios(id),
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Trigger updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_u_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_c_updated BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_m_updated BEFORE UPDATE ON membresias FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_n_updated BEFORE UPDATE ON negocio FOR EACH ROW EXECUTE FUNCTION update_updated_at();
