require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",");
app.use(cors({ origin: (origin, cb) => { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); cb(new Error("CORS: " + origin)); }, credentials: true }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
app.use("/api/", apiLimiter);

app.use("/api/auth",           require("./routes/auth"));
app.use("/api/socios",         require("./routes/socios"));
app.use("/api/membresias",     require("./routes/membresias"));
app.use("/api/creditos",       require("./routes/creditos"));
app.use("/api/contratos",      require("./routes/contratos"));
app.use("/api/clases",         require("./routes/clases"));
app.use("/api/reservas",       require("./routes/reservas"));
app.use("/api/accesos",        require("./routes/accesos"));
app.use("/api/qr",             require("./routes/qr"));
app.use("/api/pagos",          require("./routes/pagos"));
app.use("/api/notificaciones", require("./routes/notificaciones"));
app.use("/api/dashboard",      require("./routes/dashboard"));
app.use("/api/config",         require("./routes/config"));
app.use("/api/imc2",           require("./routes/imc2"));
app.use("/api/importar",       require("./routes/importar"));
app.use("/api/estadisticas",   require("./routes/estadisticas"));
app.use("/api/facturas",       require("./routes/facturas"));

app.get("/api/health", async (req, res) => {
  const db = require("./config/db");
  try { await db.query("SELECT 1"); res.json({ status: "ok", version: "1.0.0", sistema: "FLY NC Gym Management", db: "conectada", timestamp: new Date().toISOString() }); }
  catch(err) { res.status(503).json({ status: "error", db: "no conectada" }); }
});

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada: " + req.method + " " + req.path }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(err.status||500).json({ error: err.message||"Error interno" }); });

async function start() {
  if (process.env.DATABASE_URL) {
    const migrate = require("./config/migrate");
    await migrate();
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log("FLY NC API corriendo en puerto " + PORT);
  });
  require("./services/cron");
}

start().catch(err => { console.error("Error arrancando:", err); process.exit(1); });

module.exports = app;