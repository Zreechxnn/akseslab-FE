'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { CONFIG } from '@/lib/config';
import { createSignalRConnection } from '@/lib/signalr';
import { HubConnectionState } from "@microsoft/signalr";
import { useAktivitasFilter } from '@/hooks/useAktivitasFilter';

export default function AktivitasPage() {
  // 1. State Data Utama
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Gunakan Custom Hook Filter
  const { 
    options, 
    filters, 
    handleFilterChange, 
    handleReset, 
    filteredData 
  } = useAktivitasFilter(data);

  const connectionRef = useRef(null);

  // 3. Statistik
  const stats = useMemo(() => {
    const total = filteredData.length;
    
    // Aktif = Belum Checkout atau Masuk == Keluar
    const active = filteredData.filter(i => {
       const hasOut = i.timestampKeluar && i.timestampKeluar !== '0001-01-01T00:00:00';
       return !hasOut || i.timestampMasuk === i.timestampKeluar;
    }).length;

    // Hitung Rata-rata Durasi
    let totalDurasi = 0;
    let countSelesai = 0;
    const labCounts = {};

    filteredData.forEach(i => {
      const hasOut = i.timestampKeluar && i.timestampKeluar !== '0001-01-01T00:00:00';
      if (hasOut && i.timestampMasuk !== i.timestampKeluar) {
        totalDurasi += (new Date(i.timestampKeluar) - new Date(i.timestampMasuk));
        countSelesai++;
      }
      const lab = i.ruanganNama || 'Lainnya';
      labCounts[lab] = (labCounts[lab] || 0) + 1;
    });

    const avgDuration = countSelesai > 0 ? (totalDurasi / countSelesai / 60000).toFixed(0) + ' Menit' : '0 Menit';
    
    // Lab Populer
    let popularLab = '-';
    let maxCount = 0;
    Object.entries(labCounts).forEach(([lab, count]) => {
      if (count > maxCount) { maxCount = count; popularLab = lab; }
    });

    return { total, active, avgDuration, popularLab };
  }, [filteredData]);

  // --- Fetch Data & SignalR ---
  const fetchData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data.sort((a, b) => new Date(b.timestampMasuk) - new Date(a.timestampMasuk)));
      }
    } catch (error) {
      console.error("Error loading activities", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SignalR Setup
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const connection = createSignalRConnection(token);
    connectionRef.current = connection;

    const startSignalR = async () => {
      if (connection.state === HubConnectionState.Disconnected) {
        try {
          await connection.start();
          connection.on("ReceiveCheckIn", fetchData); // Reuse fetchData
          connection.on("ReceiveCheckOut", fetchData);
        } catch (e) { console.error("SignalR Error", e); }
      }
    };
    setTimeout(startSignalR, 1000);

    return () => { if(connection) connection.stop().catch(() => {}); };
  }, []);

  // --- Handlers ---
  const handleRefresh = () => {
    fetchData();
  };

  const handleDelete = async (id) => {
    if(!confirm("Hapus data ini?")) return;
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setData(prev => prev.filter(i => i.id !== id));
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
    link.href = url;
    link.download = `Laporan_Aktivitas_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper UI Format
  const formatTime = (iso) => !iso ? '-' : new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'
  });

  const getDuration = (start, end) => {
    const dEnd = new Date(end);
    // Cek tahun 1 atau invalid
    if (!end || start === end || dEnd.getFullYear() === 1) return '-';
    
    const diff = Math.floor((dEnd - new Date(start)) / 60000);
    return diff < 60 ? `${diff} Menit` : `${Math.floor(diff/60)} Jam ${diff%60} Menit`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans">
      
      {/* 1. Page Title Badge */}
      <div>
        <h1 className="text-xl font-bold text-gray-700 bg-white px-5 py-2 rounded-xl shadow-sm inline-block border border-gray-100">
          Aktivitas Lab
        </h1>
      </div>

      {/* 2. Filter & Stats Container */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        
        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SelectBox label="Lab" name="lab" val={filters.lab} fn={handleFilterChange} opts={options.labs} k="nama" />
          <SelectBox label="Kelas" name="kelas" val={filters.kelas} fn={handleFilterChange} opts={options.kelas} k="nama" />
          <DateInput label="Tanggal Mulai" name="startDate" val={filters.startDate} fn={handleFilterChange} />
          <DateInput label="Tanggal Sampai" name="endDate" val={filters.endDate} fn={handleFilterChange} />
          <div className="flex flex-col">
            <label className="text-sm font-bold text-gray-800 mb-1">Status</label>
            <div className="relative">
                <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 appearance-none bg-white text-gray-600 font-medium h-[38px]">
                <option value="">Semua Status</option>
                <option value="CHECKIN">Check In</option>
                <option value="CHECKOUT">Check Out</option>
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
            </div>
          </div>
        </div>

        {/* Stats Cards Row (Colorful) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Aktivitas" val={stats.total} bg="bg-blue-400" icon="fa-check-circle" />
          <StatCard title="Sedang Aktif" val={stats.active} bg="bg-orange-300" icon="fa-door-open" />
          <StatCard title="Waktu Durasi" val={stats.avgDuration} bg="bg-purple-400" icon="fa-stopwatch" />
          <StatCard title="Lab Terpopuler" val={stats.popularLab} bg="bg-pink-400" icon="fa-chart-pie" />
        </div>
      </div>

      {/* 3. Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Table Header & Buttons */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list-ul text-gray-600"></i> Daftar Aktivitas Lab
          </h3>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition flex items-center gap-2 shadow-sm">
               Export excel <i className="fas fa-download"></i>
            </button>
            <button onClick={handleRefresh} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition flex items-center gap-2 shadow-sm">
               Refresh <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-4 w-16 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">NO</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">KARTU ID</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">LAB</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">KELAS/USER</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">WAKTU MASUK</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">WAKTU KELUAR</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">DURASI</th>
                <th className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">STATUS</th>
                <th className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">AKSI</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="9" className="p-10 text-center text-gray-400">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="9" className="p-10 text-center text-gray-400">Tidak ada data ditemukan</td></tr>
              ) : (
                filteredData.map((item, idx) => {
                  const hasOut = item.timestampKeluar && item.timestampKeluar !== '0001-01-01T00:00:00';
                  const isOut = hasOut && item.timestampMasuk !== item.timestampKeluar;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-red-500 tracking-wide text-xs md:text-sm">
                        {/* Format Kartu ID agar ada spasi seperti gambar (Optional) */}
                        {item.kartuUid.split(':').join(' : ')}
                      </td>
                      <td className="p-4 font-bold text-gray-800">{item.ruanganNama}</td>
                      <td className="p-4 text-gray-600">
                         {item.userUsername ? item.userUsername : (item.kelasNama || '-')}
                      </td>
                      <td className="p-4 text-gray-500 text-xs md:text-sm">{formatTime(item.timestampMasuk)}</td>
                      <td className="p-4 text-gray-500 text-xs md:text-sm">{hasOut ? formatTime(item.timestampKeluar) : '-'}</td>
                      <td className="p-4 text-gray-600 font-medium text-xs md:text-sm">{getDuration(item.timestampMasuk, item.timestampKeluar)}</td>
                      <td className="p-4 text-center">
                        {/* Logic Warna Badge Sesuai Gambar: CHECK OUT Hijau, CHECK IN Biru */}
                        <span className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm inline-block min-w-[100px] ${
                          isOut ? 'bg-[#4ADE80]' : 'bg-[#3B82F6]'
                        }`}>
                          {isOut ? 'CHECK OUT' : 'CHECK IN'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                         <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition">
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

// --- Reusable Components (Styled like Reference) ---

function SelectBox({ label, name, val, fn, opts, k }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-bold text-gray-800 mb-1">{label}</label>
      <div className="relative">
        <select name={name} value={val} onChange={fn} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 appearance-none bg-white text-gray-600 font-medium h-[38px]">
            <option value="">Semua {label}</option>
            {opts.map(o => <option key={o.id} value={o.id}>{o[k]}</option>)}
        </select>
        <i className="fas fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
      </div>
    </div>
  )
}

function DateInput({ label, name, val, fn }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-bold text-gray-800 mb-1">{label}</label>
      <input type="date" name={name} value={val} onChange={fn} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 bg-white text-gray-600 font-medium h-[38px]" />
    </div>
  )
}

function StatCard({ title, val, bg, icon }) {
  return (
    <div className={`${bg} rounded-xl p-5 flex items-center gap-4 text-white shadow-md min-h-[100px]`}>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
             {/* Icon stroke effect */}
             <i className={`fas ${icon} text-2xl opacity-90`}></i>
        </div>
        <div>
            <p className="text-sm font-medium opacity-90 mb-1">{title}</p>
            <p className="text-xl md:text-2xl font-bold leading-none break-all">{val}</p>
        </div>
    </div>
  )
}