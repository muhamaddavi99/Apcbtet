import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_VERSION, APP_VERSION_CODE, shouldShowNativeUI, getPlatform } from '@/lib/platform';

interface AppVersion {
  id: string;
  version_code: number;
  version_name: string;
  release_notes: string | null;
  download_url: string | null;
  is_force_update: boolean;
  is_active: boolean;
  platform: string;
  created_at: string;
}

interface UpdateInfo {
  hasUpdate: boolean;
  isForceUpdate: boolean;
  latestVersion: AppVersion | null;
  currentVersion: string;
  currentVersionCode: number;
}

export function useAppVersion() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    isForceUpdate: false,
    latestVersion: null,
    currentVersion: APP_VERSION,
    currentVersionCode: APP_VERSION_CODE,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const platform = getPlatform();
      console.log('[AppVersion] Checking for updates, platform:', platform);
      console.log('[AppVersion] Current version:', APP_VERSION, 'code:', APP_VERSION_CODE);
      
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .or(`platform.eq.all,platform.eq.${platform}`)
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[AppVersion] Query result:', { data, error });

      if (error) {
        console.error('Error checking for updates:', error);
        return;
      }

      if (data) {
        const latestVersion = data as AppVersion;
        const hasUpdate = latestVersion.version_code > APP_VERSION_CODE;
        
        console.log('[AppVersion] Latest version:', latestVersion.version_name, 'code:', latestVersion.version_code);
        console.log('[AppVersion] Has update:', hasUpdate, 'Is force:', latestVersion.is_force_update);
        
        setUpdateInfo({
          hasUpdate,
          isForceUpdate: hasUpdate && latestVersion.is_force_update,
          latestVersion,
          currentVersion: APP_VERSION,
          currentVersionCode: APP_VERSION_CODE,
        });
      } else {
        console.log('[AppVersion] No version data found');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const isNative = shouldShowNativeUI();
    console.log('[AppVersion] useEffect - isNative:', isNative);
    
    // Only check for updates on native platforms (Android/iOS) - NOT on web
    if (isNative) {
      checkForUpdates();
    } else {
      console.log('[AppVersion] Skipping update check - not native platform');
    }
  }, []);

  return {
    ...updateInfo,
    isChecking,
    checkForUpdates,
    isNative: shouldShowNativeUI(),
  };
}
