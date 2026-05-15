# 🔥 FLY NC — Sistema de Gestión de Gimnasio

**Sustituto completo de Virtuagym** para FLY NC (PLATINIUMBUSINESS SLU).  
Réplica exacta de `flync.virtuagym.com` — 309 socios, 33 membresías, 5 salas, iMC² TSimplifica.

---

## 📁 Estructura del proyecto

```
flync-app/
├── backend/                  ← API REST Node.js + Express + PostgreSQL
│   ├── migrations/
│   │   ├── 001_schema.sql    — Todas las tablas (socios, membresías, créditos, accesos...)
│   │   └── 002_seed.sql      — Datos reales: 33 membresías, 8 créditos, 5 salas, 20 actividades
│   ├── src/
│   │   ├── config/db.js      — Pool PostgreSQL con transacciones
│   │   ├── middleware/auth.js — JWT + roles (admin/staff/entrenador/socio)
│   │   ├── routes/           — 16 módulos: auth, socios, membresías, clases, reservas, accesos, QR...
│   │   └── services/cron.js  — Jobs: contratos vencidos, QR cleanup, recordatorios
│   └── Dockerfile
├── frontend/                 ← Panel admin React + Portal socio
│   ├── src/
│   │   ├── pages/            — Dashboard, Socios, Horario, Membresías, Pagos, Acceso QR...
│   │   ├── components/ui/    — Componentes reutilizables (Table, Modal, Input, Badge...)
│   │   └── services/api.js   — Servicio API completo con auto-refresh JWT
│   └── Dockerfile
├── docker/nginx.conf         ← Reverse proxy con rate limiting
├── docker-compose.yml        ← Stack completo con 1 comando
├── .env.example              ← Variables de entorno a configurar
└── README.md                 ← Este archivo
```

---

## 🚀 OPCIÓN A: Arrancar en local (para probar)

### Requisitos
- Docker Desktop instalado
- 4GB RAM mínimo

### Pasos

```bash
# 1. Clonar / descomprimir el proyecto
cd flync-app

# 2. Crear el .env a partir del ejemplo
cp .env.example .env
# Editar .env con tus valores (mínimo cambiar DB_PASSWORD y JWT_SECRET)

# 3. Arrancar todo con Docker Compose
docker compose up -d

# 4. Esperar ~30 segundos y acceder a:
# Panel admin:  http://localhost:3000
# API:          http://localhost:3001/api/health
```

**Credenciales iniciales:**
- Email: `admin@flync.es`
- Contraseña: `Admin2024!` ← ¡Cámbiala nada más entrar!

---

## ☁️ OPCIÓN B: Desplegar en Railway (recomendado, ~15€/mes)

Railway es la opción más sencilla para tener el sistema accesible desde cualquier sitio.

### 1. Crear cuenta en Railway
Ve a [railway.app](https://railway.app) y conecta tu cuenta de GitHub.

### 2. Subir el código a GitHub

```bash
cd flync-app
git init
git add .
git commit -m "FLY NC inicial"
git remote add origin https://github.com/TU_USUARIO/flync-app.git
git push -u origin main
```

### 3. Crear proyecto en Railway

1. Dashboard Railway → **New Project** → **Deploy from GitHub**
2. Selecciona el repositorio `flync-app`
3. Railway detecta el `docker-compose.yml` automáticamente

### 4. Configurar variables de entorno en Railway

En el panel de Railway, ve a cada servicio y añade estas variables:

**Servicio `backend`:**
```
DB_PASSWORD=contraseña_segura_aqui
JWT_SECRET=secreto_64_caracteres_minimo
JWT_REFRESH_SECRET=otro_secreto_diferente
STRIPE_SECRET_KEY=sk_live_...
IMC2_API_KEY=tu_api_key_imc2
SMTP_USER=flync2009@gmail.com
SMTP_PASS=app_password_gmail
```

**Servicio `frontend`:**
```
REACT_APP_API_URL=https://tu-backend.railway.app
```

### 5. Obtener las URLs

Después del despliegue, Railway te da URLs como:
- Frontend: `https://flync-web-xxx.railway.app`
- Backend: `https://flync-api-xxx.railway.app`
- PostgreSQL: conexión interna automática

### 6. Configurar dominio personalizado (opcional)

En Railway: Settings → Domains → Añadir `admin.flync.es` y `api.flync.es`  
Luego en tu DNS: añadir registros CNAME apuntando a Railway.

---

## ☁️ OPCIÓN C: Desplegar en VPS (máximo control)

Para un VPS en Hetzner, DigitalOcean, Contabo, etc.

```bash
# 1. Conectar al VPS
ssh root@IP_DEL_VPS

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# 3. Subir el proyecto al VPS
scp -r flync-app/ root@IP_DEL_VPS:/opt/flync-app

# 4. Configurar variables
cd /opt/flync-app
cp .env.example .env
nano .env  # Editar con valores reales

# 5. Arrancar
docker compose up -d

# 6. Ver logs
docker compose logs -f backend

# 7. SSL con Certbot (HTTPS)
apt install certbot nginx
certbot --nginx -d admin.flync.es -d api.flync.es
```

---

## ☁️ OPCIÓN D: Render.com (también bueno, plan gratuito disponible)

1. Crear cuenta en [render.com](https://render.com)
2. New → **Blueprint** → conectar GitHub
3. Render lee el `docker-compose.yml` automáticamente
4. Configurar variables de entorno en el dashboard
5. Deploy automático en cada `git push`

---

## 📱 App móvil (iOS + Android)

La app móvil React Native se conecta a la misma API. Para compilarla:

```bash
# Instalar dependencias
cd mobile
npm install

# Configurar URL de la API
echo "API_URL=https://tu-api.railway.app" > .env

# Compilar para Android
npx react-native run-android

# Compilar para iOS (requiere Mac)
npx react-native run-ios
```

La app incluye:
- Login con JWT
- QR dinámico (rota cada 90s) para entrar al gimnasio
- Horario de clases y reservas
- Historial de accesos
- Ver créditos disponibles

---

## 🔌 Configurar el hardware iMC² TSimplifica

El terminal iMC² ya tienes la API comprada. Para conectarlo:

1. En el panel admin → **Configuración** → **iMC² TSimplifica**
2. Introduce tu **API Key** y **Device ID**
3. En la configuración del terminal iMC², establece el **webhook URL**:
   ```
   POST https://tu-api.railway.app/api/imc2/webhook
   ```
4. El terminal enviará el QR/RFID escaneado y recibirá `{ access: true/false }`

El QR del socio rota cada 90 segundos automáticamente desde la app móvil.

---

## 💳 Configurar Stripe (pagos online)

1. Crear cuenta en [stripe.com](https://stripe.com)
2. Obtener las claves API (Dashboard → Developers → API Keys)
3. En panel admin → **Configuración** → **Stripe**
4. Para recibir webhooks en producción:
   ```bash
   stripe listen --forward-to https://tu-api.railway.app/api/pagos/stripe/webhook
   ```

---

## 📧 Configurar email (Gmail)

1. Gmail → Configuración → Contraseñas de aplicación → Generar una para "FLY NC"
2. En `.env`: `SMTP_PASS=la_contraseña_de_16_caracteres`

---

## 🔑 Primeros pasos tras el despliegue

1. **Cambiar contraseña admin** → Panel → Perfil → Cambiar contraseña
2. **Importar socios de Virtuagym** → Panel → Socios → Importar CSV
3. **Configurar Stripe** si quieres pagos online
4. **Configurar iMC²** con tu API key
5. **Crear clases recurrentes** → Horario → Nueva clase → Recurrente semanal

---

## 🏋️ Datos pre-cargados (de flync.virtuagym.com)

| Dato | Cantidad |
|------|---------|
| Membresías | **33** en 7 categorías |
| Tipos de crédito | **8** (Entrada, GYM, Clases, Calistenia, EP, Cancha, Nutrición, Tecnificación) |
| Salas | **5** (Cancha Baloncesto, Tecnificación, Clases Dirigidas, Grupal Calistenia, GYM) |
| Tipos de actividad | **20** (Pilates, Yoga, Funcional, Boxeo, Calistenia...) |
| Categorías membresía | **7** |
| Horario | **24h/7días** como en Virtuagym |

---

## 💰 Costes estimados

| Servicio | Coste mensual |
|---------|--------------|
| Railway (backend + BD + frontend) | ~15€/mes |
| Alternativa VPS Hetzner (2 vCPU, 4GB) | ~5€/mes |
| Stripe | 1.4% + 0.25€ por transacción (solo si usas pagos online) |
| Dominio flync.es | ~10€/año |
| **Total** | **15-25€/mes** vs cientos con Virtuagym |

---

## 🛠️ Comandos útiles

```bash
# Ver estado de los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f postgres

# Reiniciar un servicio
docker compose restart backend

# Acceder a la base de datos
docker exec -it flync_db psql -U flync_user flync_db

# Backup de la base de datos
docker exec flync_db pg_dump -U flync_user flync_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20250514.sql | docker exec -i flync_db psql -U flync_user flync_db

# Actualizar el código
git pull
docker compose up -d --build
```

---

## 📞 Soporte

Sistema construido específicamente para **FLY NC (PLATINIUMBUSINESS SLU)**  
C/Moncayo, 28810 Alcobendas · flync2009@gmail.com · 744 681 017
