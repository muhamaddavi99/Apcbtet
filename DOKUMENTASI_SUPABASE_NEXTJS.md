# 🗄️ Dokumentasi Backend Supabase untuk Next.js

Dokumentasi lengkap penggunaan Supabase dengan Next.js SSR untuk menyembunyikan token.

---

## 📋 Daftar Isi

1. [Konfigurasi Supabase SSR](#konfigurasi-supabase-ssr)
2. [Client Types](#client-types)
3. [Database Schema](#database-schema)
4. [Row Level Security (RLS)](#row-level-security)
5. [Authentication](#authentication)
6. [Storage](#storage)
7. [Edge Functions](#edge-functions)
8. [Best Practices](#best-practices)

---

## 🔧 Konfigurasi Supabase SSR

### Environment Variables

```env
# .env.local

# PUBLIC - Dapat diakses di browser (AMAN)
NEXT_PUBLIC_SUPABASE_URL=https://nrhaktkrljotddjfrbve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PRIVATE - Hanya server-side (RAHASIA)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ **KEAMANAN**: 
> - `NEXT_PUBLIC_*` = Aman di client, terbatas oleh RLS
> - `SUPABASE_SERVICE_ROLE_KEY` = BYPASS RLS, hanya gunakan di server!

### Struktur File Supabase

```
src/lib/supabase/
├── client.ts      # Browser client (untuk 'use client' components)
├── server.ts      # Server client (untuk Server Components & Actions)
├── middleware.ts  # Middleware client (untuk auth di middleware)
└── types.ts       # TypeScript types dari database
```

---

## 🔌 Client Types

### 1. Browser Client (Client Components)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton untuk reuse
export const supabase = createClient()
```

**Kapan digunakan:**
- Komponen dengan `'use client'`
- Event handlers (onClick, onChange)
- Real-time subscriptions
- Client-side mutations

**Contoh:**
```typescript
'use client'

import { supabase } from '@/lib/supabase/client'

export function MyComponent() {
  const handleClick = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
    // Handle data...
  }
}
```

### 2. Server Client (Server Components)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  )
}
```

**Kapan digunakan:**
- Server Components (tanpa 'use client')
- Initial data fetching
- SEO-friendly data loading

**Contoh:**
```typescript
// app/(protected)/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  
  // Data di-fetch di server, token aman!
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .single()

  return <Dashboard profile={profile} />
}
```

### 3. Server Action Client

```typescript
// src/lib/supabase/server.ts
export async function createServerActionClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Kapan digunakan:**
- Server Actions
- Route Handlers (API Routes)
- Mutations yang butuh set cookies

**Contoh Server Action:**
```typescript
// app/actions/profile.ts
'use server'

import { createServerActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createServerActionClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('name') as string,
    })
    .eq('id', formData.get('userId'))

  if (error) throw error
  
  revalidatePath('/profile')
}
```

### 4. Admin Client (Service Role)

```typescript
// src/lib/supabase/server.ts
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ BYPASS RLS
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Kapan digunakan:**
- Admin operations
- Background jobs
- System-level operations
- ⚠️ HANYA di server, JANGAN pernah expose ke client!

---

## 🗃️ Database Schema

### Tables Overview

| Table | Deskripsi | RLS |
|-------|-----------|-----|
| `profiles` | Data profil user (guru/staff/admin) | ✅ |
| `students` | Data siswa | ✅ |
| `classes` | Data kelas | ✅ |
| `subjects` | Mata pelajaran | ✅ |
| `schedules` | Jadwal pelajaran | ✅ |
| `attendance` | Absensi guru | ✅ |
| `student_attendance` | Absensi siswa | ✅ |
| `student_grades` | Nilai siswa | ✅ |
| `teaching_journals` | Jurnal mengajar | ✅ |
| `teaching_sessions` | Sesi mengajar | ✅ |
| `teacher_leave_requests` | Perizinan guru | ✅ |
| `teacher_no_teach_records` | Record tidak mengajar | ✅ |
| `announcements` | Pengumuman | ✅ |
| `letters` | Surat menyurat | ✅ |
| `holidays` | Hari libur | ✅ |
| `school_settings` | Pengaturan sekolah | ✅ |
| `push_subscriptions` | Push notification | ✅ |

### Table: profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nip VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  role TEXT NOT NULL, -- 'admin', 'staff', 'teacher'
  subject VARCHAR,
  can_teach BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
```typescript
// Fetch profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// Update profile
await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', userId)
```

### Table: students

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  gender TEXT, -- 'L' or 'P'
  birth_date DATE,
  address TEXT,
  phone VARCHAR,
  class_id UUID REFERENCES classes(id),
  avatar_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: classes

```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  grade VARCHAR NOT NULL,
  academic_year VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: schedules

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL, -- 'Senin', 'Selasa', etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: attendance (Guru)

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'alpha', -- 'hadir', 'terlambat', 'alpha', 'izin', 'sakit'
  type TEXT DEFAULT 'auto', -- 'auto', 'manual', 'qr'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

### Table: student_attendance

```sql
CREATE TABLE student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'alpha',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);
```

---

## 🔐 Row Level Security (RLS)

### Profiles

```sql
-- View all (untuk list guru)
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Update own
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin delete
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Students

```sql
-- View (authenticated only)
CREATE POLICY "Anyone authenticated can view students" ON students
  FOR SELECT USING (auth.role() = 'authenticated');

-- Manage (admin/teacher)
CREATE POLICY "Teachers and admins can manage students" ON students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );
```

### Attendance

```sql
-- View own
CREATE POLICY "Users can view own attendance" ON attendance
  FOR SELECT USING (auth.uid() = user_id);

-- Admin view all
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert own
CREATE POLICY "Authenticated users can insert attendance" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update own
CREATE POLICY "Users can update own attendance" ON attendance
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 🔑 Authentication

### Sign Up

```typescript
// Server Action
'use server'

import { createServerActionClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createServerActionClient()
  
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        full_name: formData.get('name') as string,
        nip: formData.get('nip') as string,
        role: 'teacher',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth?message=Check email for verification')
}
```

### Sign In

```typescript
'use server'

export async function signIn(formData: FormData) {
  const supabase = await createServerActionClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### Sign Out

```typescript
'use server'

export async function signOut() {
  const supabase = await createServerActionClient()
  await supabase.auth.signOut()
  redirect('/auth')
}
```

### Get User (Server)

```typescript
// Di Server Component
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Auth Callback Route

```typescript
// app/auth/callback/route.ts
import { createServerActionClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerActionClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`)
}
```

---

## 📁 Storage

### Bucket: avatars

```typescript
// Upload avatar
const file = formData.get('avatar') as File
const fileExt = file.name.split('.').pop()
const fileName = `${userId}.${fileExt}`

const { error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file, {
    upsert: true,
  })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName)
```

---

## ⚡ Edge Functions

### Daftar Edge Functions

| Function | Trigger | Deskripsi |
|----------|---------|-----------|
| `auto-alpha-attendance` | Cron | Auto-mark alpha untuk guru tidak hadir |
| `mark-teachers-not-teaching` | Cron | Mark guru tidak mengajar |
| `notify-teacher-schedule` | Cron | Notifikasi jadwal mengajar |
| `send-push-notification` | HTTP | Kirim push notification |
| `send-reset-password` | HTTP | Email reset password |
| `delete-user` | HTTP | Hapus user (admin) |

### Memanggil Edge Function

```typescript
// Dari client
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    title: 'Notifikasi',
    body: 'Pesan notifikasi',
    userId: 'user-id',
  },
})

// Dari server dengan service role
const supabase = await createAdminClient()
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: { userId: 'user-to-delete' },
})
```

---

## ✅ Best Practices

### 1. Gunakan Server Client untuk SSR

```typescript
// ✅ BENAR - Data fetch di server, token aman
export default async function Page() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('profiles').select('*')
  return <List data={data} />
}

// ❌ SALAH - Jangan fetch data di client tanpa alasan
'use client'
export default function Page() {
  useEffect(() => {
    supabase.from('profiles').select('*') // Token terexpose!
  }, [])
}
```

### 2. Gunakan Server Actions untuk Mutations

```typescript
// ✅ BENAR - Mutation di server
'use server'
export async function updateProfile(data: FormData) {
  const supabase = await createServerActionClient()
  await supabase.from('profiles').update({...})
}

// Component
export function Form() {
  return <form action={updateProfile}>...</form>
}
```

### 3. Service Role Hanya di Server

```typescript
// ✅ BENAR - Admin client hanya di server
// app/api/admin/route.ts
export async function POST(request: Request) {
  const supabase = await createAdminClient()
  // Bypass RLS untuk admin operations
}

// ❌ SALAH - JANGAN gunakan service role di client
'use client'
// supabase dengan service key = BAHAYA!
```

### 4. Typing yang Benar

```typescript
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type InsertProfile = Database['public']['Tables']['profiles']['Insert']
type UpdateProfile = Database['public']['Tables']['profiles']['Update']

// Gunakan untuk type safety
const profile: Profile = { ... }
```

### 5. Error Handling

```typescript
export async function fetchData() {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
  
  if (error) {
    console.error('Database error:', error)
    throw new Error('Failed to fetch data')
  }
  
  return data
}
```

---

## 🔍 Debugging

### Check Session

```typescript
const supabase = await createServerSupabaseClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

### Check User

```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
```

### RLS Debug

```sql
-- Di SQL Editor, test RLS
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM profiles; -- Lihat apa yang bisa diakses
```

---

## 📚 References

- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
