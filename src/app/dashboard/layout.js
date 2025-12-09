import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[250px] p-8 bg-[#fbfbfb]">
        <Topbar />
        {children}
      </main>
    </div>
  );
}