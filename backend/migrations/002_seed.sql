-- ================================================================
-- FLY NC — DATOS INICIALES (seed)
-- Todos los datos reales extraídos de flync.virtuagym.com
-- ================================================================

-- Negocio
INSERT INTO negocio (nombre, nombre_legal, descripcion, calle, codigo_postal, ciudad, telefono, email, horario_24h, iva_defecto, titular_cuenta, iban, bic)
VALUES ('FLY NC (PLATINIUMBUSINESS SLU)', 'PLATINIUMBUSINESS SLU', 'CENTRO DE ALTO RENDIMIENTO', 'C/MONCAYO', '28810', 'Alcobendas', '744681017', 'flync2009@gmail.com', TRUE, 21.00, 'PLATINIUM BUSINES SLU', 'ES0400610404750002820115', 'BMARES2M');

-- Horario apertura (24h todos los días)
INSERT INTO horario_apertura (dia_semana, abierto_24h) VALUES
  (0, TRUE),(1, TRUE),(2, TRUE),(3, TRUE),(4, TRUE),(5, TRUE),(6, TRUE);

-- Admin por defecto (contraseña: Admin2024! — CAMBIAR EN PRODUCCIÓN)
INSERT INTO usuarios (email, password_hash, rol, nombre, apellidos, activo)
VALUES (
  'admin@flync.es',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMT6Ge37kPSZ4p1yJ8M7lZQiYq',
  'admin', 'Santiago', 'Campuzano Martinez', TRUE
);

-- Entrenadores reales de FLY NC
INSERT INTO usuarios (email, password_hash, rol, nombre, apellidos, activo) VALUES
  ('jose@flync.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMT6Ge37kPSZ4p1yJ8M7lZQiYq', 'entrenador', 'José', 'BJ Trainer', TRUE),
  ('mariajose@flync.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMT6Ge37kPSZ4p1yJ8M7lZQiYq', 'entrenador', 'Maria Jose', 'Panero', TRUE),
  ('marcos@flync.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMT6Ge37kPSZ4p1yJ8M7lZQiYq', 'entrenador', 'Marcos', 'Grana', TRUE);

-- Tipos de crédito (8 tipos reales de FLY NC)
INSERT INTO tipos_credito (nombre, descripcion, color, icono) VALUES
  ('Alquiler cancha', 'Acceso a cancha de baloncesto', '#378ADD', 'basketball'),
  ('Clases Grupales', 'Asistencia a clases grupales dirigidas', '#7F77DD', 'users'),
  ('Entrada', 'Acceso general al gimnasio', '#1D9E75', 'door-enter'),
  ('Entrenamiento Grupal Calistenia', 'Clases grupales calistenia, boxeo, rehabilitación', '#D85A30', 'boxing'),
  ('Entrenamiento Personal', 'Sesiones individuales con entrenador', '#BA7517', 'star'),
  ('GYM', 'Acceso a sala de pesas y musculación', '#639922', 'barbell'),
  ('Nutricion/Presoterapia', 'Servicios de nutrición y presoterapia', '#D4537E', 'heart'),
  ('Tecnificacion', 'Sesiones técnicas de baloncesto', '#185FA5', 'target');

-- Salas (5 salas reales)
INSERT INTO salas (nombre, descripcion, aforo_maximo, color, orden) VALUES
  ('Cancha Baloncesto', 'Cancha de baloncesto y alquiler por horas', 3, '#378ADD', 1),
  ('Tecnificacion', 'Sala de tecnificación de baloncesto', 4, '#185FA5', 2),
  ('Clases Dirigidas', 'Sala principal de clases grupales dirigidas', 12, '#7F77DD', 3),
  ('Grupal Calistenia', 'Área de calistenia, boxeo y rehabilitación grupal', 6, '#D85A30', 4),
  ('GYM', 'Sala de musculación, pesas y cardio libre', 6, '#1D9E75', 5);

-- Tipos de actividad (20 actividades reales)
INSERT INTO tipos_actividad (nombre, duracion_minutos, color, tipo_credito_id, creditos_coste) VALUES
  ('Alquiler Cancha', 60, '#378ADD', 1, 1),
  ('BodyPower', 60, '#639922', 2, 1),
  ('Boxeo', 60, '#D85A30', 4, 1),
  ('Boxeo de 14 a 18', 60, '#D85A30', 4, 1),
  ('Boxeo de 5 a 7', 60, '#D85A30', 4, 1),
  ('Boxeo de 8 a 13', 60, '#D85A30', 4, 1),
  ('Calistenia 15 a 18 anos', 60, '#BA7517', 4, 1),
  ('Calistenia infantil', 60, '#BA7517', 4, 1),
  ('Cardiobox', 60, '#D85A30', 4, 1),
  ('Entrenamiento Funcional', 60, '#1D9E75', 2, 1),
  ('GAP', 60, '#D4537E', 2, 1),
  ('GYM Libre', 60, '#639922', 6, 1),
  ('Hipopresivos', 60, '#D4537E', 2, 1),
  ('Maquina de Tiro y Dribling', 60, '#185FA5', 8, 1),
  ('Movilidad mayores', 60, '#9FE1CB', 4, 1),
  ('Movilidad y estiramientos', 60, '#9FE1CB', 4, 1),
  ('Movilidad y Rehabilitacion', 60, '#9FE1CB', 4, 1),
  ('Pilates', 60, '#7F77DD', 2, 1),
  ('Preparacion oposiciones', 60, '#888780', 2, 1),
  ('Yoga', 60, '#7F77DD', 2, 1);

-- Categorías de membresía (7 categorías)
INSERT INTO categorias_membresia (nombre, orden) VALUES
  ('Membresia por defecto', 1),
  ('Clases grupales', 2),
  ('Clases Grupales + GYM', 3),
  ('Entrenamientos personales', 4),
  ('Grupo Iniciacion Calistenia', 5),
  ('GYM', 6),
  ('Tecnificacion', 7);

-- ── MEMBRESÍAS (33 membresías reales) ─────────────────────────────
-- Membresía por defecto
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('Acceso Cancha 1h sin monitor + 1h gym Gratis', 1, 60.00, 1, 'meses', 'Membresias'),
  ('Tecnificacion FLY Tiro+Dribling+fuerza', 1, 40.00, 1, 'meses', 'Membresias');

-- Créditos membresías por defecto
INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (1, 1, 1, 'mensual'), (1, 6, 1, 'mensual'),
  (2, 8, 1, 'mensual');

-- Clases grupales
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('4 Sesiones 1h Clases Grupales', 2, 25.00, 1, 'meses', 'Membresias'),           -- id 3
  ('8 Sesiones 1h Clases Grupales', 2, 35.00, 1, 'meses', 'Membresias'),           -- id 4
  ('8 Sesiones 1h Clases Grupales(ANTIGUA)', 2, 35.00, 1, 'meses', 'Membresias'), -- id 5
  ('12 Sesiones 1h Clases Grupales', 2, 50.00, 1, 'meses', 'Membresias'),          -- id 6
  ('22 sesiones Grupales al Mes', 2, 89.00, 1, 'meses', 'Membresias'),             -- id 7
  ('BIMENSUAL 13 Sesiones Grupales', 2, 90.00, 2, 'meses', 'Membresias'),          -- id 8
  ('Plaza fija reserva prioritaria 8 Sesiones', 2, 55.00, 1, 'meses', 'Membresias'), -- id 9
  ('Plaza fija reserva prioritaria 12 Sesiones', 2, 70.00, 1, 'meses', 'Membresias'); -- id 10

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (3, 2, 4, 'mensual'),
  (4, 2, 8, 'mensual'),
  (5, 2, 8, 'mensual'),
  (6, 2, 12, 'mensual'),
  (7, 2, 22, 'mensual'),
  (8, 2, 13, 'mensual'),
  (9, 2, 8, 'mensual'),
  (10, 2, 12, 'mensual');

-- Clases Grupales + GYM
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('8 Clases Grupales + 8 de GYM', 3, 50.00, 1, 'meses', 'Membresias'),           -- id 11
  ('8 Clases Grupales + 8 de GYM(ANTIGUA)', 3, 50.00, 1, 'meses', 'Membresias');  -- id 12

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (11, 2, 8, 'mensual'), (11, 6, 8, 'mensual'),
  (12, 2, 8, 'mensual'), (12, 6, 8, 'mensual');

-- Entrenamientos personales
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, descripcion, categoria_ingreso) VALUES
  ('Entrenamiento Personal 1 sesion', 4, 40.00, 1, 'meses', '1 sesion individual', 'Entrenamiento personal'),                  -- id 13
  ('Entrenamiento Personal 1 dia al mes', 4, 90.00, 1, 'meses', '+ 19 accesos gym gratis · 1 con entrenador + 19 por libre', 'Entrenamiento personal'), -- id 14
  ('Entrenamiento Personal 1 dia por semana', 4, 140.00, 1, 'meses', '1 dia/semana entrenamiento personal', 'Entrenamiento personal'),    -- id 15
  ('Entrenamiento Personal 1 dia por semana(ANTIGUO)', 4, 140.00, 1, 'meses', 'Plan antiguo 1 dia/semana', 'Entrenamiento personal'),    -- id 16
  ('Entrenamiento Personal 2 dia por semana', 4, 240.00, 1, 'meses', '2 dias/semana entrenamiento personal', 'Entrenamiento personal'),  -- id 17
  ('Entrenamiento Personal 3 dias por semana', 4, 340.00, 1, 'meses', '3 dias/semana entrenamiento personal', 'Entrenamiento personal'); -- id 18

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (13, 5, 1, 'mensual'),
  (14, 5, 1, 'mensual'), (14, 3, 20, 'mensual'),
  (15, 5, 4, 'mensual'), (15, 3, 20, 'mensual'),
  (16, 5, 4, 'mensual'),
  (17, 5, 8, 'mensual'), (17, 3, 20, 'mensual'),
  (18, 5, 12, 'mensual'), (18, 3, 20, 'mensual');

-- Grupo Iniciación Calistenia
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('Grupal Calistenia/Boxeo/Rehabilitacion 4 sesiones', 5, 45.00, 1, 'meses', 'Membresias'),   -- id 19
  ('Grupal Calistenia/Boxeo/Rehabilitacion 8 sesiones', 5, 70.00, 1, 'meses', 'Membresias'),   -- id 20
  ('Grupal Calistenia/Boxeo/Rehabilitacion 12 sesiones', 5, 100.00, 1, 'meses', 'Membresias'), -- id 21
  ('Entrenamiento Grupal Calistenia/Boxeo 4 sesiones', 5, 45.00, 1, 'meses', 'Membresias'),    -- id 22
  ('Entrenamiento Grupal Calistenia/Boxeo 8 sesiones', 5, 70.00, 1, 'meses', 'Membresias'),    -- id 23
  ('Entrenamiento Grupal Calistenia/Boxeo 12 sesiones', 5, 100.00, 1, 'meses', 'Membresias');  -- id 24

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (19, 4, 4, 'mensual'),
  (20, 4, 8, 'mensual'),
  (21, 4, 12, 'mensual'),
  (22, 4, 4, 'mensual'),
  (23, 4, 8, 'mensual'),
  (24, 4, 12, 'mensual');

-- GYM
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('8 Sesiones Gym +1 gratis', 6, 29.00, 1, 'meses', 'Membresias'),        -- id 25
  ('20 Sesiones Gym +1 de regalo', 6, 39.00, 1, 'meses', 'Membresias'),    -- id 26
  ('30 Sesiones Gym +1 Gratis', 6, 49.00, 1, 'meses', 'Membresias'),       -- id 27
  ('PASE DE 1 SESION LIBRE', 6, 10.00, 1, 'dias', 'Membresias');           -- id 28

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (25, 6, 9, 'mensual'),
  (26, 6, 21, 'mensual'),
  (27, 6, 31, 'mensual'),
  (28, 6, 1, 'una_vez');

-- Tecnificación
INSERT INTO membresias (nombre, categoria_id, precio, duracion_cantidad, duracion_unidad, categoria_ingreso) VALUES
  ('1 sesion 3 O 4 JUGADORES Tecnificacion FLY Tiro+Dribling', 7, 25.00, 1, 'meses', 'Membresias'),              -- id 29
  ('1 sesion DOS JUGADORES Tecnificacion FLY Tiro+Dribling', 7, 30.00, 1, 'meses', 'Membresias'),                -- id 30
  ('1 sesion INDIVIDUAL Tecnificacion FLY Tiro+Dribling+fuerza', 7, 40.00, 1, 'meses', 'Membresias'),            -- id 31
  ('4 sesiones INDIVIDUALES Tecnificacion FLY Tiro+Dribling+fuerza', 7, 120.00, 1, 'meses', 'Membresias'),       -- id 32
  ('6 sesiones INDIVIDUALES Tecnificacion FLY Tiro+Dribling+fuerza', 7, 180.00, 1, 'meses', 'Membresias');       -- id 33

INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, frecuencia) VALUES
  (29, 8, 1, 'mensual'),
  (30, 8, 1, 'mensual'),
  (31, 8, 1, 'mensual'),
  (32, 8, 4, 'mensual'),
  (33, 8, 6, 'mensual');
