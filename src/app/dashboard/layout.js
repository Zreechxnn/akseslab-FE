import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#fbfbfb]">
      <Sidebar />
      <main className="flex-1 ml-[280px] p-6 md:p-8">
        <Topbar />
        {children}
      </main>
    </div>
  );
}