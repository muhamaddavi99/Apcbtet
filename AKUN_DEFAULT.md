# 🔐 AKUN DEFAULT - MA AL-ITTIFAQIAH 2

File ini berisi daftar akun default yang sudah dibuat di database untuk testing dan penggunaan awal sistem.

---

## 👨‍💼 ADMIN ACCOUNT

**Email:** `admin@maittifaqiah.sch.id`  
**Password:** `admin123`  
**NIP:** `1000000001`  
**Role:** Admin  
**Hak Akses:** Full access ke semua fitur sistem

---

## 👨‍🏫 GURU ACCOUNTS

### 1. Drs. Ahmad Fauzi, M.Pd
- **Email:** `ahmad.fauzi@maittifaqiah.sch.id`
- **Password:** `guru123`
- **NIP:** `1985042001`
- **Mata Pelajaran:** Matematika
- **Telepon:** 081234567801

### 2. Siti Maryam, S.Pd
- **Email:** `siti.maryam@maittifaqiah.sch.id`
- **Password:** `guru123`
- **NIP:** `1987061502`
- **Mata Pelajaran:** Bahasa Indonesia
- **Telepon:** 081234567802

### 3. Muhammad Rizki, S.Si
- **Email:** `muhammad.rizki@maittifaqiah.sch.id`
- **Password:** `guru123`
- **NIP:** `1990033103`
- **Mata Pelajaran:** Fisika
- **Telepon:** 081234567803

### 4. Fatimah Azzahra, S.Pd
- **Email:** `fatimah.azzahra@maittifaqiah.sch.id`
- **Password:** `guru123`
- **NIP:** `1988072004`
- **Mata Pelajaran:** Kimia
- **Telepon:** 081234567804

### 5. Usman Abdullah, S.Kom
- **Email:** `usman.abdullah@maittifaqiah.sch.id`
- **Password:** `guru123`
- **NIP:** `1992051205`
- **Mata Pelajaran:** TIK (Teknologi Informasi)
- **Telepon:** 081234567805

---

## 👥 STAF ACCOUNTS

### 1. Nurul Hidayah, S.E
- **Email:** `nurul.hidayah@maittifaqiah.sch.id`
- **Password:** `staf123`
- **NIP:** `1989081506`
- **Role:** Staf
- **Bisa Mengajar:** Tidak
- **Telepon:** 081234567806

### 2. Hendra Gunawan
- **Email:** `hendra.gunawan@maittifaqiah.sch.id`
- **Password:** `staf123`
- **NIP:** `1991042507`
- **Role:** Staf
- **Bisa Mengajar:** Ya
- **Telepon:** 081234567807

---

## 📊 DATA ILUSTRASI LAINNYA

### Kelas (9 kelas)
- X IPA 1, X IPA 2, X IPS 1
- XI IPA 1, XI IPA 2, XI IPS 1
- XII IPA 1, XII IPA 2, XII IPS 1

### Mata Pelajaran (13 mapel)
- Matematika (MTK)
- Bahasa Indonesia (BIND)
- Bahasa Inggris (BING)
- Fisika (FIS)
- Kimia (KIM)
- Biologi (BIO)
- Sejarah (SEJ)
- Geografi (GEO)
- Ekonomi (EKO)
- Sosiologi (SOS)
- Pendidikan Agama Islam (PAI)
- Pendidikan Kewarganegaraan (PKN)
- Teknologi Informasi (TIK)

### Siswa (50 siswa)
- NIS: 20240001 - 20240050
- Tersebar di 9 kelas
- Setiap siswa memiliki QR code unik untuk absensi

### Pengumuman (3 contoh)
1. Libur Semester Ganjil
2. Pendaftaran Ekstrakurikuler
3. Ujian Tengah Semester

### Hari Libur (7 hari libur nasional)
- Natal 2024
- Tahun Baru 2025
- Nyepi 2025
- Idul Fitri 2025
- Hari Buruh 2025
- HUT RI ke-80

---

## 🚀 CARA MENGGUNAKAN

### 1. Setup Database
```bash
mysql -u root -p < database_setup.sql
```

### 2. Update API Base URL
Edit file `src/lib/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000/api'; // Sesuaikan dengan backend Anda
```

### 3. Login ke Sistem
Gunakan salah satu akun di atas untuk login ke sistem.

---

## 🔒 KEAMANAN

⚠️ **PENTING:** Segera ubah password default setelah deployment ke production!

Password default menggunakan bcrypt hash:
- Hash: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`

Untuk membuat password baru, gunakan:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('password_baru', 10);
```

---

## 📝 CATATAN

1. **Absensi Otomatis**: Sistem akan otomatis membuat record absensi dengan status "alpha" setiap hari jam 07:00 untuk semua guru/staf (kecuali hari libur)

2. **QR Code Siswa**: Setiap siswa memiliki QR code unik yang bisa dicetak pada kartu untuk absensi

3. **Role System**:
   - **Admin**: Full access
   - **Teacher**: Dapat mengajar dan mengabsen siswa
   - **Staff**: Akses terbatas, beberapa staf dapat mengajar

4. **Tahun Ajaran**: Saat ini menggunakan tahun ajaran 2024/2025

---

## 🛠️ TROUBLESHOOTING

### Password tidak cocok?
Pastikan backend menggunakan bcrypt untuk hashing dengan salt rounds = 10

### Database error?
Cek apakah semua tabel sudah dibuat dan foreign key constraints terpenuhi

### Tidak bisa login?
Cek koneksi ke backend API dan pastikan JWT_SECRET sudah di-set di `.env`

---

**Last Updated:** 2024
**Version:** 1.0.0
