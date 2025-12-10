import * as XLSX from 'xlsx';

export const exportAktivitasToExcel = (data) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diexport");
    return;
  }

  // --- 1. Helper Formatter--
  const formatTime = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'numeric', year: 'numeric', 
      hour: '2-digit', minute:'2-digit'
    });
  };

  const getDuration = (start, end) => {
    const dEnd = new Date(end);
    if (!end || start === end || dEnd.getFullYear() === 1) return '-';
    
    const diff = Math.floor((dEnd - new Date(start)) / 60000);
    return diff < 60 ? `${diff} Menit` : `${Math.floor(diff/60)} Jam ${diff%60} Menit`;
  };

  const getStatus = (masuk, keluar) => {
    const dKeluar = new Date(keluar);
    const hasOut = keluar && dKeluar.getFullYear() !== 1;
    const isOut = hasOut && masuk !== keluar;
    return isOut ? 'CHECK OUT' : 'CHECK IN';
  };

  const excelData = data.map((item, index) => {
    // Logic Pemilik
    const pemilik = item.userUsername ? `User: ${item.userUsername}` : (item.kelasNama || '-');
    
    const kartuIdFormatted = item.kartuUid ? item.kartuUid.split(':').join(' : ') : '-';

    return {
      "No": index + 1,
      "Kartu ID": kartuIdFormatted,
      "Lab": item.ruanganNama || '-',
      "Kelas/User": pemilik,
      "Waktu Masuk": formatTime(item.timestampMasuk),
      "Waktu Keluar": item.timestampKeluar && new Date(item.timestampKeluar).getFullYear() !== 1 ? formatTime(item.timestampKeluar) : '-',
      "Durasi": getDuration(item.timestampMasuk, item.timestampKeluar),
      "Status": getStatus(item.timestampMasuk, item.timestampKeluar)
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Atur Lebar Kolom (Optional, biar rapi)
  const wscols = [
    { wch: 5 },  // No
    { wch: 20 }, // Kartu ID
    { wch: 20 }, // Lab
    { wch: 25 }, // Kelas/User
    { wch: 20 }, // Masuk
    { wch: 20 }, // Keluar
    { wch: 15 }, // Durasi
    { wch: 15 }  // Status
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Aktivitas");

  // --- 4. Download File ---
  const fileName = `Laporan_Aktivitas_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};