/* ============================================================
   BOT IPAL MONITORING - CLEAN VERSION FOR PUBLIC RELEASE
   Safe for GitHub · Sensitive Data Removed · Customizable PDF
   ============================================================ */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QuickChart = require('quickchart-js');
const axios = require('axios');
const dbConfig = require('./db-config');

// === FOLDER OUTPUT ===
const REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// === DATABASE POOL ===
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port || 3306,
  password: dbConfig.password || ''
});

// === KONFIGURASI BOT ===
const BOT_TIMEZONE = 'Asia/Jakarta';
const DASHBOARD_URL = 'https://your-dashboard-url.example.com'; // <-- UPDATE INI

// === ICON EMOJI ===
const EMOJI_MENU = '📂';
const EMOJI_STATUS = '📊';
const EMOJI_TEMP = '🌡️';
const EMOJI_TOTAL = '📋';
const EMOJI_QR = '📷';
const EMOJI_REPORT = '📆';

// === TEMA WARNA PDF ===
const PRIMARY_COLOR = '#4ade80';
const SECONDARY_COLOR = '#22c55e';

// ======================================================
// ==================== KELAS BOT =======================
// ======================================================
class SensorBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    this.setupEventHandlers();
  }

  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  // ======================================================
  // ================== PDF BULANAN =======================
  // ======================================================
  async buildPdf(filePath, { period, rows, chartBuffer }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const logoPath = path.join(__dirname, 'logo.png'); // <-- UPDATE LOGO SENDIRI

        // ================= MAKE YOUR OWN DESIGN =================
        // Ganti seluruh elemen PDF di bawah ini sesuai style kamu
        // =========================================================

        const addWatermark = () => {
          if (fs.existsSync(logoPath)) {
            doc.save();
            doc.opacity(0.05);
            const size = 260;
            doc.image(
              logoPath,
              (doc.page.width - size) / 2,
              (doc.page.height - size) / 2,
              { width: size }
            );
            doc.restore();
          }
        };

        addWatermark();

        // HEADER
        const headerH = 120;
        doc.rect(0, 0, doc.page.width, headerH).fill(PRIMARY_COLOR);

        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 35, 20, { fit: [70, 70] });
        }

        doc.fillColor('#fff')
          .fontSize(26)
          .font('Helvetica-Bold')
          .text('LAPORAN MONITORING IPAL', 120, 30);

        doc.fontSize(15)
          .font('Helvetica')
          .text(`Periode: ${period}`, 120, 70);

        doc.fontSize(10)
          .text(
            `Tanggal Cetak: ${moment().tz(BOT_TIMEZONE).format('DD MMM YYYY HH:mm')} WIB`,
            120,
            95
          );

        // Ringkasan
        const infoY = headerH + 30;
        doc.roundedRect(40, infoY, doc.page.width - 80, 60, 8).fill('#f7f7f7');

        doc.fillColor(SECONDARY_COLOR)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('RINGKASAN DATA', 60, infoY + 12);

        doc.fillColor('#333')
          .fontSize(10)
          .text(`Total hari terekam: ${rows.length}`, 60, infoY + 35);

        // Grafik
        const chartY = infoY + 90;
        doc.fillColor(SECONDARY_COLOR)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('GRAFIK TREN SENSOR', 40, chartY);

        doc.roundedRect(40, chartY + 30, doc.page.width - 80, 250, 10).stroke('#ddd');
        doc.image(chartBuffer, 45, chartY + 35, { fit: [doc.page.width - 90, 240] });

        // Halaman tabel
        doc.addPage();
        addWatermark();

        doc.fillColor(SECONDARY_COLOR)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('DATA HARIAN', 40, 40);

        const tableY = 80;
        const colX = [40, 130, 210, 300, 390, 480];

        // Header tabel
        doc.rect(40, tableY, doc.page.width - 80, 30).fill(PRIMARY_COLOR);
        doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');

        const headers = ['Tanggal', 'Suhu In', 'pH In', 'Suhu Out', 'pH Out', 'Jumlah'];
        headers.forEach((h, i) => {
          doc.text(h, colX[i], tableY + 10, { width: 80, align: 'center' });
        });

        let y = tableY + 35;
        doc.font('Helvetica').fontSize(9).fillColor('#333');

        rows.forEach(r => {
          if (y > 760) {
            doc.addPage();
            addWatermark();
            y = 40;
          }

          const vals = [
            moment(r.day).format('DD/MM/YYYY'),
            r.avg_temp_in?.toFixed(2) || '-',
            r.avg_ph_in?.toFixed(2) || '-',
            r.avg_temp_out?.toFixed(2) || '-',
            r.avg_ph_out?.toFixed(2) || '-',
            r.cnt
          ];

          vals.forEach((v, i) => {
            doc.text(String(v), colX[i], y, { width: 80, align: 'center' });
          });

          y += 25;
        });

        doc.end();
        stream.on('finish', resolve);
      } catch (err) {
        reject(err);
      }
    });
  }

  // ======================================================
  // ================== EVENT HANDLERS ====================
  // ======================================================
  setupEventHandlers() {
    this.client.on('qr', qr => {
      console.log(`\n${EMOJI_QR} Scan QR untuk login`);
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('Bot IPAL Monitoring siap digunakan!');
    });

    // Pesan masuk
    this.client.on('message', async message => {
      try {
        const txt = (message.body || '').trim().toLowerCase();

        // MENU
        if (txt === '!menu' || txt === 'menu') {
          return message.reply(
            `${EMOJI_MENU} *Menu Utama - IPAL*\n\n` +
            `${EMOJI_STATUS} !status → Data terbaru\n` +
            `${EMOJI_TEMP} !harian → Rata-rata hari ini\n` +
            `${EMOJI_TOTAL} !rekap MM/YYYY → PDF Bulanan\n` +
            `${EMOJI_REPORT} !tahun YYYY → PDF Tahunan\n\n` +
            `Dashboard: ${DASHBOARD_URL}`
          );
        }

        // ===== STATUS TERBARU =====
        if (txt === '!status') {
          const rows = await this.query(
            'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1'
          );

          if (!rows.length) return message.reply('Tidak ada data.');

          const d = rows[0];

          return message.reply(
            `${EMOJI_STATUS} *STATUS TERBARU*\n\n` +
            `🌡 *Input*\n` +
            `• Suhu: ${Number(d.temp_in).toFixed(2)}°C\n` +
            `• pH: ${Number(d.ph_in).toFixed(2)}\n\n` +
            `🌡 *Output*\n` +
            `• Suhu: ${Number(d.temp_out).toFixed(2)}°C\n` +
            `• pH: ${Number(d.ph_out).toFixed(2)}\n\n` +
            `⏱ ${moment(d.timestamp).tz(BOT_TIMEZONE).format('DD/MM/YYYY HH:mm')} WIB`
          );
        }

        // ===== REKAP HARIAN =====
        if (txt === '!harian') {
          const today = moment().tz(BOT_TIMEZONE).format('YYYY-MM-DD');

          const rows = await this.query(
            `SELECT 
              AVG(ph_in) AS avg_ph_in,
              AVG(temp_in) AS avg_temp_in,
              AVG(ph_out) AS avg_ph_out,
              AVG(temp_out) AS avg_temp_out,
              COUNT(*) AS total
            FROM sensor_data
            WHERE DATE(timestamp)=?`,
            [today]
          );

          const d = rows[0];

          return message.reply(
            `${EMOJI_TOTAL} *LAPORAN HARI INI*\n\n` +
            `🌡 Input\n` +
            `• Suhu: ${(d.avg_temp_in || 0).toFixed(2)}°C\n` +
            `• pH: ${(d.avg_ph_in || 0).toFixed(2)}\n\n` +
            `🌡 Output\n` +
            `• Suhu: ${(d.avg_temp_out || 0).toFixed(2)}°C\n` +
            `• pH: ${(d.avg_ph_out || 0).toFixed(2)}\n\n` +
            `Jumlah Data: ${d.total}`
          );
        }

        // ===== REKAP BULANAN PDF =====
        if (txt.startsWith('!rekap ')) {
          const arg = txt.split(' ')[1] || '';
          const [month, year] = arg.split('/').map(n => parseInt(n));

          if (!month || !year) {
            return message.reply('Format salah! Gunakan: !rekap MM/YYYY');
          }

          await message.reply('Membuat laporan PDF...');

          const rows = await this.query(
            `SELECT 
              DATE(timestamp) AS day,
              AVG(temp_in) AS avg_temp_in,
              AVG(ph_in) AS avg_ph_in,
              AVG(temp_out) AS avg_temp_out,
              AVG(ph_out) AS avg_ph_out,
              COUNT(*) AS cnt
            FROM sensor_data
            WHERE MONTH(timestamp)=? AND YEAR(timestamp)=?
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) ASC`,
            [month, year]
          );

          if (!rows.length) return message.reply('Tidak ada data.');

          const qc = new QuickChart();
          qc.setWidth(1000).setHeight(400);
          qc.setConfig({
            type: 'line',
            data: {
              labels: rows.map(r => moment(r.day).format('DD/MM')),
              datasets: [
                { label: 'Suhu In', data: rows.map(r => r.avg_temp_in), borderColor: '#3498db' },
                { label: 'pH In', data: rows.map(r => r.avg_ph_in), borderColor: '#f39c12' },
                { label: 'Suhu Out', data: rows.map(r => r.avg_temp_out), borderColor: '#e74c3c' },
                { label: 'pH Out', data: rows.map(r => r.avg_ph_out), borderColor: '#27ae60' }
              ]
            }
          });

          const imgUrl = await qc.getShortUrl();
          const chartBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

          const filePath = path.join(REPORTS_DIR, `Rekap_${month}_${year}.pdf`);
          await this.buildPdf(filePath, { period: `${month}/${year}`, rows, chartBuffer });

          const media = MessageMedia.fromFilePath(filePath);
          return message.reply(media, undefined, {
            caption: `Laporan Bulanan ${month}/${year}`
          });
        }

      } catch (err) {
        console.error('Error:', err);
        message.reply('Terjadi kesalahan pada bot.');
      }
    });
  }
}

// ======================================================
// ================== JALANKAN BOT ======================
// ======================================================
const bot = new SensorBot();
bot.client.initialize();

console.log('Bot IPAL Monitoring berjalan...');
