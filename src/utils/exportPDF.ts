import jsPDF from 'jspdf';

interface ChartData {
  studentMonthly: any[];
  teacherMonthly: any[];
  classData: any[];
  studentStats: { hadir: number; izin: number; sakit: number; alpha: number; total: number };
  teacherStats: { hadir: number; izin: number; sakit: number; alpha: number; total: number };
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
}

export async function exportAnalyticsToPDF(
  chartData: ChartData,
  selectedMonth: string,
  selectedYear: string,
  schoolInfo: SchoolInfo
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Header
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LAPORAN KEHADIRAN BULANAN', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFontSize(14);
  pdf.text(schoolInfo.name || 'Sekolah', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  if (schoolInfo.address) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(schoolInfo.address, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Period
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  yPosition += 5;
  pdf.text(`Periode: ${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Line separator
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Student Attendance Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REKAP KEHADIRAN SISWA', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Table header
  const colWidths = [40, 30, 30, 30, 30];
  const tableStartX = margin;

  pdf.setFillColor(240, 240, 240);
  pdf.rect(tableStartX, yPosition - 5, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Status', tableStartX + 5, yPosition);
  pdf.text('Hadir', tableStartX + colWidths[0] + 5, yPosition);
  pdf.text('Izin', tableStartX + colWidths[0] + colWidths[1] + 5, yPosition);
  pdf.text('Sakit', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
  pdf.text('Alpha', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPosition);
  yPosition += 8;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.text('Jumlah', tableStartX + 5, yPosition);
  pdf.text(String(chartData.studentStats.hadir), tableStartX + colWidths[0] + 5, yPosition);
  pdf.text(String(chartData.studentStats.izin), tableStartX + colWidths[0] + colWidths[1] + 5, yPosition);
  pdf.text(String(chartData.studentStats.sakit), tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
  pdf.text(String(chartData.studentStats.alpha), tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPosition);
  yPosition += 8;

  const studentTotal = chartData.studentStats.total;
  const studentHadirPct = studentTotal > 0 ? Math.round((chartData.studentStats.hadir / studentTotal) * 100) : 0;
  pdf.text(`Total: ${studentTotal} | Persentase Hadir: ${studentHadirPct}%`, tableStartX + 5, yPosition);
  yPosition += 15;

  // Teacher Attendance Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REKAP KEHADIRAN GURU', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(tableStartX, yPosition - 5, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Status', tableStartX + 5, yPosition);
  pdf.text('Hadir', tableStartX + colWidths[0] + 5, yPosition);
  pdf.text('Izin', tableStartX + colWidths[0] + colWidths[1] + 5, yPosition);
  pdf.text('Sakit', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
  pdf.text('Alpha', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPosition);
  yPosition += 8;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.text('Jumlah', tableStartX + 5, yPosition);
  pdf.text(String(chartData.teacherStats.hadir), tableStartX + colWidths[0] + 5, yPosition);
  pdf.text(String(chartData.teacherStats.izin), tableStartX + colWidths[0] + colWidths[1] + 5, yPosition);
  pdf.text(String(chartData.teacherStats.sakit), tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
  pdf.text(String(chartData.teacherStats.alpha), tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPosition);
  yPosition += 8;

  const teacherTotal = chartData.teacherStats.total;
  const teacherHadirPct = teacherTotal > 0 ? Math.round((chartData.teacherStats.hadir / teacherTotal) * 100) : 0;
  pdf.text(`Total: ${teacherTotal} | Persentase Hadir: ${teacherHadirPct}%`, tableStartX + 5, yPosition);
  yPosition += 15;

  // Class Comparison
  if (chartData.classData.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PERBANDINGAN KEHADIRAN PER KELAS', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(tableStartX, yPosition - 5, 120, 8, 'F');
    pdf.text('Kelas', tableStartX + 5, yPosition);
    pdf.text('Hadir', tableStartX + 60, yPosition);
    pdf.text('Total', tableStartX + 85, yPosition);
    pdf.text('Persentase', tableStartX + 105, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    chartData.classData.slice(0, 10).forEach((kelas) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(kelas.name, tableStartX + 5, yPosition);
      pdf.text(String(kelas.hadir), tableStartX + 60, yPosition);
      pdf.text(String(kelas.total), tableStartX + 85, yPosition);
      pdf.text(`${kelas.percentage}%`, tableStartX + 105, yPosition);
      yPosition += 6;
    });
  }

  // Footer
  yPosition = pdf.internal.pageSize.getHeight() - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, margin, yPosition);
  pdf.text('Sistem Informasi Absensi Sekolah', pageWidth - margin, yPosition, { align: 'right' });

  // Save the PDF
  pdf.save(`Laporan_Kehadiran_${MONTHS[parseInt(selectedMonth) - 1]}_${selectedYear}.pdf`);
}
