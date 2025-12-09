'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'fa-home' },
    { href: '/dashboard/aktivitas', label: 'Aktivitas Lab', icon: 'fa-chart-line' },
    { href: '/dashboard/kelas', label: 'Data Kelas', icon: 'fa-book' },
    { href: '/dashboard/lab', label: 'Data Lab', icon: 'fa-flask' }, // Sesuaikan folder (misal: /dashboard/ruangan jika nama foldernya ruangan)
    { href: '/dashboard/kartu', label: 'Data Kartu', icon: 'fa-id-card' },
  ];

  return (
    <nav className="w-[250px] bg-white flex flex-col p-5 border-r border-gray-100 h-screen fixed left-0 top-0 overflow-y-auto z-50">
      <div className="mb-10 text-center">
        <img src="/img/smk1katapang.png" alt="Logo" className="w-[50px] mx-auto mb-2" />
        <div>
          <h3 className="text-sm font-bold text-gray-800">SYSTEM AKSES LAB</h3>
          <span className="text-xs text-gray-400">SMKN 1 Katapang</span>
        </div>
      </div>

      <ul className="flex-grow space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <li key={item.href}>
              <Link 
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-xl text-sm transition-all duration-300 group ${
                  isActive 
                  ? 'bg-[#cceadd] text-[#2c3e50] font-bold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <i className={`fas ${item.icon} w-[25px] text-center ${isActive ? 'text-[#2c3e50]' : 'text-gray-400 group-hover:text-gray-600'}`}></i> 
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center px-4 py-3 text-[#e74c3c] font-bold w-full hover:bg-red-50 rounded-xl transition-colors">
          <i className="fas fa-sign-out-alt w-[25px] text-center mr-0"></i> Logout
        </button>
      </div>
    </nav>
  );
}