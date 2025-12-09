'use client';
import { useEffect, useState, useRef } from 'react';
import { CONFIG } from '@/lib/config';
import { createSignalRConnection } from '@/lib/signalr';
import { HubConnectionState } from "@microsoft/signalr";

export default function AktivitasPage() {
  // State Data
  const [data, setData] = useState([]); // Data asli
  const [filteredData, setFilteredData] = useState([]); // Data setelah filter
  const [loading, setLoading] = useState(true);

  // State Options (Dropdown)
  const [labs, setLabs] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [users, setUsers] = useState([]);

  // State Filter
  const [filters, setFilters] = useState({
    lab: '',
    kelas: '',
    user: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // State Statistik
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    avgDuration: '0',
    popularLab: '-'
  });

  const connectionRef = useRef(null);

  // 1. Fetch Data Awal (Dropdown & Table)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Dropdown Options Parallel
        const [resLab, resKelas, resUser, resAct] = await Promise.all([
          fetch(`${CONFIG.BASE_URL}/api/Ruangan`, { headers }).then(r => r.json()),
          fetch(`${CONFIG.BASE_URL}/api/Kelas`, { headers }).then(r => r.json()),
          fetch(`${CONFIG.BASE_URL}/api/User`, { headers }).then(r => r.json()),
          fetch(`${CONFIG.BASE_URL}/api/Aktivitas`, { headers }).then(r => r.json())
        ]);

        if (resLab.success) setLabs(resLab.data);
        if (resKelas.success) setKelas(resKelas.data);
        if (resUser.success) setUsers(resUser.data);
        
        if (resAct.success) {
          // Sort data by terbaru
          const sortedData = resAct.data.sort((a, b) => new Date(b.timestampMasuk) - new Date(a.timestampMasuk));
          setData(sortedData);
          setFilteredData(sortedData);
          calculateStats(sortedData);
        }
      } catch (error) {
        console.error("Gagal memuat data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // 2. Setup SignalR Realtime Update
    const connection = createSignalRConnection(token);
    connectionRef.current = connection;

    const startSignalR = async () => {
      try {
        if (connection.state === HubConnectionState.Disconnected) {
          await connection.start();
          
          const refreshData = () => {
             // Fetch ulang hanya data aktivitas agar tabel update realtime
             fetch(`${CONFIG.BASE_URL}/api/Aktivitas`, { headers: { 'Authorization': `Bearer ${token}` } })
               .then(r => r.json())
               .then(res => {
                 if(res.success) {
                   const sorted = res.data.sort((a, b) => new Date(b.timestampMasuk) - new Date(a.timestampMasuk));
                   setData(sorted);
                   // Apply current filters to new data
                   // Note: Untuk simplifikasi, kita reset ke sorted, atau perlu logic re-apply filter complex
                   // Disini kita setFilteredData(sorted) agar user melihat data baru masuk
                   setFilteredData(sorted); 
                   calculateStats(sorted);
                 }
               });
          };

          connection.on("ReceiveCheckIn", refreshData);
          connection.on("ReceiveCheckOut", refreshData);
        }
      } catch (e) { /* ignore */ }
    };
    
    // Delay agar tidak blocking render awal
    setTimeout(startSignalR, 1000);

    return () => {
      if(connection) connection.stop().catch(() => {});
    };
  }, []);

  // 3. Logic Filter (Client Side)
  useEffect(() => {
    let res = [...data];

    if (filters.lab) res = res.filter(item => item.ruanganId == filters.lab);
    if (filters.kelas) res = res.filter(item => item.kelasId == filters.kelas);
    if (filters.user) res = res.filter(item => item.userId == filters.user);
    
    if (filters.status) {
      res = res.filter(item => {
        const isOut = item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar;
        return filters.status === 'CHECKIN' ? !isOut : isOut;
      });
    }

    if (filters.startDate) {
        res = res.filter(item => new Date(item.timestampMasuk) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
        // Set end date to end of day
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59);
        res = res.filter(item => new Date(item.timestampMasuk) <= end);
    }

    setFilteredData(res);
    calculateStats(res); // Recalculate stats based on filtered view
  }, [filters, data]);

  // 4. Hitung Statistik Helper
  const calculateStats = (items) => {
    const active = items.filter(i => !i.timestampKeluar || i.timestampMasuk === i.timestampKeluar).length;
    
    let totalDurasi = 0;
    let countSelesai = 0;
    const labCounts = {};

    items.forEach(i => {
      // Durasi
      if (i.timestampKeluar && i.timestampMasuk !== i.timestampKeluar) {
        totalDurasi += (new Date(i.timestampKeluar) - new Date(i.timestampMasuk));
        countSelesai++;
      }
      // Populer
      const lab = i.ruanganNama || 'Unknown';
      labCounts[lab] = (labCounts[lab] || 0) + 1;
    });

    const avg = countSelesai > 0 ? (totalDurasi / countSelesai / 60000).toFixed(1) : 0;
    
    let popular = '-';
    let max = 0;
    Object.entries(labCounts).forEach(([lab, count]) => {
      if (count > max) { max = count; popular = lab; }
    });

    setStats({
      total: items.length,
      active: active,
      avgDuration: `${avg} menit`,
      popularLab: popular
    });
  };

  // 5. Handlers
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    setFilters({ lab: '', kelas: '', user: '', status: '', startDate: '', endDate: '' });
  };

  const handleDelete = async (id) => {
    if(!confirm("Hapus data aktivitas ini?")) return;
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Hapus dari state lokal biar cepat tanpa fetch ulang
        const newData = data.filter(i => i.id !== id);
        setData(newData);
      } else {
        alert("Gagal menghapus data");
      }
    } catch (e) { console.error(e); }
  };

  const handleExport = () => {
    if (filteredData.length === 0) return alert("Tidak ada data");
    
    let csv = "No,UID Kartu,Lab,Pemilik,Masuk,Keluar,Status\n";
    filteredData.forEach((item, index) => {
        const masuk = new Date(item.timestampMasuk).toLocaleString('id-ID');
        const keluar = item.timestampKeluar ? new Date(item.timestampKeluar).toLocaleString('id-ID') : '-';
        const status = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) ? "CHECK OUT" : "CHECK IN";
        const pemilik = item.userUsername ? `User: ${item.userUsername}` : (item.kelasNama ? `Kelas: ${item.kelasNama}` : '-');
        
        csv += `${index+1},'${item.kartuUid},"${item.ruanganNama}","${pemilik}","${masuk}","${keluar}",${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "laporan_aktivitas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Helper
  const formatTime = (isoString) => {
    if(!isoString) return '-';
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
    });
  };

  const calculateDuration = (masuk, keluar) => {
    if (!keluar || masuk === keluar) return '-';
    const diff = new Date(keluar) - new Date(masuk);
    return `${Math.floor(diff / 60000)}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-[#8a8af5] flex items-center">
        <i className="fas fa-chart-line text-[#8a8af5] text-xl mr-3"></i>
        <h1 className="text-xl font-bold text-gray-800">Aktivitas Lab</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <i className="fas fa-filter"></i> Filter Data
          </h3>
          <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <i className="fas fa-redo"></i> Reset
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <FilterSelect label="Pilih Lab" name="lab" value={filters.lab} onChange={handleFilterChange} options={labs} displayKey="nama" />
          <FilterSelect label="Pilih Kelas" name="kelas" value={filters.kelas} onChange={handleFilterChange} options={kelas} displayKey="nama" />
          <FilterSelect label="Pilih User" name="user" value={filters.user} onChange={handleFilterChange} options={users} displayKey="username" />
          
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1">Tanggal Mulai</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-gray-50" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1">Tanggal Sampai</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-gray-50" />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-gray-50">
              <option value="">Semua Status</option>
              <option value="CHECKIN">Check In</option>
              <option value="CHECKOUT">Check Out</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Aktivitas" value={stats.total} icon="fa-history" color="bg-gradient-to-br from-[#8a8af5] to-[#9b9bf8]" />
        <StatCard title="Sedang Aktif" value={stats.active} icon="fa-door-open" color="bg-gradient-to-br from-[#a3d9d3] to-[#8bcbc4]" />
        <StatCard title="Rata-rata Durasi" value={stats.avgDuration} icon="fa-user-clock" color="bg-gradient-to-br from-[#fcb6b1] to-[#fba19b]" />
        <StatCard title="Lab Terpopuler" value={stats.popularLab} icon="fa-thumbs-up" color="bg-gradient-to-br from-[#8a8af5] to-[#9b9bf8]" />
      </div>

      {/* Table Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list"></i> Daftar Riwayat
          </h3>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <i className="fas fa-download text-green-600"></i> Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4">No</th>
                <th className="p-4">UID Kartu</th>
                <th className="p-4">Lab</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Masuk</th>
                <th className="p-4">Keluar</th>
                <th className="p-4">Durasi</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-400">Loading data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-400">Tidak ada data ditemukan</td></tr>
              ) : (
                filteredData.map((item, index) => {
                  const isCheckOut = item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar;
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4"><span className="bg-red-50 text-red-400 px-2 py-1 rounded font-mono text-xs">{item.kartuUid || 'N/A'}</span></td>
                      <td className="p-4 font-medium">{item.ruanganNama || '-'}</td>
                      <td className="p-4">
                        {item.userUsername ? (
                          <div className="flex items-center gap-2 text-blue-700">
                            <i className="fas fa-user-circle"></i> <span className="font-semibold">{item.userUsername}</span>
                          </div>
                        ) : item.kelasNama ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <i className="fas fa-users"></i> <span>{item.kelasNama}</span>
                          </div>
                        ) : <span className="text-gray-400 italic">Unknown</span>}
                      </td>
                      <td className="p-4">{formatTime(item.timestampMasuk)}</td>
                      <td className="p-4">{item.timestampKeluar ? formatTime(item.timestampKeluar) : '-'}</td>
                      <td className="p-4 font-mono text-xs">{calculateDuration(item.timestampMasuk, item.timestampKeluar)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${isCheckOut ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-teal-100 text-teal-700 border border-teal-200'}`}>
                          {isCheckOut ? 'CHECK OUT' : 'CHECK IN'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 transition">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} text-white p-5 rounded-2xl shadow-lg flex items-center gap-4`}>
      <div className="text-2xl opacity-80"><i className={`fas ${icon}`}></i></div>
      <div>
        <h3 className="text-xs font-medium opacity-90 uppercase tracking-wide">{title}</h3>
        <p className="text-xl font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, name, value, onChange, options, displayKey }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 mb-1">{label}</label>
      <select name={name} value={value} onChange={onChange} className="p-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-gray-50">
        <option value="">Semua</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt[displayKey]}</option>
        ))}
      </select>
    </div>
  );
}