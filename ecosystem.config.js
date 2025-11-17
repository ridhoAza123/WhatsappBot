/**
 * PM2 Configuration File
 * Applications:
 *  - WhatsApp Bot (sensor-bot)
 *  - REST API Server (sensor-api)
 *  - Automatic Database Backup (backup-database)
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

module.exports = {
  apps: [
    // ===================================
    // WHATSAPP BOT
    // ===================================
    {
      name: 'sensor-bot',
      script: 'bot.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      node_args: '--max_old_space_size=512',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Jakarta'
      },
      log_file: 'logs/bot_combined.log',
      out_file: 'logs/bot_out.log',
      error_file: 'logs/bot_err.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      listen_timeout: 3000,
      kill_timeout: 5000,
      combine_logs: true,
      merge_logs: true
    },

    // ===================================
    // API SERVER
    // ===================================
    {
      name: 'sensor-api',
      script: 'api.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      node_args: '--max_old_space_size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        TZ: 'Asia/Jakarta'
      },
      log_file: 'logs/api_combined.log',
      out_file: 'logs/api_out.log',
      error_file: 'logs/api_err.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      listen_timeout: 3000,
      kill_timeout: 5000,
      combine_logs: true,
      merge_logs: true
    },

    // ===================================
    // DAILY BACKUP SCRIPT (OPTIONAL)
    // Runs automatically every 23:00 WIB
    // ===================================
    {
      name: 'backup-database',
      script: 'backup_database.js',
      cron_restart: '0 23 * * *',
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Jakarta'
      },
      log_file: 'logs/backup_combined.log',
      out_file: 'logs/backup_out.log',
      error_file: 'logs/backup_err.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
