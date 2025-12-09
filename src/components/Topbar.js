'use client';
import { useEffect, useState } from 'react';

export default function Topbar() {
  const [username, setUsername] = useState('Loading...');

  useEffect(() => {
    const userDataRaw = localStorage.getItem('userData');
    if (userDataRaw) {
      const userData = JSON.parse(userDataRaw);
      setUsername(userData.username || "User");
    }
  }, []);

  return (
    <header className="flex justify-between items-center mb-8">
      <div className="bg-white px-5 py-2.5 rounded-full shadow-sm w-[400px] flex items-center">
        <i className="fas fa-search text-gray-400"></i>
        <input type="text" placeholder="Search" className="border-none outline-none ml-2 w-full text-sm" />
      </div>
      <div className="flex items-center gap-5">
        <i className="far fa-bell text-gray-500 cursor-pointer"></i>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
             <i className="fas fa-user text-gray-500"></i>
          </div>
          <span className="text-sm font-medium">{username}</span>
          <i className="fas fa-chevron-down text-xs text-gray-400"></i>
        </div>
      </div>
    </header>
  );
}