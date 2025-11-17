// =======================
// api.js - REST API untuk ESP32 & bot.js (SAFE VERSION)
// =======================
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// AUTHENTICATION TOKEN (ISI SENDIRI)
// =======================
const AUTH_TOKEN = "YOUR_SECRET_API_TOKEN"; 
// contoh: "MyApiToken123!"


// =======================
// FOLDER LOGS
// =======================
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const accessLogStream = fs.createWriteStream(path.join(LOG_DIR, 'access.log'), { flags: 'a' });
const errorLogStream  = fs.createWriteStream(path.join(LOG_DIR, 'api_err.log'), { flags: 'a' });

app.use(morgan(':remote-addr - :method :url :status :response-time ms', { stream: accessLogStream }));


// =======================
// MIDDLEWARE AUTENTIKASI
// =======================
app.use("/api", (req, res, next) => {
  const token = req.query.token || req.headers["x-access-token"];

  if (!token || token !== AUTH_TOKEN) {
    const msg = `[AUTH_FAIL] IP=${req.ip} Token=${token || "none"} Time=${new Date().toISOString()}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'api_err.log'), msg);
    console.warn(msg.trim());
    return res.status(403).json({ error: "Forbidden: Invalid or missing token." });
  }
  next();
});


// =======================
// DATABASE CONFIG (ISI SENDIRI)
// =======================
const pool = mysql.createPool({
  host: 'YOUR_DB_HOST',         // contoh: 'localhost'
  user: 'YOUR_DB_USERNAME',     // contoh: 'sensor_user'
  password: 'YOUR_DB_PASSWORD', // contoh: 'MyStrongPass123'
  database: 'YOUR_DB_NAME'      // contoh: 'sensor_bot'
});


// =======================
// API: STATUS SERVER
// =======================
app.get('/api/status', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM sensor_data');
    res.json({
      status: 'online',
      total_records: rows[0].total,
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
      message: 'API active and ready to receive data.'
    });
  } catch (err) {
    const msg = `[ERROR] /api/status - ${err.message} @${new Date().toISOString()}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'api_err.log'), msg);
    res.status(500).json({ error: err.message });
  }
});


// =======================
// API: INPUT DATA SENSOR
// =======================
app.post('/api/sensor', async (req, res) => {
  try {
    const { ph_in, ph_out, temp_in, temp_out } = req.body;

    if ([ph_in, ph_out, temp_in, temp_out].some(v => v === undefined)) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    await pool.execute(
      `INSERT INTO sensor_data (ph_in, ph_out, temp_in, temp_out, timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [ph_in, ph_out, temp_in, temp_out]
    );

    const msg = `[DATA_OK] IP=${req.ip} pH_IN=${ph_in} pH_OUT=${ph_out} Temp_IN=${temp_in} Temp_OUT=${temp_out} Time=${new Date().toISOString()}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'access.log'), msg);
    console.log(msg.trim());

    res.json({ status: 'ok', message: 'Sensor data saved successfully.' });
  } catch (err) {
    const msg = `[ERROR] /api/sensor - ${err.message} @${new Date().toISOString()}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'api_err.log'), msg);
    res.status(500).json({ error: 'Failed to save data.' });
  }
});


// =======================
// API: DATA TERBARU
// =======================
app.get('/api/data/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ph_in, ph_out, temp_in, temp_out, timestamp 
      FROM sensor_data 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    if (!rows.length) return res.status(404).json({ error: 'No sensor data found.' });
    res.json(rows[0]);
  } catch (err) {
    const msg = `[ERROR] /api/data/latest - ${err.message}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'api_err.log'), msg);
    res.status(500).json({ error: err.message });
  }
});


// =======================
// API: DATA 30 HARI TERAKHIR
// =======================
app.get('/api/data/last30days', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE(timestamp) AS day,
             AVG(ph_in) AS avg_ph_in,
             AVG(ph_out) AS avg_ph_out,
             AVG(temp_in) AS avg_temp_in,
             AVG(temp_out) AS avg_temp_out,
             COUNT(*) AS total
      FROM sensor_data
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp)
    `);
    res.json(rows);
  } catch (err) {
    const msg = `[ERROR] /api/data/last30days - ${err.message}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'api_err.log'), msg);
    res.status(500).json({ error: err.message });
  }
});


// =======================
// RUN SERVER
// =======================
const PORT = 3000; // ganti jika perlu
app.listen(PORT, () => {
  console.log(`API running at http://0.0.0.0:${PORT}`);
});
