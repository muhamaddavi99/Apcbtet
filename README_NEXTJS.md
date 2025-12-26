# 📚 Sistem Manajemen Sekolah - Next.js Version

Dokumentasi untuk versi Next.js dari Sistem Manajemen Sekolah.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17 atau lebih baru
- npm atau yarn atau pnpm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd nama-project

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan kredensial Supabase Anda

# Run development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📁 Struktur Project

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, register, dll)
│   │   ├── (protected)/       # Protected routes (butuh login)
│   │   ├── api/               # API Routes (opsional)
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── providers.tsx      # Client providers
│   │
│   ├── components/
│   │   ├── ui/               # Shadcn UI components
│   │   ├── Layout.tsx        # Main layout dengan sidebar
│   │   └── ...               # Komponen lainnya
│   │
│   ├── contexts/
│   │   └── SchoolContext.tsx # Context untuk pengaturan sekolah
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx    # Hook untuk deteksi mobile
│   │   ├── use-toast.ts      # Hook untuk toast notifications
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     # Supabase browser client
│   │   │   ├── server.ts     # Supabase server client
│   │   │   ├── middleware.ts # Supabase middleware client
│   │   │   └── types.ts      # Database types
│   │   ├── api.ts            # API utilities
│   │   └── utils.ts          # General utilities
│   │
│   ├── utils/
│   │   ├── exportPDF.ts
│   │   ├── exportChartImage.ts
│   │   └── generateQRCardsPDF.ts
│   │
│   └── middleware.ts         # Next.js middleware untuk auth
│
├── public/                   # Static files
├── supabase/
│   ├── config.toml          # Supabase config
│   └── functions/           # Edge Functions
│
├── .env.local               # Environment variables (local)
├── .env.example             # Environment template
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
└── package.json
```

---

## 🔐 Environment Variables

Buat file `.env.local`:

```env
# Supabase (PUBLIC - accessible di client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (PRIVATE - hanya server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ **PENTING**: Jangan pernah expose `SUPABASE_SERVICE_ROLE_KEY` ke client!

---

## 🛡️ Authentication

### Middleware Protection

Semua route di `/(protected)/` otomatis dilindungi oleh middleware:

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Cek session, redirect ke /auth jika tidak ada
}
```

### Supabase Clients

```typescript
// Client-side (Browser)
import { supabase } from '@/lib/supabase/client'

// Server-side (Server Components, Route Handlers)
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Admin operations (bypass RLS)
import { createAdminClient } from '@/lib/supabase/server'
```

---

## 📄 Pages & Routes

| Route | Deskripsi | Akses |
|-------|-----------|-------|
| `/` | Landing page | Public |
| `/auth` | Login & Register | Public |
| `/forgot-password` | Lupa password | Public |
| `/reset-password` | Reset password | Public |
| `/dashboard` | Dashboard utama | Protected |
| `/absensi` | Menu absensi | Protected |
| `/guru` | Kelola guru | Protected |
| `/siswa` | Kelola siswa | Protected |
| `/kelas` | Kelola kelas | Protected |
| `/jadwal` | Kelola jadwal | Protected (Admin) |
| `/mata-pelajaran` | Kelola mapel | Protected |
| `/jurnal-mengajar` | Jurnal mengajar | Protected |
| `/monitor-mengajar` | Monitor sesi | Protected |
| `/absensi-siswa` | Absensi siswa | Protected |
| `/absensi-guru` | Absensi guru | Protected |
| `/rekap-absensi` | Rekap absensi | Protected |
| `/input-nilai` | Input nilai | Protected |
| `/perizinan-guru` | Perizinan guru | Protected |
| `/pengumuman` | Pengumuman | Protected |
| `/settings` | Pengaturan | Protected (Admin) |
| `/profile` | Profil user | Protected |

---

## 🎨 Styling

### Tailwind CSS
Project menggunakan Tailwind CSS dengan custom theme:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Custom colors menggunakan CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ...
      },
    },
  },
}
```

### CSS Variables
Definisi di `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

---

## 📦 Key Dependencies

| Package | Version | Deskripsi |
|---------|---------|-----------|
| next | 14.x | Framework |
| @supabase/supabase-js | 2.x | Supabase client |
| @supabase/ssr | latest | Supabase SSR support |
| @tanstack/react-query | 5.x | Data fetching |
| tailwindcss | 3.x | Styling |
| shadcn/ui | latest | UI components |
| lucide-react | latest | Icons |
| date-fns | 3.x | Date utilities |
| recharts | 2.x | Charts |
| react-hook-form | 7.x | Form handling |
| zod | 3.x | Validation |

---

## 🔧 Development

### Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# Type check
npm run type-check
```

### Folder Conventions

- `app/` - Routes dan layouts
- `components/ui/` - Reusable UI components
- `components/` - Feature components
- `lib/` - Utilities dan configurations
- `hooks/` - Custom React hooks
- `contexts/` - React contexts

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables di Vercel
1. Buka Vercel Dashboard
2. Settings → Environment Variables
3. Tambahkan semua variables dari `.env.local`

### Build Output
```bash
npm run build
# Output di .next/
```

---

## 📝 API Routes (Opsional)

Jika perlu API routes:

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerActionClient()
  const { data } = await supabase.from('table').select('*')
  
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Process...
  
  return NextResponse.json({ success: true })
}
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Hydration Mismatch**
   ```typescript
   // Gunakan useEffect untuk client-only code
   const [mounted, setMounted] = useState(false)
   useEffect(() => setMounted(true), [])
   if (!mounted) return null
   ```

2. **useRouter Error**
   ```typescript
   // Tambahkan 'use client' di atas file
   'use client'
   ```

3. **localStorage Error**
   ```typescript
   // Check window sebelum akses
   if (typeof window !== 'undefined') {
     localStorage.getItem('key')
   }
   ```

4. **Cookies Error (Next.js 15+)**
   ```typescript
   // Await cookies()
   const cookieStore = await cookies()
   ```

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query)

---

## 📄 License

MIT License - see LICENSE file for details.
