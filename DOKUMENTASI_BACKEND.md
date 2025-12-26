# Dokumentasi Backend - MA Al-Ittifaqiah 2

Dokumentasi lengkap untuk developer baru tentang setup dan penggunaan backend (Lovable Cloud/Supabase).

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Konfigurasi Awal](#konfigurasi-awal)
3. [Struktur Database](#struktur-database)
4. [Autentikasi](#autentikasi)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Edge Functions](#edge-functions)
7. [Storage](#storage)
8. [Secrets Management](#secrets-management)
9. [Cara Penggunaan di Frontend](#cara-penggunaan-di-frontend)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Proyek ini menggunakan **Lovable Cloud** yang berbasis Supabase sebagai backend. Semua konfigurasi sudah otomatis tersedia dan tidak perlu setup manual.

### Informasi Proyek

| Property | Value |
|----------|-------|
| Project ID | `nrhaktkrljotddjfrbve` |
| Region | Default |
| Database | PostgreSQL |
| Auth | Email/Password |

### File Konfigurasi Penting

```
├── .env                                    # Environment variables (JANGAN EDIT MANUAL)
├── src/integrations/supabase/
│   ├── client.ts                          # Supabase client (AUTO-GENERATED)
│   └── types.ts                           # TypeScript types (AUTO-GENERATED)
└── supabase/
    ├── config.toml                        # Edge functions config
    └── functions/                         # Edge functions folder
```

> ⚠️ **PENTING**: File `client.ts`, `types.ts`, dan `.env` di-generate otomatis. JANGAN edit manual!

---

## Konfigurasi Awal

### Environment Variables

File `.env` berisi variabel berikut (otomatis terisi):

```env
VITE_SUPABASE_PROJECT_ID="nrhaktkrljotddjfrbve"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
VITE_SUPABASE_URL="https://nrhaktkrljotddjfrbve.supabase.co"
```

### Import Supabase Client

```typescript
// Selalu gunakan import ini untuk akses database
import { supabase } from "@/integrations/supabase/client";
```

---

## Struktur Database

### Daftar Tabel

| Tabel | Deskripsi | RLS |
|-------|-----------|-----|
| `profiles` | Data profil user (guru, admin, staff) | ✅ |
| `classes` | Data kelas | ✅ |
| `students` | Data siswa | ✅ |
| `subjects` | Data mata pelajaran | ✅ |
| `schedules` | Jadwal mengajar | ✅ |
| `attendance` | Absensi guru/staff | ✅ |
| `student_attendance` | Absensi siswa | ✅ |
| `announcements` | Pengumuman | ✅ |
| `holidays` | Hari libur | ✅ |
| `teaching_sessions` | Sesi mengajar aktif | ✅ |
| `teaching_journals` | Jurnal mengajar | ✅ |
| `teacher_leave_requests` | Perizinan guru | ✅ |
| `teacher_no_teach_records` | Record guru tidak mengajar | ✅ |
| `student_grades` | Nilai siswa | ✅ |
| `letters` | Surat menyurat | ✅ |
| `school_settings` | Pengaturan sekolah | ✅ |
| `push_subscriptions` | Push notification subscriptions | ✅ |

### Detail Tabel Utama

#### 1. profiles

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,                    -- Sama dengan auth.users.id
  nip VARCHAR NOT NULL,                   -- Nomor Induk Pegawai
  full_name VARCHAR NOT NULL,             -- Nama lengkap
  email VARCHAR NOT NULL,                 -- Email
  phone VARCHAR,                          -- Nomor telepon
  subject VARCHAR,                        -- Mata pelajaran (untuk guru)
  role TEXT NOT NULL,                     -- 'admin' | 'teacher' | 'staff'
  can_teach BOOLEAN DEFAULT false,        -- Bisa mengajar atau tidak
  avatar_url TEXT,                        -- URL foto profil
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. classes

```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,                  -- Nama kelas (misal: "X IPA 1")
  grade VARCHAR NOT NULL,                 -- Tingkat (misal: "X", "XI", "XII")
  academic_year VARCHAR NOT NULL,         -- Tahun ajaran (misal: "2024/2025")
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. students

```sql
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nis VARCHAR NOT NULL,                   -- Nomor Induk Siswa
  name VARCHAR NOT NULL,                  -- Nama siswa
  gender TEXT,                            -- 'male' | 'female'
  birth_date DATE,                        -- Tanggal lahir
  phone VARCHAR,                          -- Nomor telepon
  address TEXT,                           -- Alamat
  class_id UUID,                          -- FK ke classes
  avatar_url TEXT,                        -- URL foto
  qr_code TEXT,                           -- QR Code untuk absensi
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. schedules

```sql
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day TEXT NOT NULL,                      -- 'Senin' | 'Selasa' | ...
  start_time TIME NOT NULL,               -- Jam mulai
  end_time TIME NOT NULL,                 -- Jam selesai
  teacher_id UUID NOT NULL,               -- FK ke profiles
  class_id UUID NOT NULL,                 -- FK ke classes
  subject_id UUID NOT NULL,               -- FK ke subjects
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. attendance (Absensi Guru/Staff)

```sql
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,                  -- FK ke profiles
  date DATE NOT NULL,                     -- Tanggal absensi
  status TEXT DEFAULT 'alpha',            -- 'hadir' | 'izin' | 'sakit' | 'alpha'
  check_in TIME,                          -- Jam masuk
  check_out TIME,                         -- Jam pulang
  type TEXT DEFAULT 'auto',               -- 'manual' | 'qr' | 'auto'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. student_attendance (Absensi Siswa)

```sql
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL,               -- FK ke students
  class_id UUID NOT NULL,                 -- FK ke classes
  date DATE NOT NULL,                     -- Tanggal absensi
  status TEXT DEFAULT 'alpha',            -- 'hadir' | 'izin' | 'sakit' | 'alpha'
  notes TEXT,                             -- Catatan tambahan
  created_by UUID,                        -- User yang input
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Autentikasi

### Sistem Roles

Sistem ini memiliki 3 role:

| Role | Deskripsi | Akses |
|------|-----------|-------|
| `admin` | Administrator | Full access ke semua fitur |
| `teacher` | Guru | Mengajar, absensi, jurnal, nilai |
| `staff` | Staf TU | Administrasi, surat, pengumuman |

### Cara Login

```typescript
import { supabase } from "@/integrations/supabase/client";

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Logout
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

### Mendapatkan Profile User

```typescript
// Get profile dengan role
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

console.log(profile.role); // 'admin' | 'teacher' | 'staff'
```

### Auth State Listener

```typescript
useEffect(() => {
  // Setup listener DULU
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    }
  );

  // KEMUDIAN check existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

### Membuat User Baru (Admin Only)

User baru hanya bisa dibuat oleh admin melalui edge function atau dashboard backend.

```typescript
// Contoh signup dengan metadata
const { data, error } = await supabase.auth.signUp({
  email: 'guru@sekolah.com',
  password: 'password123',
  options: {
    data: {
      nip: '123456789',
      full_name: 'Nama Guru',
      role: 'teacher',
      can_teach: true
    }
  }
});
```

---

## Row Level Security (RLS)

### Konsep RLS

RLS memastikan user hanya bisa akses data sesuai hak mereka. Semua tabel sudah dilindungi RLS.

### Contoh RLS Policies

#### profiles

```sql
-- Semua user bisa lihat profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

-- User hanya bisa update profile sendiri
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Admin bisa delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND role = 'admin'
));
```

#### attendance

```sql
-- User bisa lihat absensi sendiri
CREATE POLICY "Users can view own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = user_id);

-- Admin bisa lihat semua absensi
CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND role = 'admin'
));

-- User bisa insert absensi sendiri
CREATE POLICY "Users can insert own attendance"
ON public.attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Security Definer Function

Untuk menghindari infinite recursion di RLS:

```sql
-- Function untuk cek role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Gunakan di policy
CREATE POLICY "Admins can manage"
ON public.some_table FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

---

## Edge Functions

### Lokasi File

```
supabase/functions/
├── auto-alpha-attendance/index.ts    # Auto tandai alpha
├── delete-user/index.ts              # Hapus user
├── mark-teachers-not-teaching/index.ts # Tandai guru tidak mengajar
├── notify-teacher-schedule/index.ts  # Notifikasi jadwal
├── send-push-notification/index.ts   # Kirim push notification
├── send-reset-password/index.ts      # Reset password email
└── send-schedule-notification/index.ts # Notifikasi jadwal
```

### Konfigurasi (supabase/config.toml)

```toml
project_id = "nrhaktkrljotddjfrbve"

[functions.send-reset-password]
verify_jwt = false                    # Tidak perlu auth

[functions.delete-user]
verify_jwt = true                     # Perlu auth

[functions.auto-alpha-attendance]
verify_jwt = false                    # Untuk CRON job
```

### Cara Memanggil Edge Function

```typescript
// Dari frontend
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: 'value1' }
});

// Contoh: Kirim push notification
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-uuid',
    title: 'Notifikasi',
    body: 'Pesan notifikasi'
  }
});
```

### Struktur Edge Function

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inisialisasi Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Logic di sini...
    const { param1 } = await req.json();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Storage

### Bucket yang Tersedia

| Bucket | Public | Deskripsi |
|--------|--------|-----------|
| `avatars` | ✅ Yes | Foto profil user dan siswa |

### Upload File

```typescript
// Upload avatar
const file = event.target.files[0];
const fileExt = file.name.split('.').pop();
const fileName = `${userId}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file, { upsert: true });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName);
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .download('path/to/file.jpg');
```

### Delete File

```typescript
const { error } = await supabase.storage
  .from('avatars')
  .remove(['path/to/file.jpg']);
```

---

## Secrets Management

### Secrets yang Tersedia

| Secret | Deskripsi | Digunakan di |
|--------|-----------|--------------|
| `SUPABASE_URL` | URL project | Edge Functions |
| `SUPABASE_ANON_KEY` | Anonymous key | Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (RAHASIA!) | Edge Functions |
| `SUPABASE_DB_URL` | Database URL | Edge Functions |
| `RESEND_API_KEY` | API key Resend | send-reset-password |
| `VAPID_PUBLIC_KEY` | Push notification public key | Frontend & Edge |
| `VAPID_PRIVATE_KEY` | Push notification private key | Edge Functions |

### Menggunakan Secrets di Edge Function

```typescript
// Di edge function
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
```

### Menambah Secret Baru

Secrets ditambahkan melalui Lovable Cloud dashboard atau minta AI assistant untuk menambahkan.

---

## Cara Penggunaan di Frontend

### Query Data

```typescript
import { supabase } from "@/integrations/supabase/client";

// Select semua
const { data, error } = await supabase
  .from('students')
  .select('*');

// Select dengan filter
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('class_id', classId)
  .order('name', { ascending: true });

// Select dengan join
const { data, error } = await supabase
  .from('schedules')
  .select(`
    *,
    teacher:profiles(*),
    class:classes(*),
    subject:subjects(*)
  `)
  .eq('day', 'Senin');

// Select single row (gunakan maybeSingle untuk avoid error jika kosong)
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
```

### Insert Data

```typescript
// Insert single
const { data, error } = await supabase
  .from('students')
  .insert({
    nis: '123456',
    name: 'Nama Siswa',
    class_id: classId
  })
  .select()
  .single();

// Insert multiple
const { data, error } = await supabase
  .from('student_attendance')
  .insert([
    { student_id: id1, class_id: classId, date: today, status: 'hadir' },
    { student_id: id2, class_id: classId, date: today, status: 'izin' }
  ]);
```

### Update Data

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'Nama Baru' })
  .eq('id', userId)
  .select()
  .single();
```

### Delete Data

```typescript
const { error } = await supabase
  .from('students')
  .delete()
  .eq('id', studentId);
```

### Realtime Subscription

```typescript
useEffect(() => {
  const channel = supabase
    .channel('announcements-changes')
    .on(
      'postgres_changes',
      {
        event: '*',           // INSERT, UPDATE, DELETE, atau '*' untuk semua
        schema: 'public',
        table: 'announcements'
      },
      (payload) => {
        console.log('Change received:', payload);
        // Refetch data atau update state
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Menggunakan React Query

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch data
const { data: students, isLoading } = useQuery({
  queryKey: ['students', classId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId);
    if (error) throw error;
    return data;
  }
});

// Mutation
const queryClient = useQueryClient();

const createStudent = useMutation({
  mutationFn: async (newStudent) => {
    const { data, error } = await supabase
      .from('students')
      .insert(newStudent)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  }
});
```

---

## Troubleshooting

### Error Umum

#### 1. "new row violates row-level security policy"

**Penyebab**: User tidak punya permission untuk operasi tersebut.

**Solusi**:
- Pastikan user sudah login
- Pastikan `user_id` column terisi dengan `auth.uid()`
- Cek RLS policy sudah benar

```typescript
// Pastikan user_id diisi
const { data, error } = await supabase
  .from('attendance')
  .insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    date: new Date().toISOString().split('T')[0],
    status: 'hadir'
  });
```

#### 2. "infinite recursion detected in policy"

**Penyebab**: RLS policy query tabel yang sama.

**Solusi**: Gunakan security definer function (lihat bagian RLS).

#### 3. "JSON object requested, multiple (or no) rows returned"

**Penyebab**: Menggunakan `.single()` tapi tidak ada data atau lebih dari 1 row.

**Solusi**: Gunakan `.maybeSingle()` untuk optional single row.

```typescript
// ❌ Error jika tidak ada data
const { data } = await supabase.from('profiles').select().eq('id', id).single();

// ✅ Return null jika tidak ada
const { data } = await supabase.from('profiles').select().eq('id', id).maybeSingle();
```

#### 4. Data tidak muncul (empty array)

**Penyebab**: RLS policy blocking akses.

**Solusi**:
- Cek user sudah login
- Cek RLS policy untuk SELECT
- Untuk data public, tambahkan policy `USING (true)`

#### 5. Edge function error 500

**Debug steps**:
1. Cek logs di backend dashboard
2. Pastikan semua secrets sudah di-set
3. Cek syntax error di function code

### Logging untuk Debug

```typescript
// Di frontend
console.log('Query result:', { data, error });

// Di edge function
console.log('Request body:', await req.json());
console.log('Supabase response:', { data, error });
```

---

## Quick Reference

### Cheat Sheet Query

```typescript
// SELECT
.select('*')                           // Semua kolom
.select('id, name')                    // Kolom tertentu
.select('*, class:classes(*)')         // Dengan join

// FILTER
.eq('id', value)                       // Equal
.neq('id', value)                      // Not equal
.gt('age', 18)                         // Greater than
.gte('age', 18)                        // Greater than or equal
.lt('age', 18)                         // Less than
.lte('age', 18)                        // Less than or equal
.like('name', '%John%')                // LIKE
.ilike('name', '%john%')               // Case insensitive LIKE
.in('status', ['hadir', 'izin'])       // IN array
.is('deleted_at', null)                // IS NULL
.not('status', 'eq', 'alpha')          // NOT

// ORDER & LIMIT
.order('created_at', { ascending: false })
.limit(10)
.range(0, 9)                           // Pagination

// RESULT
.single()                              // Expect 1 row (error if 0 or >1)
.maybeSingle()                         // Expect 0 or 1 row
```

---

## Kontak & Support

Untuk pertanyaan atau bantuan, hubungi:
- Admin sistem
- Atau buat issue di repository

---

*Dokumentasi ini dibuat untuk membantu developer baru memahami sistem backend MA Al-Ittifaqiah 2.*
