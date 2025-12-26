# 🚀 Panduan Lengkap Konversi Lovable ke Next.js 14

## Daftar Isi
1. [Persiapan](#persiapan)
2. [Instalasi Next.js](#instalasi-nextjs)
3. [Struktur Folder](#struktur-folder)
4. [Konfigurasi Supabase SSR](#konfigurasi-supabase-ssr)
5. [Konversi Komponen](#konversi-komponen)
6. [Konversi Routing](#konversi-routing)
7. [Environment Variables](#environment-variables)
8. [Middleware Authentication](#middleware-authentication)
9. [Migrasi Halaman](#migrasi-halaman)
10. [Checklist Konversi](#checklist-konversi)

---

## Persiapan

### Tech Stack Saat Ini (Lovable)
```
- React 18.3.1
- Vite
- TypeScript
- Tailwind CSS
- React Router DOM 6.30.1
- Supabase JS 2.84.0
- Shadcn/ui (Radix UI)
- React Query (TanStack Query) 5.83.0
- Lucide React Icons
- date-fns
- Recharts
- Sonner (Toast)
```

### Tech Stack Target (Next.js)
```
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- @supabase/ssr (untuk SSR)
- Shadcn/ui (Radix UI)
- React Query (TanStack Query)
- Lucide React Icons
- date-fns
- Recharts
- Sonner (Toast)
```

---

## Instalasi Next.js

### 1. Buat Project Baru
```bash
npx create-next-app@latest nama-project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install @supabase/supabase-js @supabase/ssr

# UI Components (Shadcn)
npx shadcn@latest init
npx shadcn@latest add accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button calendar card carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu form hover-card input input-otp label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner switch table tabs textarea toast toggle toggle-group tooltip

# Other dependencies
npm install @tanstack/react-query @hookform/resolvers react-hook-form zod
npm install lucide-react date-fns recharts
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate
npm install next-themes vaul cmdk embla-carousel-react react-resizable-panels react-day-picker
npm install jspdf html2canvas xlsx qrcode html5-qrcode

# Dev dependencies
npm install -D @types/qrcode
```

---

## Struktur Folder

### Struktur Lovable (Sebelum)
```
src/
├── components/
│   ├── ui/           # Shadcn components
│   ├── Layout.tsx
│   └── ...
├── contexts/
│   └── SchoolContext.tsx
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── ...
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── api.ts
│   └── utils.ts
├── pages/
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   └── ...
├── utils/
│   └── ...
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

### Struktur Next.js (Sesudah)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── auth/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (protected)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── absensi/
│   │   │   └── page.tsx
│   │   ├── guru/
│   │   │   └── page.tsx
│   │   ├── siswa/
│   │   │   └── page.tsx
│   │   ├── kelas/
│   │   │   └── page.tsx
│   │   ├── jadwal/
│   │   │   └── page.tsx
│   │   ├── mata-pelajaran/
│   │   │   └── page.tsx
│   │   ├── jurnal-mengajar/
│   │   │   └── page.tsx
│   │   ├── monitor-mengajar/
│   │   │   └── page.tsx
│   │   ├── absensi-siswa/
│   │   │   └── page.tsx
│   │   ├── absensi-guru/
│   │   │   └── page.tsx
│   │   ├── absensi-otomatis/
│   │   │   └── page.tsx
│   │   ├── rekap-absensi/
│   │   │   └── page.tsx
│   │   ├── rekap-absensi/[id]/
│   │   │   └── page.tsx
│   │   ├── input-nilai/
│   │   │   └── page.tsx
│   │   ├── perizinan-guru/
│   │   │   └── page.tsx
│   │   ├── laporan-tidak-mengajar/
│   │   │   └── page.tsx
│   │   ├── hari-libur/
│   │   │   └── page.tsx
│   │   ├── pengumuman/
│   │   │   └── page.tsx
│   │   ├── surat-menyurat/
│   │   │   └── page.tsx
│   │   ├── cetak-dokumen/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── setup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── ...
│   ├── error/
│   │   └── page.tsx
│   ├── not-found.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── ui/           # Shadcn components (COPY TANPA UBAH)
│   ├── Layout.tsx
│   └── ...
├── contexts/
│   └── SchoolContext.tsx
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   ├── middleware.ts  # Middleware client
│   │   └── types.ts       # Copy dari integrations
│   ├── api.ts
│   └── utils.ts
├── utils/
│   └── ...
└── middleware.ts
```

---

## Konfigurasi Supabase SSR

### 1. Environment Variables (.env.local)
```env
# PUBLIC (accessible di client)
NEXT_PUBLIC_SUPABASE_URL=https://nrhaktkrljotddjfrbve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PRIVATE (hanya server-side, TIDAK PERNAH expose ke client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Supabase Browser Client (src/lib/supabase/client.ts)
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton untuk client-side
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}

// Export untuk kompatibilitas dengan kode lama
export const supabase = createClient()
```

### 3. Supabase Server Client (src/lib/supabase/server.ts)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
            // Ignore errors in Server Components
          }
        },
      },
    }
  )
}

// Untuk Server Actions dan Route Handlers
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

// Admin client dengan service role (hanya untuk server-side operations)
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
            // Ignore
          }
        },
      },
    }
  )
}
```

### 4. Supabase Middleware Client (src/lib/supabase/middleware.ts)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = [
    '/dashboard',
    '/absensi',
    '/guru',
    '/siswa',
    '/kelas',
    '/jadwal',
    '/mata-pelajaran',
    '/jurnal-mengajar',
    '/monitor-mengajar',
    '/absensi-siswa',
    '/absensi-guru',
    '/absensi-otomatis',
    '/rekap-absensi',
    '/input-nilai',
    '/perizinan-guru',
    '/laporan-tidak-mengajar',
    '/hari-libur',
    '/pengumuman',
    '/surat-menyurat',
    '/cetak-dokumen',
    '/analytics',
    '/profile',
    '/settings',
    '/setup',
  ]

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Auth paths (redirect ke dashboard jika sudah login)
  const authPaths = ['/auth', '/forgot-password', '/reset-password']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect ke login
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  if (isAuthPath && user) {
    // Redirect ke dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### 5. Middleware (src/middleware.ts)
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes yang tidak perlu auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Konversi Komponen

### Aturan Utama

#### 1. Komponen yang PERLU 'use client'
```typescript
// Komponen dengan:
// - useState, useEffect, useContext
// - Event handlers (onClick, onChange, dll)
// - Browser APIs (window, document, localStorage)
// - Third-party libraries yang butuh client

'use client'

import { useState, useEffect } from 'react'
// ... rest of component
```

#### 2. Komponen yang TIDAK PERLU 'use client'
```typescript
// Server Components (default di Next.js App Router):
// - Fetch data langsung
// - Akses database langsung
// - Tidak ada interactivity

import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('table').select('*')
  
  return <div>{/* render data */}</div>
}
```

### Contoh Konversi Komponen

#### Layout.tsx (Client Component)
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation' // GANTI dari react-router-dom
import Link from 'next/link' // GANTI dari react-router-dom
import { supabase } from '@/lib/supabase/client'
// ... rest imports sama

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // ... logic sama
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth') // GANTI dari navigate
  }
  
  return (
    // ... JSX sama, ganti Link dan navigasi
    <Link href="/dashboard"> {/* GANTI dari <Link to="/dashboard"> */}
      Dashboard
    </Link>
  )
}
```

---

## Konversi Routing

### React Router → Next.js Navigation

#### Import Changes
```typescript
// SEBELUM (React Router)
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom'

// SESUDAH (Next.js)
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
```

#### Hook Changes
```typescript
// SEBELUM
const navigate = useNavigate()
const location = useLocation()
const { id } = useParams()

navigate('/dashboard')
navigate(-1)
location.pathname

// SESUDAH
const router = useRouter()
const pathname = usePathname()
const params = useParams()

router.push('/dashboard')
router.back()
pathname
```

#### Link Component
```typescript
// SEBELUM
<Link to="/dashboard">Dashboard</Link>
<Link to={`/user/${id}`}>User</Link>

// SESUDAH
<Link href="/dashboard">Dashboard</Link>
<Link href={`/user/${id}`}>User</Link>
```

---

## Migrasi Halaman

### Pattern Konversi Page

#### 1. Halaman Static (Server Component)
```typescript
// src/app/(protected)/mata-pelajaran/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import MataPelajaranClient from './client'

export const metadata = {
  title: 'Mata Pelajaran | Sistem Sekolah',
  description: 'Kelola mata pelajaran sekolah',
}

export default async function MataPelajaranPage() {
  const supabase = await createServerSupabaseClient()
  
  // Fetch data di server (SSR)
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name')
  
  return <MataPelajaranClient initialData={subjects || []} />
}
```

#### 2. Client Component untuk Interactivity
```typescript
// src/app/(protected)/mata-pelajaran/client.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
// ... imports

interface Props {
  initialData: MataPelajaran[]
}

export default function MataPelajaranClient({ initialData }: Props) {
  const [subjects, setSubjects] = useState(initialData)
  const { toast } = useToast()
  
  // ... rest of component logic sama
  
  return (
    // ... JSX sama persis
  )
}
```

### Mapping Route Lengkap

| React Router Path | Next.js Path | File Location |
|-------------------|--------------|---------------|
| `/` | `/` | `app/page.tsx` |
| `/auth` | `/auth` | `app/(auth)/auth/page.tsx` |
| `/forgot-password` | `/forgot-password` | `app/(auth)/forgot-password/page.tsx` |
| `/reset-password` | `/reset-password` | `app/(auth)/reset-password/page.tsx` |
| `/dashboard` | `/dashboard` | `app/(protected)/dashboard/page.tsx` |
| `/absensi` | `/absensi` | `app/(protected)/absensi/page.tsx` |
| `/guru` | `/guru` | `app/(protected)/guru/page.tsx` |
| `/siswa` | `/siswa` | `app/(protected)/siswa/page.tsx` |
| `/kelas` | `/kelas` | `app/(protected)/kelas/page.tsx` |
| `/jadwal` | `/jadwal` | `app/(protected)/jadwal/page.tsx` |
| `/mata-pelajaran` | `/mata-pelajaran` | `app/(protected)/mata-pelajaran/page.tsx` |
| `/jurnal-mengajar` | `/jurnal-mengajar` | `app/(protected)/jurnal-mengajar/page.tsx` |
| `/monitor-mengajar` | `/monitor-mengajar` | `app/(protected)/monitor-mengajar/page.tsx` |
| `/absensi-siswa` | `/absensi-siswa` | `app/(protected)/absensi-siswa/page.tsx` |
| `/absensi-guru` | `/absensi-guru` | `app/(protected)/absensi-guru/page.tsx` |
| `/absensi-otomatis` | `/absensi-otomatis` | `app/(protected)/absensi-otomatis/page.tsx` |
| `/rekap-absensi` | `/rekap-absensi` | `app/(protected)/rekap-absensi/page.tsx` |
| `/rekap-absensi/:id` | `/rekap-absensi/[id]` | `app/(protected)/rekap-absensi/[id]/page.tsx` |
| `/input-nilai` | `/input-nilai` | `app/(protected)/input-nilai/page.tsx` |
| `/perizinan-guru` | `/perizinan-guru` | `app/(protected)/perizinan-guru/page.tsx` |
| `/laporan-tidak-mengajar` | `/laporan-tidak-mengajar` | `app/(protected)/laporan-tidak-mengajar/page.tsx` |
| `/hari-libur` | `/hari-libur` | `app/(protected)/hari-libur/page.tsx` |
| `/pengumuman` | `/pengumuman` | `app/(protected)/pengumuman/page.tsx` |
| `/surat-menyurat` | `/surat-menyurat` | `app/(protected)/surat-menyurat/page.tsx` |
| `/cetak-dokumen` | `/cetak-dokumen` | `app/(protected)/cetak-dokumen/page.tsx` |
| `/analytics` | `/analytics` | `app/(protected)/analytics/page.tsx` |
| `/profile` | `/profile` | `app/(protected)/profile/page.tsx` |
| `/settings` | `/settings` | `app/(protected)/settings/page.tsx` |
| `/setup` | `/setup` | `app/(protected)/setup/page.tsx` |
| `/link-expired` | `/link-expired` | `app/link-expired/page.tsx` |
| `/error` | `/error` | `app/error/page.tsx` |
| `*` (404) | `not-found` | `app/not-found.tsx` |

---

## App Layouts

### Root Layout (src/app/layout.tsx)
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistem Manajemen Sekolah',
  description: 'Aplikasi manajemen sekolah lengkap',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Providers (src/app/providers.tsx)
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SchoolProvider } from '@/contexts/SchoolContext'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SchoolProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </SchoolProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

### Protected Layout (src/app/(protected)/layout.tsx)
```typescript
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return <>{children}</>
}
```

### Auth Layout (src/app/(auth)/layout.tsx)
```typescript
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
```

---

## Konversi Context

### SchoolContext.tsx
```typescript
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client' // GANTI import path

// ... rest sama persis, tidak ada perubahan logic
```

---

## Konversi Hooks

### usePageTitle.ts → Gunakan Metadata
```typescript
// SEBELUM (hook)
import { useEffect } from 'react'
export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} | Sistem Sekolah`
  }, [title])
}

// SESUDAH (metadata di page.tsx)
export const metadata = {
  title: 'Nama Halaman | Sistem Sekolah',
}

// ATAU dynamic metadata
export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Detail ${params.id} | Sistem Sekolah`,
  }
}
```

---

## Static Files

### Copy Langsung (Tidak Perlu Ubah)
```
public/
├── favicon.ico
├── robots.txt
├── sw.js
└── placeholder.svg
```

### Tailwind Config
```typescript
// tailwind.config.ts - COPY LANGSUNG, tidak perlu ubah
// Pastikan content path benar:
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
],
```

### CSS Global
```css
/* src/app/globals.css */
/* COPY SEMUA dari src/index.css */
/* Tidak perlu ubah apapun */
```

---

## Checklist Konversi

### Phase 1: Setup
- [ ] Buat project Next.js baru
- [ ] Install semua dependencies
- [ ] Setup Shadcn/ui
- [ ] Copy tailwind.config.ts
- [ ] Copy globals.css dari index.css
- [ ] Setup environment variables

### Phase 2: Supabase
- [ ] Buat lib/supabase/client.ts
- [ ] Buat lib/supabase/server.ts
- [ ] Buat lib/supabase/middleware.ts
- [ ] Copy types.ts
- [ ] Buat middleware.ts

### Phase 3: Components
- [ ] Copy semua components/ui/ (tambah 'use client' jika perlu)
- [ ] Konversi Layout.tsx
- [ ] Konversi komponen lainnya

### Phase 4: Contexts & Hooks
- [ ] Konversi SchoolContext.tsx
- [ ] Konversi hooks (tambah 'use client')

### Phase 5: Pages
- [ ] Buat struktur folder app/
- [ ] Konversi setiap halaman
- [ ] Setup metadata untuk SEO

### Phase 6: Utils & Lib
- [ ] Copy utils/
- [ ] Copy lib/api.ts
- [ ] Copy lib/utils.ts

### Phase 7: Testing
- [ ] Test semua routes
- [ ] Test authentication flow
- [ ] Test CRUD operations
- [ ] Test responsive design
- [ ] Verify tidak ada perubahan style

---

## Command Konversi Cepat

### Script untuk copy files
```bash
# Copy components
cp -r src/components/* nextjs-project/src/components/

# Copy hooks
cp -r src/hooks/* nextjs-project/src/hooks/

# Copy utils
cp -r src/utils/* nextjs-project/src/utils/

# Copy lib
cp src/lib/utils.ts nextjs-project/src/lib/
cp src/lib/api.ts nextjs-project/src/lib/

# Copy contexts
cp -r src/contexts/* nextjs-project/src/contexts/

# Copy types
cp src/integrations/supabase/types.ts nextjs-project/src/lib/supabase/

# Copy CSS
cp src/index.css nextjs-project/src/app/globals.css

# Copy public
cp -r public/* nextjs-project/public/

# Copy tailwind config
cp tailwind.config.ts nextjs-project/
```

---

## Tips Penting

### 1. JANGAN UBAH:
- Semua styling (CSS, Tailwind classes)
- Warna dan tema
- Animasi
- Logic bisnis
- Query Supabase
- Struktur data

### 2. YANG PERLU DIUBAH:
- Import paths untuk routing
- Import paths untuk Supabase client
- Tambah 'use client' untuk komponen interaktif
- Ganti useNavigate → useRouter
- Ganti useLocation → usePathname
- Ganti Link to → Link href

### 3. SSR Benefits:
- Token tersembunyi di server
- SEO lebih baik dengan metadata
- Initial load lebih cepat
- Data fetch di server (opsional)

---

## Troubleshooting

### Error: "useRouter only works in Client Components"
```typescript
// Tambahkan 'use client' di atas file
'use client'
```

### Error: "localStorage is not defined"
```typescript
// Wrap dengan check
if (typeof window !== 'undefined') {
  localStorage.getItem('key')
}
```

### Error: "Hydration mismatch"
```typescript
// Gunakan useEffect untuk client-only code
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

### Error: "cookies() should be awaited"
```typescript
// Next.js 15+
const cookieStore = await cookies()
```

---

## Support

Jika ada error saat konversi:
1. Cek console browser untuk client errors
2. Cek terminal untuk server errors
3. Pastikan semua 'use client' sudah ditambahkan
4. Pastikan import paths benar
5. Pastikan environment variables tersedia
