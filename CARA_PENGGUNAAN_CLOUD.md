# 📖 CARA PENGGUNAAN SISTEM - LOVABLE CLOUD

Sistem absensi MA Al-Ittifaqiah 2 sekarang menggunakan **Lovable Cloud** sebagai backend.

---

## 🔐 SISTEM AUTENTIKASI

### Tidak Ada Pendaftaran Publik!
Sistem ini **TIDAK MEMILIKI** fitur pendaftaran/daftar akun secara public. 

✅ **Hanya Admin** yang dapat membuat akun untuk guru dan staf
❌ **User biasa** tidak bisa daftar sendiri

### Cara Membuat Akun Baru (Khusus Admin)

**Admin** harus membuat akun melalui backend Lovable Cloud:

1. **Buka Backend**:
   - Klik tombol "View Backend Database" di chat Lovable
   - Atau buka Cloud tab di Lovable interface

2. **Masuk ke Table Editor**:
   - Pilih tab "Tables"
   - Cari table "auth.users" (untuk create user)

3. **Buat User Baru via SQL Editor**:
   ```sql
   -- Contoh membuat akun Admin
   INSERT INTO auth.users (
     instance_id,
     id,
     aud,
     role,
     email,
     encrypted_password,
     email_confirmed_at,
     raw_user_meta_data,
     created_at,
     updated_at
   ) VALUES (
     '00000000-0000-0000-0000-000000000000',
     gen_random_uuid(),
     'authenticated',
     'authenticated',
     'admin@maittifaqiah.sch.id',
     crypt('admin123', gen_salt('bf')),
     now(),
     '{"full_name": "Administrator", "nip": "1000000001", "role": "admin"}'::jsonb,
     now(),
     now()
   );
   ```

**ATAU** menggunakan Supabase Dashboard Auth UI (lebih mudah):
1. Buka Lovable Cloud → Authentication
2. Klik "Add User"
3. Isi email dan password
4. Setelah user dibuat, update metadata di table `profiles`

---

## 👥 STRUKTUR AKUN

### 1. Admin
- **Role**: `admin`
- **Hak Akses**: Full control semua fitur
- **Dapat**:
  - Membuat akun guru/staf
  - Mengelola semua data (kelas, siswa, mata pelajaran, jadwal)
  - Melihat semua absensi
  - Membuat pengumuman

### 2. Guru (Teacher)
- **Role**: `teacher`
- **Hak Akses**: Terbatas untuk mengajar
- **Dapat**:
  - Mengabsen siswa
  - Melihat jadwal mengajar
  - Melihat data siswa
  - Absen diri sendiri

### 3. Staf (Staff)
- **Role**: `staff`
- **Hak Akses**: Administratif
- **Dapat**:
  - Melihat data siswa/kelas
  - Absen diri sendiri
  - (Optional) Dapat mengajar jika `can_teach = true`

---

## 🚀 CARA LOGIN

### Login Pertama Kali
1. Buka aplikasi
2. Akan otomatis redirect ke `/auth`
3. Masukkan **email** dan **password** yang dibuat admin
4. Klik "Login"
5. Setelah berhasil, akan masuk ke Dashboard

### Logout
1. Klik ikon **Logout** di sidebar
2. Akan kembali ke halaman login

---

## 📊 DATABASE STRUKTUR

Lovable Cloud menggunakan 9 tabel utama:

| Tabel | Deskripsi |
|-------|-----------|
| `profiles` | Data profil guru, staf, admin |
| `classes` | Data kelas (X, XI, XII) |
| `subjects` | Mata pelajaran |
| `students` | Data siswa dengan QR code |
| `schedules` | Jadwal mengajar |
| `attendance` | Absensi guru/staf |
| `student_attendance` | Absensi siswa |
| `announcements` | Pengumuman |
| `holidays` | Hari libur |

---

## 🔧 MIGRASI DARI API LAMA

### Perubahan Utama:
1. ❌ **API Lama** (`http://localhost:3000/api`) → ✅ **Lovable Cloud** (Supabase)
2. ❌ **File `src/lib/api.ts`** sudah tidak digunakan
3. ✅ Semua data operations menggunakan `supabase` client:
   ```typescript
   import { supabase } from '@/integrations/supabase/client';
   
   // Contoh query
   const { data, error } = await supabase
     .from('profiles')
     .select('*');
   ```

### Fitur yang Sudah Migrate:
- ✅ Authentication (Login/Logout)
- ✅ Dashboard dengan real data
- ⏳ Absensi (sedang diupdate)
- ⏳ Pengumuman (sedang diupdate)
- ⏳ Data Guru/Staf (sedang diupdate)
- ⏳ Data Siswa (sedang diupdate)

---

## 📝 MEMBUAT AKUN SAMPLE

Untuk testing, admin bisa create beberapa akun contoh:

### Admin
```sql
-- Email: admin@maittifaqiah.sch.id
-- Password: admin123
-- NIP: 1000000001
```

### Guru
```sql
-- Email: guru1@maittifaqiah.sch.id
-- Password: guru123
-- NIP: 1985042001
-- Nama: Ahmad Fauzi
-- Mapel: Matematika
```

### Staf
```sql
-- Email: staf1@maittifaqiah.sch.id
-- Password: staf123
-- NIP: 1989081506
-- Nama: Nurul Hidayah
```

---

## 🛡️ KEAMANAN (RLS)

**Row Level Security (RLS)** sudah diaktifkan pada semua tabel:

- ✅ Users hanya bisa lihat/edit data mereka sendiri
- ✅ Admin bisa akses semua data
- ✅ Teacher bisa manage data siswa & attendance
- ✅ Public tidak bisa akses data tanpa login (kecuali `/absensiotomatis`)

---

## ❓ FAQ

**Q: Bagaimana jika lupa password?**  
A: Admin harus reset password user via Lovable Cloud → Authentication

**Q: Bisa daftar akun sendiri?**  
A: **TIDAK**. Hanya admin yang bisa create akun.

**Q: Bagaimana cara akses database?**  
A: Klik "View Backend Database" di Lovable atau buka Cloud tab

**Q: Data tersimpan dimana?**  
A: Di Lovable Cloud (Supabase PostgreSQL)

**Q: Apakah data aman?**  
A: Ya, dilindungi dengan RLS policies dan authentication

---

## 📞 SUPPORT

Jika ada masalah:
1. Check console logs di browser (F12)
2. Check error message di UI
3. Buka Lovable Cloud → Tables → Check data
4. Contact developer

---

**Last Updated**: 2025-11-21
**Version**: 2.0.0 (Lovable Cloud)
