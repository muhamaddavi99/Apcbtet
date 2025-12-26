-- Create teaching_journals table for Jurnal Mengajar
CREATE TABLE public.teaching_journals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  topic text NOT NULL,
  description text,
  teaching_method text,
  learning_objectives text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for teaching_journals
ALTER TABLE public.teaching_journals ENABLE ROW LEVEL SECURITY;

-- Policies for teaching_journals
CREATE POLICY "Teachers can view all journals"
ON public.teaching_journals
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'teacher', 'staff')
));

CREATE POLICY "Teachers can manage own journals"
ON public.teaching_journals
FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all journals"
ON public.teaching_journals
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
));

-- Create student_grades table for Nilai Siswa
CREATE TABLE public.student_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year varchar(20) NOT NULL,
  semester varchar(10) NOT NULL,
  grade_type varchar(50) NOT NULL, -- 'tugas', 'uh', 'uts', 'uas', 'praktik'
  grade_value decimal(5,2) NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for student_grades
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

-- Policies for student_grades
CREATE POLICY "Teachers and staff can view grades"
ON public.student_grades
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'teacher', 'staff')
));

CREATE POLICY "Teachers can manage own grades"
ON public.student_grades
FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all grades"
ON public.student_grades
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
));

-- Create letters table for Surat Menyurat
CREATE TABLE public.letters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_number varchar(100) NOT NULL,
  letter_type varchar(20) NOT NULL, -- 'masuk' or 'keluar'
  date date NOT NULL,
  sender text,
  recipient text,
  subject text NOT NULL,
  content text,
  category varchar(50),
  file_url text,
  status varchar(20) DEFAULT 'pending',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for letters
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- Policies for letters
CREATE POLICY "Staff and admins can view letters"
ON public.letters
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

CREATE POLICY "Staff and admins can manage letters"
ON public.letters
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

-- Create trigger for updated_at
CREATE TRIGGER update_teaching_journals_updated_at
BEFORE UPDATE ON public.teaching_journals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_student_grades_updated_at
BEFORE UPDATE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_letters_updated_at
BEFORE UPDATE ON public.letters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();