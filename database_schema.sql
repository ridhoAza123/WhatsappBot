-- ===============================
-- Database Schema for Sensor Monitoring Bot
-- Clean public version (safe for GitHub)
-- ===============================

CREATE DATABASE IF NOT EXISTS sensor_bot;
USE sensor_bot;

-- ===============================
-- TABEL UTAMA SENSOR
-- pH, Suhu, dan DO (Dissolved Oxygen)
-- ===============================
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temperature FLOAT NOT NULL,
    ph FLOAT NOT NULL,
    do_value FLOAT NULL,         -- dissolved oxygen (mg/L)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- DATA USER WHATSAPP YANG MENERIMA LAPORAN
-- ===============================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- LOG RIWAYAT PENGIRIMAN LAPORAN
-- daily, monthly, atau reminder pembayaran
-- ===============================
CREATE TABLE IF NOT EXISTS report_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type ENUM('daily', 'monthly', 'payment_reminder') NOT NULL,
    sent_to VARCHAR(20) NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed') NOT NULL,
    error_message TEXT
);

-- ===============================
-- KONFIGURASI GLOBAL BOT
-- URL, pengingat, hari kirim laporan, dll.
-- ===============================
CREATE TABLE IF NOT EXISTS bot_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===============================
-- DATA DEFAULT (BISA DI EDIT DI PRODUKSI)
-- ===============================
INSERT IGNORE INTO bot_config (config_key, config_value) VALUES
('esp32_url', 'http://your-esp32-ip-here'),
('payment_due_day', '25'),
('report_send_day', '20'),
('admin_numbers', '["your-admin-number@c.us"]');

INSERT IGNORE INTO users (phone_number, name) VALUES 
('your-admin-number@c.us', 'System Admin');

-- ===============================
-- TABEL TAMBAHAN (OPSIONAL)
-- Untuk menyimpan batas aman sensor
-- ===============================
CREATE TABLE IF NOT EXISTS safety_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parameter VARCHAR(50) NOT NULL,     -- contoh: 'ph', 'temperature', 'do'
    min_value FLOAT,
    max_value FLOAT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO safety_limits (parameter, min_value, max_value) VALUES
('ph', 6.5, 8.5),
('temperature', 20, 32),
('do', 3, 10);
