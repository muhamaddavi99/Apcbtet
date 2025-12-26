-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. PROFILES TABLE (Guru, Staf, Admin)
-- Linked to auth.users
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nip VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(50),
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'staff')),
  can_teach BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ================================================
-- 2. CLASSES TABLE (Kelas)
-- ================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes"
  ON public.classes FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage classes"
  ON public.classes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 3. SUBJECTS TABLE (Mata Pelajaran)
-- ================================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage subjects"
  ON public.subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 4. STUDENTS TABLE (Siswa)
-- ================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nis VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  birth_date DATE,
  address TEXT,
  phone VARCHAR(20),
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view students"
  ON public.students FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers and admins can manage students"
  ON public.students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- ================================================
-- 5. SCHEDULES TABLE (Jadwal)
-- ================================================
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedules"
  ON public.schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage schedules"
  ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 6. ATTENDANCE TABLE (Absensi Guru/Staf)
-- ================================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'alpha' CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpha')),
  type TEXT DEFAULT 'auto' CHECK (type IN ('auto', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id);

-- ================================================
-- 7. STUDENT ATTENDANCE TABLE (Absensi Siswa)
-- ================================================
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'alpha' CHECK (status IN ('hadir', 'alpha', 'izin', 'sakit')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view student attendance"
  ON public.student_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'staff')
    )
  );

CREATE POLICY "Teachers can manage student attendance"
  ON public.student_attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- ================================================
-- 8. ANNOUNCEMENTS TABLE (Pengumuman)
-- ================================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 9. HOLIDAYS TABLE (Hari Libur)
-- ================================================
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view holidays"
  ON public.holidays FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nip, full_name, email, role, can_teach)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nip', ''),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'teacher'),
    COALESCE((new.raw_user_meta_data->>'can_teach')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- INDEXES for better performance
-- ================================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_nip ON public.profiles(nip);
CREATE INDEX idx_students_nis ON public.students(nis);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_qr ON public.students(qr_code);
CREATE INDEX idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX idx_student_attendance_date ON public.student_attendance(student_id, date);
CREATE INDEX idx_schedules_teacher ON public.schedules(teacher_id);
CREATE INDEX idx_schedules_class ON public.schedules(class_id);