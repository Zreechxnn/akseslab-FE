'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '../lib/config';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/api/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('authToken', result.data.token);
        localStorage.setItem('userData', JSON.stringify(result.data));
        router.push('/dashboard');
      } else {
        setError(result.message || "Login gagal.");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Sisi Kiri - Biru Gelap */}
      <div className="flex-1 bg-[#0f2540] text-white flex flex-col items-center justify-center text-center relative hidden md:flex">
        <img src="/img/smk1katapang.png" alt="Logo" className="w-[100px] mb-4" />
        <h1 className="text-2xl font-bold mb-1">SISTEM AKSES LAB</h1>
        <p className="text-sm opacity-80">lab accessing system</p>
        <div className="mt-12 bg-white/20 px-5 py-2 rounded-lg font-bold tracking-wider">
          SISTEM AKSES LAB
        </div>
      </div>

      {/* Sisi Kanan - Form */}
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="w-[80%] max-w-[400px] p-10 bg-white rounded-2xl shadow-xl">
          <form onSubmit={handleLogin}>
            <h2 className="text-sm font-semibold mb-2 text-gray-700">Username</h2>
            <div className="relative mb-6">
              <input 
                type="text" 
                className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0f2540] outline-none text-sm transition"
                placeholder="Masukan Username Anda"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <i className="fas fa-user absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            <h2 className="text-sm font-semibold mb-2 text-gray-700">Password</h2>
            <div className="relative mb-6">
              <input 
                type="password" 
                className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0f2540] outline-none text-sm transition"
                placeholder="Masukan Password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <i className="fas fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full p-4 bg-[#0f2540] text-white font-bold rounded-xl hover:bg-[#1a3a5e] transition disabled:opacity-70"
            >
              {loading ? 'LOADING...' : 'LOGIN'}
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mt-4 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}