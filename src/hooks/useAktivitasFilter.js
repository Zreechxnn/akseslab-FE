import { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '@/lib/config';

export function useAktivitasFilter(rawData) {
  // 1. State Options
  const [options, setOptions] = useState({
    labs: [],
    kelas: [],
    users: []
  });

  // 2. State Filter Input
  const [filters, setFilters] = useState({
    lab: '',
    kelas: '',
    user: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // 3. Load Data Options
  useEffect(() => {
    const fetchOptions = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const [resLab, resKelas, resUser] = await Promise.all([
          fetch(`${CONFIG.BASE_URL}/api/Ruangan`, { headers }).then(r => r.json()),
          fetch(`${CONFIG.BASE_URL}/api/Kelas`, { headers }).then(r => r.json()),
          fetch(`${CONFIG.BASE_URL}/api/User`, { headers }).then(r => r.json())
        ]);

        setOptions({
          labs: resLab.success ? resLab.data : [],
          kelas: resKelas.success ? resKelas.data : [],
          users: resUser.success ? resUser.data : []
        });
      } catch (error) {
        console.error("Gagal memuat filter options", error);
      }
    };

    fetchOptions();
  }, []);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReset = () => {
    setFilters({ lab: '', kelas: '', user: '', status: '', startDate: '', endDate: '' });
  };

  // 4. Logika Filtering (DIPERBAIKI SESUAI SCHEMA API)
  const filteredData = useMemo(() => {
    if (!rawData) return [];

    return rawData.filter(item => {
      // A. Filter Lab 
      // (Bisa pakai ID karena di API Aktivitas ada 'ruanganId')
      if (filters.lab) {
        if (String(item.ruanganId) !== String(filters.lab)) return false;
      }

      // B. Filter Kelas
      // (Di API Aktivitas TIDAK ada kelasId, hanya ada 'kelasNama'. 
      // Kita harus cari Nama Kelas berdasarkan ID dropdown yang dipilih)
      if (filters.kelas) {
        // Cari object kelas di options berdasarkan ID filter
        const selectedClassObj = options.kelas.find(k => String(k.id) === String(filters.kelas));
        
        // Jika filter dipilih tapi item tidak punya kelasNama -> sembunyikan
        if (!item.kelasNama) return false;
        
        // Bandingkan Nama di item dengan Nama dari dropdown
        if (selectedClassObj && item.kelasNama !== selectedClassObj.nama) return false;
      }

      // C. Filter User
      // (Di API Aktivitas TIDAK ada userId, hanya ada 'userUsername'.
      // Cari Username berdasarkan ID dropdown yang dipilih)
      if (filters.user) {
        // Cari object user di options berdasarkan ID filter
        const selectedUserObj = options.users.find(u => String(u.id) === String(filters.user));

        // Jika filter dipilih tapi item tidak punya userUsername -> sembunyikan
        if (!item.userUsername) return false;

        // Bandingkan Username di item dengan Username dari dropdown
        if (selectedUserObj && item.userUsername !== selectedUserObj.username) return false;
      }

      // D. Filter Status
      if (filters.status) {
        const hasCheckout = item.timestampKeluar && item.timestampKeluar !== '0001-01-01T00:00:00';
        const isOut = hasCheckout && (item.timestampMasuk !== item.timestampKeluar);

        if (filters.status === 'CHECKIN' && isOut) return false;
        if (filters.status === 'CHECKOUT' && !isOut) return false;
      }

      // E. Filter Tanggal
      const itemDate = new Date(item.timestampMasuk);
      itemDate.setHours(0, 0, 0, 0);

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(0, 0, 0, 0);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [rawData, filters, options]); // Tambahkan options ke dependency

  return {
    options,
    filters,
    handleFilterChange,
    handleReset,
    filteredData
  };
}