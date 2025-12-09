'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { createSignalRConnection } from '@/lib/signalr';
import { HubConnectionState } from "@microsoft/signalr";
import AccessChart from '@/components/AccessChart';

export default function DashboardPage() {
  // State Utama
  const [stats, setStats] = useState({ totalRuangan: 0, aktifSekarang: 0, totalKelas: 0, totalAkses: 0 });
  const [chartData, setChartData] = useState([]);
  const [chartMode, setChartMode] = useState('monthly'); // 'monthly' atau 'daily'
  
  const isMounted = useRef(false);
  const connectionRef = useRef(null);
  const router = useRouter();

  const getAuthToken = () => localStorage.getItem('authToken');

  // 1. Fetch Stats Cards (Ringkasan)
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(`${CONFIG.BASE_URL}/api/Dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && isMounted.current) setStats(json.data);
    } catch (err) { console.error(err); }
  };

  // 2. Fetch Chart Data (Grafik)
  const fetchChartData = async (mode) => {
    try {
      const token = getAuthToken();
      const endpoint = mode === 'monthly' 
        ? `${CONFIG.BASE_URL}/api/Dashboard/monthly-stats`
        : `${CONFIG.BASE_URL}/api/Dashboard/last-30-days-stats`;

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();

      if (json.success && isMounted.current) {
        // Mapping data agar formatnya seragam untuk Recharts (name & value)
        const formattedData = json.data.map(item => ({
          name: mode === 'monthly' ? item.bulan : item.tanggal,
          value: item.total
        }));
        setChartData(formattedData);
      }
    } catch (err) { console.error("Gagal load chart", err); }
  };

  // Efek ganti mode grafik
  useEffect(() => {
    if(isMounted.current) {
        fetchChartData(chartMode);
    }
  }, [chartMode]);

  useEffect(() => {
    isMounted.current = true;
    const token = getAuthToken();
    if (!token) { router.push('/'); return; }

    fetchStats();
    fetchChartData('monthly'); // Load default chart

    // --- SignalR Setup (Sama seperti sebelumnya) ---
    const connection = createSignalRConnection(token);
    connectionRef.current = connection;

    const startSignalR = async () => {
        try {
            if (connection.state === HubConnectionState.Disconnected) {
                await connection.start();
                if (connection.state === HubConnectionState.Connected) {
                    await connection.invoke("JoinDashboard");
                }

                // Listeners
                connection.on("ReceiveDashboardStats", (data) => isMounted.current && setStats(data));
                
                // Jika ada aktivitas tap, refresh chart juga agar realtime
                const refreshAll = () => {
                    fetchStats();
                    fetchChartData(chartMode);
                };
                
                connection.on("UpdateDashboard", refreshAll);
                connection.on("ReceiveCheckIn", refreshAll);
                connection.on("ReceiveCheckOut", refreshAll);
                
                // Silencers
                connection.on("UserStatusChanged", () => {});
            }
        } catch (e) { /* ignore */ }
    };

    setTimeout(startSignalR, 500);

    return () => {
        isMounted.current = false;
        if (connection) connection.stop().catch(() => {});
    };
  }, []); // Hapus dependency chartMode dari sini agar tidak loop

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-700 bg-white px-4 py-1.5 rounded-lg shadow-sm">Dashboard</h2>
        <div className="text-xs font-mono text-green-600 bg-green-100 px-2 py-1 rounded border border-green-200 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Connected
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Lab" value={stats.totalRuangan || stats.TotalRuangan} icon="fa-check-circle" color="bg-gradient-to-br from-[#9b9bf8] to-[#8a8af5]" />
        <StatCard title="Lab Aktif" value={stats.aktifSekarang || stats.AktifSekarang} icon="fa-door-open" color="bg-gradient-to-br from-[#a3d9d3] to-[#8bcbc4]" />
        <StatCard title="Total Kelas" value={stats.totalKelas || stats.TotalKelas} icon="fa-clock" color="bg-gradient-to-br from-[#fcb6b1] to-[#fba19b]" />
        <StatCard title="Total Akses" value={stats.totalAkses || stats.TotalAkses} icon="fa-check-circle" color="bg-gradient-to-br from-[#9b9bf8] to-[#8a8af5]" />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">Statistik Penggunaan</h3>
            <p className="text-xs text-gray-400">Trend akses lab</p>
          </div>
          
          {/* Tombol Switch Grafik */}
          <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
            <button 
              onClick={() => setChartMode('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${chartMode === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => setChartMode('daily')}
              className={`px-3 py-1.5 rounded-md transition-all ${chartMode === 'daily' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              30 Hari
            </button>
          </div>
        </div>

        <div className="h-[300px] w-full">
           <AccessChart data={chartData} type={chartMode} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} text-white p-6 rounded-2xl shadow-lg flex items-center gap-4 transition hover:-translate-y-1`}>
      <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-2xl">
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        <p className="text-2xl font-bold">{value ?? 0}</p>
      </div>
    </div>
  );
}