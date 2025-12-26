import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SchoolSettings {
  id?: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_icon_url: string;
  check_in_time: string;
  late_time: string;
  check_out_time: string;
}

interface SchoolContextType {
  settings: SchoolSettings;
  updateSettings: (newSettings: SchoolSettings) => Promise<void>;
  loading: boolean;
  refetchSettings: () => Promise<void>;
}

const defaultSettings: SchoolSettings = {
  school_name: 'MA Al-Ittifaqiah 2',
  school_address: '',
  school_phone: '',
  school_icon_url: '',
  check_in_time: '07:00',
  late_time: '07:30',
  check_out_time: '14:00',
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching school settings:', error);
        // Fallback to localStorage if database fails
        const savedSettings = localStorage.getItem('schoolSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
        return;
      }

      // If no data exists, create default settings
      if (!data) {
        console.log('No school settings found, using defaults');
        const savedSettings = localStorage.getItem('schoolSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
        return;
      }

      if (data) {
        const formattedSettings: SchoolSettings = {
          id: data.id,
          school_name: data.school_name || defaultSettings.school_name,
          school_address: data.school_address || '',
          school_phone: data.school_phone || '',
          school_icon_url: data.school_icon_url || '',
          check_in_time: data.check_in_time?.slice(0, 5) || defaultSettings.check_in_time,
          late_time: data.late_time?.slice(0, 5) || defaultSettings.late_time,
          check_out_time: data.check_out_time?.slice(0, 5) || defaultSettings.check_out_time,
        };
        setSettings(formattedSettings);
        // Also save to localStorage as backup
        localStorage.setItem('schoolSettings', JSON.stringify(formattedSettings));
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: SchoolSettings) => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Anda harus login untuk mengubah pengaturan');
      }

      // Check if user has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat mengubah pengaturan sekolah');
      }

      if (!settings.id) {
        throw new Error('ID pengaturan tidak ditemukan. Silakan refresh halaman.');
      }

      const { error } = await supabase
        .from('school_settings')
        .update({
          school_name: newSettings.school_name,
          school_address: newSettings.school_address || null,
          school_phone: newSettings.school_phone || null,
          school_icon_url: newSettings.school_icon_url || null,
          check_in_time: newSettings.check_in_time + ':00',
          late_time: newSettings.late_time + ':00',
          check_out_time: newSettings.check_out_time + ':00',
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) {
        console.error('Error updating school settings:', error);
        if (error.message?.includes('row-level security')) {
          throw new Error('Anda tidak memiliki izin untuk mengubah pengaturan ini');
        }
        throw new Error(error.message || 'Gagal menyimpan pengaturan');
      }

      setSettings({ ...newSettings, id: settings.id });
      localStorage.setItem('schoolSettings', JSON.stringify({ ...newSettings, id: settings.id }));
      // Dispatch custom event for other components to listen
      window.dispatchEvent(new CustomEvent('schoolSettingsUpdated', { detail: newSettings }));
    } catch (error: any) {
      console.error('Error in updateSettings:', error);
      throw new Error(error.message || 'Gagal menyimpan pengaturan');
    }
  };

  const refetchSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  return (
    <SchoolContext.Provider value={{ settings, updateSettings, loading, refetchSettings }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolSettings() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchoolSettings must be used within a SchoolProvider');
  }
  return context;
}
