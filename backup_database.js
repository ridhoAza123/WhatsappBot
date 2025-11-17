// ===============================
// 📦 Database Backup Tool (SAFE VERSION)
// ===============================
const { exec } = require('child_process');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

console.log('📦 DATABASE BACKUP TOOL - Sensor Monitoring System\n');

// 📂 Pastikan folder backup ada
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// 🕒 Waktu lokal
const timestamp = moment().tz('Asia/Jakarta').format('YYYY-MM-DD_HH-mm-ss');

// ===============================
// 🔐 Database Configuration (ISI SENDIRI)
// ===============================
const DB_USER = 'YOUR_DB_USERNAME';      // contoh: 'sensor_user'
const DB_PASS = 'YOUR_DB_PASSWORD';      // contoh: 'MyPassword123!'
const DB_NAME = 'YOUR_DB_NAME';          // contoh: 'sensor_bot'

// 📄 Nama file hasil backup
const backupFile = path.join(BACKUP_DIR, `backup_${DB_NAME}_${timestamp}.sql`);

// 🛠️ Perintah mysqldump
const command = `mysqldump -u ${DB_USER} -p${DB_PASS} ${DB_NAME} > "${backupFile}"`;

console.log(`📌 Creating database backup: "${DB_NAME}"...\n`);
console.log(`📁 Output file: ${backupFile}\n`);

// 🚀 Jalankan backup
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    return;
  }

  // 📑 Verifikasi hasil backup
  if (fs.existsSync(backupFile)) {
    const stats = fs.statSync(backupFile);
    const fileSize = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Backup success!`);
    console.log(`📁 File: ${backupFile}`);
    console.log(`📏 Size: ${fileSize} MB\n`);
  } else {
    console.error('⚠️ Backup file not found!');
  }
});
