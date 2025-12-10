import { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '@/lib/config';

export function useAktivitasFilter(rawData) {

  const [options, setOptions] = useState({
    labs: [],
    kelas: [],
    users: []
  });

  const [filters, setFilters] = useState({
    lab: '',
    kelas: '',
    user: '',
    status: '',
    startDate: '',
    endDate: ''
  });

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

  const filteredData = useMemo(() => {
    if (!rawData) return [];

    return rawData.filter(item => {
    
      if (filters.lab) {
        if (String(item.ruanganId) !== String(filters.lab)) return false;
      }

      if (filters.kelas) {
        const selectedClassObj = options.kelas.find(k => String(k.id) === String(filters.kelas));
        
        if (!item.kelasNama) return false;
        
        if (selectedClassObj && item.kelasNama !== selectedClassObj.nama) return false;
      }

      if (filters.user) {
        const selectedUserObj = options.users.find(u => String(u.id) === String(filters.user));

        if (!item.userUsername) return false;

        if (selectedUserObj && item.userUsername !== selectedUserObj.username) return false;
      }

      if (filters.status) {
        const hasCheckout = item.timestampKeluar && item.timestampKeluar !== '0001-01-01T00:00:00';
        const isOut = hasCheckout && (item.timestampMasuk !== item.timestampKeluar);

        if (filters.status === 'CHECKIN' && isOut) return false;
        if (filters.status === 'CHECKOUT' && !isOut) return false;
      }

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