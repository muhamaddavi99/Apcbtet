# API Documentation - MA Al-Ittifaqiah 2

Backend API yang perlu Anda buat dengan Node.js + MySQL.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Semua endpoint (kecuali `/auth/login`) memerlukan token JWT di header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/login
Login untuk guru/staf

**Request:**
```json
{
  "email": "guru@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Nama Guru",
    "email": "guru@example.com",
    "role": "teacher"
  }
}
```

### GET /auth/me
Get current user data

**Response:**
```json
{
  "id": "uuid",
  "name": "Nama Guru",
  "email": "guru@example.com",
  "role": "teacher"
}
```

---

## 📋 Absensi Endpoints

### GET /absensi/today
Get absensi hari ini untuk semua guru

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "user_name": "Nama Guru",
    "date": "2024-01-15",
    "check_in": "07:30:00",
    "check_out": "15:00:00",
    "status": "hadir"
  }
]
```

### GET /absensi/history
Get riwayat absensi

**Query Params:**
- `startDate`: YYYY-MM-DD (optional)
- `endDate`: YYYY-MM-DD (optional)
- `userId`: uuid (optional)

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "date": "2024-01-15",
    "check_in": "07:30:00",
    "check_out": "15:00:00",
    "status": "hadir",
    "type": "auto"
  }
]
```

### POST /absensi/checkin-qr
Absensi manual via QR code

**Request:**
```json
{
  "qrCode": "QR_CODE_STRING"
}
```

**Response:**
```json
{
  "message": "Absensi berhasil dicatat",
  "attendance": {
    "id": "uuid",
    "check_in": "07:30:00",
    "status": "hadir"
  }
}
```

### GET /absensi/generate-qr/:userId
Generate QR code untuk user

**Response:**
```json
{
  "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..."
}
```

### GET /absensi/auto-status
Cek status absensi otomatis (aktif/nonaktif)

**Response:**
```json
{
  "isActive": true,
  "reason": null
}
```
atau
```json
{
  "isActive": false,
  "reason": "Hari ini adalah hari libur: Tahun Baru"
}
```

---

## 📢 Pengumuman Endpoints

### GET /pengumuman
Get semua pengumuman

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Judul Pengumuman",
    "content": "Isi pengumuman",
    "priority": "high",
    "created_at": "2024-01-15T10:00:00Z",
    "created_by": "uuid"
  }
]
```

### GET /pengumuman/:id
Get detail pengumuman

**Response:**
```json
{
  "id": "uuid",
  "title": "Judul Pengumuman",
  "content": "Isi pengumuman",
  "priority": "high",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### POST /pengumuman
Buat pengumuman baru

**Request:**
```json
{
  "title": "Judul Pengumuman",
  "content": "Isi pengumuman",
  "priority": "normal"
}
```

**Response:**
```json
{
  "id": "uuid",
  "message": "Pengumuman berhasil dibuat"
}
```

### PUT /pengumuman/:id
Update pengumuman

**Request:**
```json
{
  "title": "Judul Update",
  "content": "Isi update",
  "priority": "high"
}
```

### DELETE /pengumuman/:id
Hapus pengumuman

---

## 📅 Jadwal Endpoints

### GET /jadwal
Get semua jadwal

**Response:**
```json
[
  {
    "id": "uuid",
    "teacher_id": "uuid",
    "teacher_name": "Nama Guru",
    "class_id": "uuid",
    "class_name": "X IPA 1",
    "subject_id": "uuid",
    "subject_name": "Matematika",
    "day": "senin",
    "start_time": "08:00:00",
    "end_time": "09:30:00"
  }
]
```

### GET /jadwal/teacher/:teacherId
Get jadwal berdasarkan guru

### GET /jadwal/class/:classId
Get jadwal berdasarkan kelas

### POST /jadwal
Buat jadwal baru

**Request:**
```json
{
  "teacher_id": "uuid",
  "class_id": "uuid",
  "subject_id": "uuid",
  "day": "senin",
  "start_time": "08:00:00",
  "end_time": "09:30:00"
}
```

### PUT /jadwal/:id
Update jadwal

### DELETE /jadwal/:id
Hapus jadwal

---

## 🏫 Kelas Endpoints

### GET /kelas
Get semua kelas

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "X IPA 1",
    "grade": "10",
    "academic_year": "2024/2025",
    "total_students": 32
  }
]
```

### GET /kelas/:id
Get detail kelas

### POST /kelas
Buat kelas baru

**Request:**
```json
{
  "name": "X IPA 1",
  "grade": "10",
  "academic_year": "2024/2025"
}
```

### PUT /kelas/:id
Update kelas

### DELETE /kelas/:id
Hapus kelas

---

## 📚 Mata Pelajaran Endpoints

### GET /mata-pelajaran
Get semua mata pelajaran

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Matematika",
    "code": "MTK"
  }
]
```

### GET /mata-pelajaran/:id
Get detail mata pelajaran

### POST /mata-pelajaran
Buat mata pelajaran baru

**Request:**
```json
{
  "name": "Matematika",
  "code": "MTK"
}
```

### PUT /mata-pelajaran/:id
Update mata pelajaran

### DELETE /mata-pelajaran/:id
Hapus mata pelajaran

---

## 👨‍🎓 Siswa Endpoints

### GET /siswa
Get semua siswa

**Response:**
```json
[
  {
    "id": "uuid",
    "nis": "12345678",
    "name": "Nama Siswa",
    "class_id": "uuid",
    "class_name": "X IPA 1",
    "gender": "L",
    "birth_date": "2008-05-15",
    "address": "Alamat",
    "phone": "08123456789"
  }
]
```

### GET /siswa/:id
Get detail siswa

### GET /siswa/class/:classId
Get siswa berdasarkan kelas

### POST /siswa
Tambah siswa baru

**Request:**
```json
{
  "nis": "12345678",
  "name": "Nama Siswa",
  "class_id": "uuid",
  "gender": "L",
  "birth_date": "2008-05-15",
  "address": "Alamat",
  "phone": "08123456789"
}
```

### PUT /siswa/:id
Update data siswa

### DELETE /siswa/:id
Hapus siswa

---

## 👨‍🏫 Guru Endpoints

### GET /guru
Get semua guru

**Response:**
```json
[
  {
    "id": "uuid",
    "nip": "1234567890",
    "name": "Nama Guru",
    "email": "guru@example.com",
    "phone": "08123456789",
    "subject": "Matematika",
    "role": "teacher"
  }
]
```

### GET /guru/:id
Get detail guru

### POST /guru
Tambah guru baru

**Request:**
```json
{
  "nip": "1234567890",
  "name": "Nama Guru",
  "email": "guru@example.com",
  "password": "password123",
  "phone": "08123456789",
  "subject": "Matematika",
  "role": "teacher"
}
```

### PUT /guru/:id
Update data guru

### DELETE /guru/:id
Hapus guru

---

## 🗓️ Hari Libur Endpoints

### GET /hari-libur
Get semua hari libur

**Response:**
```json
[
  {
    "id": "uuid",
    "date": "2024-01-01",
    "name": "Tahun Baru",
    "description": "Libur nasional"
  }
]
```

### POST /hari-libur
Tambah hari libur baru

**Request:**
```json
{
  "date": "2024-01-01",
  "name": "Tahun Baru",
  "description": "Libur nasional"
}
```

### DELETE /hari-libur/:id
Hapus hari libur

### GET /hari-libur/check
Cek apakah tanggal adalah hari libur

**Query Params:**
- `date`: YYYY-MM-DD

**Response:**
```json
{
  "isHoliday": true,
  "holiday": {
    "name": "Tahun Baru",
    "description": "Libur nasional"
  }
}
```

---

## Database Schema

### users (guru/staf)
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  nip VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(50),
  role ENUM('teacher', 'staff', 'admin') DEFAULT 'teacher',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### attendance (absensi)
```sql
CREATE TABLE attendance (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('hadir', 'terlambat', 'izin', 'sakit', 'alpha'),
  type ENUM('auto', 'manual') DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### announcements (pengumuman)
```sql
CREATE TABLE announcements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

### classes (kelas)
```sql
CREATE TABLE classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### subjects (mata pelajaran)
```sql
CREATE TABLE subjects (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### schedules (jadwal)
```sql
CREATE TABLE schedules (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  day ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
```

### students (siswa)
```sql
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY,
  nis VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  class_id VARCHAR(36),
  gender ENUM('L', 'P'),
  birth_date DATE,
  address TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);
```

### holidays (hari libur)
```sql
CREATE TABLE holidays (
  id VARCHAR(36) PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Fitur Khusus: Absensi Otomatis

Backend harus menjalankan CRON job untuk absensi otomatis:

```javascript
// Setiap hari jam 07:00 pagi
cron.schedule('0 7 * * *', async () => {
  // Cek apakah hari ini libur
  const isHoliday = await checkHoliday(new Date());
  
  if (!isHoliday) {
    // Jalankan absensi otomatis untuk semua guru
    await createAutoAttendance();
  }
});
```

**Logic:**
1. Cek tabel `holidays` apakah tanggal hari ini ada
2. Jika libur: skip absensi otomatis
3. Jika tidak libur: buat record absensi otomatis untuk semua guru dengan status "alpha"
4. Guru yang hadir akan mengubah status via QR code atau sistem akan update otomatis

---

## Environment Variables (.env)

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ma_alittifaqiah2
JWT_SECRET=your_jwt_secret_key
```

---

## Testing dengan Postman

Import collection berikut untuk testing:
1. Set base URL: `http://localhost:3000/api`
2. Set environment variable `token` setelah login
3. Gunakan `{{token}}` di header Authorization

---

## Catatan Penting

1. **Security**: Semua password harus di-hash dengan bcrypt
2. **Validation**: Validasi semua input menggunakan express-validator
3. **Error Handling**: Return error response yang konsisten
4. **CORS**: Enable CORS untuk frontend
5. **QR Code**: Gunakan library `qrcode` untuk generate QR
6. **UUID**: Gunakan `uuid` untuk generate ID

---

## Contoh Response Error

```json
{
  "error": true,
  "message": "Deskripsi error"
}
```

## Contoh Response Success

```json
{
  "error": false,
  "message": "Berhasil",
  "data": { ... }
}
```
