// API Configuration
// Ganti dengan URL backend Node.js Anda
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper untuk handle response
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Terjadi kesalahan' }));
    throw new Error(error.message || 'Terjadi kesalahan');
  }
  return response.json();
}

// Helper untuk request dengan auth
async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
}

// ========== AUTH API ==========
export const authApi = {
  login: async (email: string, password: string) => {
    return authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },

  getCurrentUser: async () => {
    return authFetch('/auth/me');
  },
};

// ========== ABSENSI API ==========
export const absensiApi = {
  // Get absensi hari ini
  getToday: async () => {
    return authFetch('/absensi/today');
  },

  // Get riwayat absensi
  getHistory: async (params?: { startDate?: string; endDate?: string; userId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.userId) queryParams.append('userId', params.userId);
    
    return authFetch(`/absensi/history?${queryParams.toString()}`);
  },

  // Absensi manual via QR
  checkInQR: async (qrCode: string) => {
    return authFetch('/absensi/checkin-qr', {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    });
  },

  // Generate QR code untuk user
  generateQR: async (userId: string) => {
    return authFetch(`/absensi/generate-qr/${userId}`);
  },

  // Cek status absensi otomatis
  getAutoStatus: async () => {
    return authFetch('/absensi/auto-status');
  },
};

// ========== PENGUMUMAN API ==========
export const pengumumanApi = {
  getAll: async () => {
    return authFetch('/pengumuman');
  },

  getById: async (id: string) => {
    return authFetch(`/pengumuman/${id}`);
  },

  create: async (data: { title: string; content: string; priority: string }) => {
    return authFetch('/pengumuman', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { title: string; content: string; priority: string }) => {
    return authFetch(`/pengumuman/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/pengumuman/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== JADWAL API ==========
export const jadwalApi = {
  getAll: async () => {
    return authFetch('/jadwal');
  },

  getByTeacher: async (teacherId: string) => {
    return authFetch(`/jadwal/teacher/${teacherId}`);
  },

  getByClass: async (classId: string) => {
    return authFetch(`/jadwal/class/${classId}`);
  },

  create: async (data: any) => {
    return authFetch('/jadwal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return authFetch(`/jadwal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/jadwal/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== KELAS API ==========
export const kelasApi = {
  getAll: async () => {
    return authFetch('/kelas');
  },

  getById: async (id: string) => {
    return authFetch(`/kelas/${id}`);
  },

  create: async (data: { name: string; grade: string; academicYear: string }) => {
    return authFetch('/kelas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { name: string; grade: string; academicYear: string }) => {
    return authFetch(`/kelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/kelas/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== MATA PELAJARAN API ==========
export const mataPelajaranApi = {
  getAll: async () => {
    return authFetch('/mata-pelajaran');
  },

  getById: async (id: string) => {
    return authFetch(`/mata-pelajaran/${id}`);
  },

  create: async (data: { name: string; code: string }) => {
    return authFetch('/mata-pelajaran', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { name: string; code: string }) => {
    return authFetch(`/mata-pelajaran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/mata-pelajaran/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== SISWA API ==========
export const siswaApi = {
  getAll: async () => {
    return authFetch('/siswa');
  },

  getById: async (id: string) => {
    return authFetch(`/siswa/${id}`);
  },

  getByClass: async (classId: string) => {
    return authFetch(`/siswa/class/${classId}`);
  },

  create: async (data: any) => {
    return authFetch('/siswa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return authFetch(`/siswa/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/siswa/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== GURU API ==========
export const guruApi = {
  getAll: async () => {
    return authFetch('/guru');
  },

  getById: async (id: string) => {
    return authFetch(`/guru/${id}`);
  },

  create: async (data: any) => {
    return authFetch('/guru', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return authFetch(`/guru/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/guru/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== HARI LIBUR API ==========
export const hariLiburApi = {
  getAll: async () => {
    return authFetch('/hari-libur');
  },

  create: async (data: { date: string; name: string; description?: string }) => {
    return authFetch('/hari-libur', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return authFetch(`/hari-libur/${id}`, {
      method: 'DELETE',
    });
  },

  checkIsHoliday: async (date: string) => {
    return authFetch(`/hari-libur/check?date=${date}`);
  },
};
