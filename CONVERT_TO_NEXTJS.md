# Prompt untuk v0 - Konversi Vite ke Next.js

Gunakan prompt di bawah ini untuk mengkonversi proyek ini ke Next.js menggunakan v0.

---

## PROMPT:

```
Saya ingin mengkonversi proyek React + Vite + TypeScript ke Next.js 14 (App Router). Berikut detail proyek saya:

## Tech Stack Saat Ini:
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Supabase (Auth, Database, Edge Functions)
- React Router DOM
- React Query (@tanstack/react-query)
- Lucide React Icons
- date-fns
- Recharts
- jsPDF
- html2canvas
- xlsx (untuk export Excel)

## Struktur Folder Saat Ini:
```
src/
├── components/
│   ├── ui/ (shadcn components)
│   ├── Layout.tsx
│   ├── LoadingScreen.tsx
│   ├── NavLink.tsx
│   ├── NotificationBell.tsx
│   ├── NotificationPermissionBanner.tsx
│   ├── TeacherDashboard.tsx
│   └── AttendanceStatsWidget.tsx
├── pages/
│   ├── Index.tsx
│   ├── Auth.tsx
│   ├── Setup.tsx
│   ├── Dashboard.tsx
│   ├── Guru.tsx
│   ├── Siswa.tsx
│   ├── Kelas.tsx
│   ├── MataPelajaran.tsx
│   ├── Jadwal.tsx
│   ├── Absensi.tsx
│   ├── AbsensiGuru.tsx
│   ├── AbsensiSiswa.tsx
│   ├── AbsensiOtomatis.tsx
│   ├── RekapAbsensi.tsx
│   ├── RekapAbsensiDetail.tsx
│   ├── JurnalMengajar.tsx
│   ├── MonitorMengajar.tsx
│   ├── LaporanTidakMengajar.tsx
│   ├── InputNilai.tsx
│   ├── Pengumuman.tsx
│   ├── SuratMenyurat.tsx
│   ├── PerizinanGuru.tsx
│   ├── HariLibur.tsx
│   ├── Analytics.tsx
│   ├── CetakDokumen.tsx
│   ├── Settings.tsx
│   ├── Profile.tsx
│   ├── ResetPassword.tsx
│   ├── ForgotPassword.tsx
│   ├── LinkExpired.tsx
│   ├── NotFound.tsx
│   └── ServerError.tsx
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── usePageTitle.ts
│   └── usePushNotification.ts
├── contexts/
│   └── SchoolContext.tsx
├── lib/
│   ├── api.ts
│   ├── pushNotification.ts
│   └── utils.ts
├── integrations/supabase/
│   ├── client.ts
│   └── types.ts
├── utils/
│   ├── exportChartImage.ts
│   ├── exportPDF.ts
│   └── generateQRCardsPDF.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Routes yang Perlu Dikonversi:

### Public Routes:
- `/` → `app/page.tsx` (Landing/Index)
- `/auth` → `app/auth/page.tsx` (Login)
- `/setup` → `app/setup/page.tsx` (Initial Setup)
- `/forgot-password` → `app/forgot-password/page.tsx`
- `/reset-password` → `app/reset-password/page.tsx`
- `/link-expired` → `app/link-expired/page.tsx`
- `/500` → `app/500/page.tsx`

### Protected Routes (butuh auth):
- `/dashboard` → `app/(protected)/dashboard/page.tsx`
- `/guru` → `app/(protected)/guru/page.tsx`
- `/siswa` → `app/(protected)/siswa/page.tsx`
- `/kelas` → `app/(protected)/kelas/page.tsx`
- `/mata-pelajaran` → `app/(protected)/mata-pelajaran/page.tsx`
- `/jadwal` → `app/(protected)/jadwal/page.tsx`
- `/absensi` → `app/(protected)/absensi/page.tsx`
- `/absensi-guru` → `app/(protected)/absensi-guru/page.tsx`
- `/absensi-siswa` → `app/(protected)/absensi-siswa/page.tsx`
- `/absensi-otomatis` → `app/(protected)/absensi-otomatis/page.tsx`
- `/rekap-absensi` → `app/(protected)/rekap-absensi/page.tsx`
- `/rekap-absensi/:id` → `app/(protected)/rekap-absensi/[id]/page.tsx`
- `/jurnal-mengajar` → `app/(protected)/jurnal-mengajar/page.tsx`
- `/monitor-mengajar` → `app/(protected)/monitor-mengajar/page.tsx`
- `/laporan-tidak-mengajar` → `app/(protected)/laporan-tidak-mengajar/page.tsx`
- `/input-nilai` → `app/(protected)/input-nilai/page.tsx`
- `/pengumuman` → `app/(protected)/pengumuman/page.tsx`
- `/surat-menyurat` → `app/(protected)/surat-menyurat/page.tsx`
- `/perizinan-guru` → `app/(protected)/perizinan-guru/page.tsx`
- `/hari-libur` → `app/(protected)/hari-libur/page.tsx`
- `/analytics` → `app/(protected)/analytics/page.tsx`
- `/cetak-dokumen` → `app/(protected)/cetak-dokumen/page.tsx`
- `/settings` → `app/(protected)/settings/page.tsx`
- `/profile` → `app/(protected)/profile/page.tsx`

## Konversi yang Diperlukan:

### 1. Environment Variables:
```
VITE_SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID → NEXT_PUBLIC_SUPABASE_PROJECT_ID
```

### 2. Import Alias:
Pertahankan `@/` alias untuk semua imports.

### 3. React Router → Next.js Navigation:

```typescript
// SEBELUM (React Router)
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
const navigate = useNavigate();
navigate('/dashboard');
<Link to="/dashboard">Dashboard</Link>

// SESUDAH (Next.js)
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
const router = useRouter();
router.push('/dashboard');
<Link href="/dashboard">Dashboard</Link>
```

### 4. Layout Structure:

#### Root Layout (`app/layout.tsx`):
```typescript
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sistem Informasi Sekolah',
  description: 'Aplikasi manajemen sekolah',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <QueryProvider>
          <SchoolProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </SchoolProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

#### Protected Layout (`app/(protected)/layout.tsx`):
```typescript
import { Layout } from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Layout>{children}</Layout>
    </AuthGuard>
  );
}
```

### 5. Supabase Client untuk Next.js:

Install package tambahan:
```bash
npm install @supabase/ssr
```

#### Client Component (`lib/supabase/client.ts`):
```typescript
'use client';
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// For backward compatibility
export const supabase = createClient();
```

#### Server Component (`lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
};
```

### 6. React Query Provider (`providers/query-provider.tsx`):
```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 7. Middleware untuk Auth (`middleware.ts`):
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  if (request.nextUrl.pathname.startsWith('/(protected)') || 
      request.nextUrl.pathname === '/dashboard' ||
      request.nextUrl.pathname === '/guru' ||
      request.nextUrl.pathname === '/siswa') {
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  // Redirect logged in users away from auth page
  if (request.nextUrl.pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 8. AuthGuard Component (`components/AuthGuard.tsx`):
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push('/auth');
        } else {
          setIsAuthenticated(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

### 9. Konversi Components:

Tambahkan `'use client'` di awal file untuk components yang menggunakan:
- useState, useEffect, atau hooks lainnya
- Event handlers (onClick, onChange, dll)
- Browser APIs (window, document, localStorage)
- Third-party libraries yang butuh browser

Contoh:
```typescript
'use client';

import { useState, useEffect } from 'react';
// ... rest of component
```

### 10. Static Assets:
- Pindahkan folder `public/` as-is
- Service worker (`public/sw.js`) perlu disesuaikan untuk Next.js

### 11. Dependencies Update:

Tambahkan:
```json
{
  "@supabase/ssr": "latest",
  "next": "14.x"
}
```

Hapus:
```json
{
  "react-router-dom": "x.x.x",
  "vite": "x.x.x",
  "@vitejs/plugin-react-swc": "x.x.x"
}
```

### 12. Database Tables (Supabase):

Proyek ini menggunakan tabel-tabel berikut:
- `profiles` - Data user/guru dengan role (admin, staf, guru)
- `students` - Data siswa
- `classes` - Data kelas
- `subjects` - Mata pelajaran
- `schedules` - Jadwal mengajar
- `attendance` - Absensi guru
- `student_attendance` - Absensi siswa
- `teaching_journals` - Jurnal mengajar
- `teaching_sessions` - Sesi mengajar
- `teacher_no_teach_records` - Record guru tidak mengajar
- `teacher_leave_requests` - Perizinan guru
- `student_grades` - Nilai siswa
- `announcements` - Pengumuman
- `letters` - Surat menyurat
- `holidays` - Hari libur
- `school_settings` - Pengaturan sekolah
- `push_subscriptions` - Push notification subscriptions

### 13. Edge Functions:

Proyek ini memiliki Supabase Edge Functions:
- `auto-alpha-attendance` - Absensi otomatis
- `delete-user` - Hapus user
- `mark-teachers-not-teaching` - Tandai guru tidak mengajar
- `notify-teacher-schedule` - Notifikasi jadwal guru
- `send-push-notification` - Kirim push notification
- `send-reset-password` - Kirim email reset password
- `send-schedule-notification` - Kirim notifikasi jadwal

Edge functions tetap di Supabase, tidak perlu dikonversi.

## Output yang Diharapkan:

1. Struktur folder `app/` lengkap dengan semua routes
2. Root layout dan protected layout
3. Middleware untuk authentication
4. Supabase client setup (client & server)
5. Query provider wrapper
6. AuthGuard component
7. Konversi minimal 3 page components sebagai contoh:
   - Auth page
   - Dashboard page  
   - Satu page dengan data fetching (misal Guru)
8. Update semua shadcn/ui components dengan 'use client' jika diperlukan

## PENTING:
- Pastikan SEMUA functionality tetap sama persis seperti versi Vite
- Jangan mengubah logic bisnis apapun
- Pertahankan semua RLS policies di Supabase
- Pastikan semua role-based access control tetap berfungsi
- Service worker untuk push notification mungkin perlu penyesuaian
```

---

## Langkah Setelah Mendapat Output dari v0:

1. ✅ Buat proyek Next.js baru
2. ✅ Copy semua output dari v0
3. ✅ Copy folder `supabase/` (edge functions)
4. ✅ Copy folder `src/components/ui/` (shadcn components)
5. ✅ Update `.env.local` dengan environment variables
6. ✅ Jalankan `npm install`
7. ✅ Test semua routes dan functionality
8. ✅ Pastikan authentication berfungsi
9. ✅ Test push notifications
10. ✅ Deploy ke Vercel
