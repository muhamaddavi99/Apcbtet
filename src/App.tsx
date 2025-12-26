import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SchoolProvider } from "./contexts/SchoolContext";
import { ThemeProvider } from "next-themes";
import { NetworkStatusOverlay } from "./components/NetworkStatusOverlay";
import { UpdateDialog } from "./components/UpdateDialog";
import { useAppVersion } from "./hooks/useAppVersion";
import { useDeepLink } from "./hooks/useDeepLink";
import { useState, useEffect } from "react";
import { getPlatformClass } from "./lib/platform";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import Absensi from "./pages/Absensi";
import Pengumuman from "./pages/Pengumuman";
import Guru from "./pages/Guru";
import Kelas from "./pages/Kelas";
import Siswa from "./pages/Siswa";
import AbsensiGuru from "./pages/AbsensiGuru";
import AbsensiOtomatis from "./pages/AbsensiOtomatis";
import AbsensiSiswa from "./pages/AbsensiSiswa";
import Jadwal from "./pages/Jadwal";
import MataPelajaran from "./pages/MataPelajaran";
import HariLibur from "./pages/HariLibur";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";
import LinkExpired from "./pages/LinkExpired";
import Settings from "./pages/Settings";
import RekapAbsensi from "./pages/RekapAbsensi";
import RekapAbsensiDetail from "./pages/RekapAbsensiDetail";
import Profile from "./pages/Profile";
import JurnalMengajar from "./pages/JurnalMengajar";
import InputNilai from "./pages/InputNilai";
import SuratMenyurat from "./pages/SuratMenyurat";
import CetakDokumen from "./pages/CetakDokumen";
import Analytics from "./pages/Analytics";
import PerizinanGuru from "./pages/PerizinanGuru";
import MonitorMengajar from "./pages/MonitorMengajar";
import LaporanTidakMengajar from "./pages/LaporanTidakMengajar";
import Status from "./pages/Status";
import AIAssistant from "./pages/AIAssistant";
import RiwayatPengumuman from "./pages/RiwayatPengumuman";
import Download from "./pages/Download";

const queryClient = new QueryClient();

// Inner app component to use hooks that require Router context
function AppContent() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(true);
  const { hasUpdate, isForceUpdate, latestVersion } = useAppVersion();
  
  // Initialize deep linking
  useDeepLink();

  return (
    <>
      <NetworkStatusOverlay />
      
      {/* Update dialog for native apps */}
      {hasUpdate && latestVersion && (
        <UpdateDialog
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
          versionName={latestVersion.version_name}
          releaseNotes={latestVersion.release_notes}
          downloadUrl={latestVersion.download_url}
          isForceUpdate={isForceUpdate}
        />
      )}

      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/download" element={<Download />} />
        
        <Route path="/absensiotomatis" element={<AbsensiOtomatis />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/absensi-guru" element={<AbsensiGuru />} />
        <Route path="/absensi-siswa" element={<AbsensiSiswa />} />
        <Route path="/pengumuman" element={<Pengumuman />} />
        <Route path="/riwayat-pengumuman" element={<RiwayatPengumuman />} />
        <Route path="/guru" element={<Guru />} />
        <Route path="/kelas" element={<Kelas />} />
        <Route path="/siswa" element={<Siswa />} />
        <Route path="/jadwal" element={<Jadwal />} />
        <Route path="/mata-pelajaran" element={<MataPelajaran />} />
        <Route path="/hari-libur" element={<HariLibur />} />
        <Route path="/rekap" element={<RekapAbsensi />} />
        <Route path="/rekap-detail" element={<RekapAbsensiDetail />} />
        <Route path="/jurnal-mengajar" element={<JurnalMengajar />} />
        <Route path="/input-nilai" element={<InputNilai />} />
        <Route path="/surat-menyurat" element={<SuratMenyurat />} />
        <Route path="/cetak-dokumen" element={<CetakDokumen />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/perizinan-guru" element={<PerizinanGuru />} />
        <Route path="/monitor-mengajar" element={<MonitorMengajar />} />
        <Route path="/laporan-tidak-mengajar" element={<LaporanTidakMengajar />} />
        <Route path="/status" element={<Status />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/link-expired" element={<LinkExpired />} />
        <Route path="/505" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => {
  const [platformClass, setPlatformClass] = useState('');

  useEffect(() => {
    // Set platform class on mount
    setPlatformClass(getPlatformClass());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SchoolProvider>
          <TooltipProvider>
            <div className={platformClass}>
              <Toaster />
              <Sonner />
              
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </SchoolProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
