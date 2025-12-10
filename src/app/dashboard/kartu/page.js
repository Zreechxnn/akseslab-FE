export default function KartuPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans">
      
      {/* Title Badge */}
      <div>
        <h1 className="text-xl font-bold text-gray-700 bg-white px-5 py-2 rounded-xl shadow-sm inline-block border border-gray-100">
          <i className="fas fa-id-card mr-2 text-orange-500"></i> Data Kartu
        </h1>
      </div>

      {/* Area Konten Kosong */}
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400">
        <p>Konten Data Kartu akan dimuat di sini...</p>
      </div>

    </div>
  );
}