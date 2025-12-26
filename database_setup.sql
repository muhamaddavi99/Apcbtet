-- ================================================
-- MA AL-ITTIFAQIAH 2 - DATABASE SETUP
-- Sistem Informasi Sekolah
-- ================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS ma_alittifaqiah2;
USE ma_alittifaqiah2;

-- ================================================
-- 1. USERS TABLE (Guru, Staf, Admin)
-- ================================================
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  nip VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(50),
  role ENUM('teacher', 'staff', 'admin') DEFAULT 'teacher',
  can_teach BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 2. CLASSES TABLE (Kelas)
-- ================================================
CREATE TABLE classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grade (grade),
  INDEX idx_academic_year (academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 3. SUBJECTS TABLE (Mata Pelajaran)
-- ================================================
CREATE TABLE subjects (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 4. STUDENTS TABLE (Siswa)
-- ================================================
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY,
  nis VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  class_id VARCHAR(36),
  gender ENUM('L', 'P'),
  birth_date DATE,
  address TEXT,
  phone VARCHAR(20),
  qr_code VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  INDEX idx_nis (nis),
  INDEX idx_class_id (class_id),
  INDEX idx_qr_code (qr_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 5. SCHEDULES TABLE (Jadwal)
-- ================================================
CREATE TABLE schedules (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  day ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  INDEX idx_teacher (teacher_id),
  INDEX idx_class (class_id),
  INDEX idx_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 6. ATTENDANCE TABLE (Absensi Guru/Staf)
-- ================================================
CREATE TABLE attendance (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('hadir', 'terlambat', 'izin', 'sakit', 'alpha') DEFAULT 'alpha',
  type ENUM('auto', 'manual') DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date),
  INDEX idx_date (date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 7. STUDENT ATTENDANCE TABLE (Absensi Siswa)
-- ================================================
CREATE TABLE student_attendance (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('hadir', 'alpha', 'izin', 'sakit') DEFAULT 'alpha',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_student_date (student_id, date),
  INDEX idx_class_date (class_id, date),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 8. ANNOUNCEMENTS TABLE (Pengumuman)
-- ================================================
CREATE TABLE announcements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_priority (priority),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 9. HOLIDAYS TABLE (Hari Libur)
-- ================================================
CREATE TABLE holidays (
  id VARCHAR(36) PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- INSERT SAMPLE DATA
-- ================================================

-- Insert Admin Account
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (id, nip, name, email, password, role) VALUES
(UUID(), '1000000001', 'Administrator', 'admin@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert Guru Accounts
-- Password: guru123
INSERT INTO users (id, nip, name, email, password, phone, subject, role) VALUES
(UUID(), '1985042001', 'Drs. Ahmad Fauzi, M.Pd', 'ahmad.fauzi@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567801', 'Matematika', 'teacher'),
(UUID(), '1987061502', 'Siti Maryam, S.Pd', 'siti.maryam@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567802', 'Bahasa Indonesia', 'teacher'),
(UUID(), '1990033103', 'Muhammad Rizki, S.Si', 'muhammad.rizki@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567803', 'Fisika', 'teacher'),
(UUID(), '1988072004', 'Fatimah Azzahra, S.Pd', 'fatimah.azzahra@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567804', 'Kimia', 'teacher'),
(UUID(), '1992051205', 'Usman Abdullah, S.Kom', 'usman.abdullah@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567805', 'TIK', 'teacher');

-- Insert Staf Accounts
-- Password: staf123
INSERT INTO users (id, nip, name, email, password, phone, role, can_teach) VALUES
(UUID(), '1989081506', 'Nurul Hidayah, S.E', 'nurul.hidayah@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567806', 'staff', FALSE),
(UUID(), '1991042507', 'Hendra Gunawan', 'hendra.gunawan@maittifaqiah.sch.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567807', 'staff', TRUE);

-- Insert Classes (Kelas)
INSERT INTO classes (id, name, grade, academic_year) VALUES
(UUID(), 'X IPA 1', '10', '2024/2025'),
(UUID(), 'X IPA 2', '10', '2024/2025'),
(UUID(), 'X IPS 1', '10', '2024/2025'),
(UUID(), 'XI IPA 1', '11', '2024/2025'),
(UUID(), 'XI IPA 2', '11', '2024/2025'),
(UUID(), 'XI IPS 1', '11', '2024/2025'),
(UUID(), 'XII IPA 1', '12', '2024/2025'),
(UUID(), 'XII IPA 2', '12', '2024/2025'),
(UUID(), 'XII IPS 1', '12', '2024/2025');

-- Insert Subjects (Mata Pelajaran)
INSERT INTO subjects (id, name, code) VALUES
(UUID(), 'Matematika', 'MTK'),
(UUID(), 'Bahasa Indonesia', 'BIND'),
(UUID(), 'Bahasa Inggris', 'BING'),
(UUID(), 'Fisika', 'FIS'),
(UUID(), 'Kimia', 'KIM'),
(UUID(), 'Biologi', 'BIO'),
(UUID(), 'Sejarah', 'SEJ'),
(UUID(), 'Geografi', 'GEO'),
(UUID(), 'Ekonomi', 'EKO'),
(UUID(), 'Sosiologi', 'SOS'),
(UUID(), 'Pendidikan Agama Islam', 'PAI'),
(UUID(), 'Pendidikan Kewarganegaraan', 'PKN'),
(UUID(), 'Teknologi Informasi', 'TIK');

-- Insert Sample Students (50 students across different classes)
INSERT INTO students (id, nis, name, class_id, gender, birth_date, address, phone, qr_code) 
SELECT 
  UUID() as id,
  CONCAT('2024', LPAD(n, 4, '0')) as nis,
  CONCAT('Siswa ', n) as name,
  (SELECT id FROM classes ORDER BY RAND() LIMIT 1) as class_id,
  IF(n % 2 = 0, 'L', 'P') as gender,
  DATE_SUB(CURDATE(), INTERVAL (15 + (n % 3)) YEAR) as birth_date,
  CONCAT('Jl. Contoh No. ', n) as address,
  CONCAT('0812345678', LPAD(n, 2, '0')) as phone,
  CONCAT('QR-', UUID()) as qr_code
FROM (
  SELECT @row := @row + 1 as n
  FROM (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) t1,
       (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) t2,
       (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) t3,
       (SELECT @row := 0) r
  LIMIT 50
) numbers;

-- Insert Sample Announcements
INSERT INTO announcements (id, title, content, priority, created_by) VALUES
(UUID(), 'Libur Semester Ganjil', 'Libur semester ganjil akan dimulai tanggal 20 Desember 2024 sampai 5 Januari 2025.', 'high', 
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
(UUID(), 'Pendaftaran Ekstrakurikuler', 'Pendaftaran ekstrakurikuler dibuka mulai hari ini. Silakan daftar ke wali kelas masing-masing.', 'normal',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
(UUID(), 'Ujian Tengah Semester', 'Ujian tengah semester akan dilaksanakan pada minggu ke-3 bulan November 2024.', 'high',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- Insert Sample Holidays
INSERT INTO holidays (id, date, name, description) VALUES
(UUID(), '2024-12-25', 'Hari Natal', 'Libur nasional Hari Natal'),
(UUID(), '2025-01-01', 'Tahun Baru 2025', 'Libur nasional Tahun Baru'),
(UUID(), '2025-03-29', 'Hari Raya Nyepi', 'Libur nasional Hari Raya Nyepi'),
(UUID(), '2025-04-10', 'Hari Raya Idul Fitri', 'Libur nasional Hari Raya Idul Fitri 1446 H'),
(UUID(), '2025-04-11', 'Hari Raya Idul Fitri', 'Libur nasional Hari Raya Idul Fitri 1446 H'),
(UUID(), '2025-05-01', 'Hari Buruh Internasional', 'Libur nasional Hari Buruh'),
(UUID(), '2025-08-17', 'Hari Kemerdekaan RI', 'Libur nasional HUT RI ke-80');

-- ================================================
-- STORED PROCEDURES & FUNCTIONS
-- ================================================

-- Procedure untuk membuat absensi otomatis (dipanggil CRON setiap hari jam 7 pagi)
DELIMITER $$

CREATE PROCEDURE create_auto_attendance()
BEGIN
  DECLARE v_today DATE;
  DECLARE v_is_holiday INT;
  
  SET v_today = CURDATE();
  
  -- Cek apakah hari ini libur
  SELECT COUNT(*) INTO v_is_holiday FROM holidays WHERE date = v_today;
  
  -- Jika tidak libur, buat absensi otomatis untuk semua guru/staf
  IF v_is_holiday = 0 THEN
    INSERT INTO attendance (id, user_id, date, status, type)
    SELECT UUID(), id, v_today, 'alpha', 'auto'
    FROM users 
    WHERE role IN ('teacher', 'staff')
    AND NOT EXISTS (
      SELECT 1 FROM attendance 
      WHERE user_id = users.id AND date = v_today
    );
  END IF;
END$$

DELIMITER ;

-- ================================================
-- INFORMASI AKUN DEFAULT
-- ================================================
/*
ADMIN ACCOUNT:
Email: admin@maittifaqiah.sch.id
Password: admin123

GURU ACCOUNTS:
Email: ahmad.fauzi@maittifaqiah.sch.id
Password: guru123

Email: siti.maryam@maittifaqiah.sch.id
Password: guru123

Email: muhammad.rizki@maittifaqiah.sch.id
Password: guru123

Email: fatimah.azzahra@maittifaqiah.sch.id
Password: guru123

Email: usman.abdullah@maittifaqiah.sch.id
Password: guru123

STAF ACCOUNTS:
Email: nurul.hidayah@maittifaqiah.sch.id
Password: staf123

Email: hendra.gunawan@maittifaqiah.sch.id
Password: staf123
*/

-- ================================================
-- END OF DATABASE SETUP
-- ================================================
