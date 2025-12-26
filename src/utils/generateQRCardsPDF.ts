import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface Student {
  id: string;
  nis: string;
  name: string;
  class_id: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
}

export async function generateQRCardsPDF(
  students: Student[],
  classes: ClassInfo[],
  schoolName: string = 'MA Al-Ittifaqiah 2'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardWidth = 85;
  const cardHeight = 54;
  const marginX = 12;
  const marginY = 10;
  const cardsPerRow = 2;
  const cardsPerPage = 8;
  const qrSize = 35;

  const getClassName = (classId: string | null): string => {
    if (!classId) return 'Belum ditentukan';
    const kelas = classes.find((k) => k.id === classId);
    return kelas?.name || 'Belum ditentukan';
  };

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const pageIndex = Math.floor(i / cardsPerPage);
    const positionOnPage = i % cardsPerPage;
    const col = positionOnPage % cardsPerRow;
    const row = Math.floor(positionOnPage / cardsPerRow);

    // Add new page if needed
    if (i > 0 && positionOnPage === 0) {
      pdf.addPage();
    }

    const x = marginX + col * (cardWidth + 10);
    const y = marginY + row * (cardHeight + 8);

    // Card background
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(200, 200, 200);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

    // Header stripe
    pdf.setFillColor(37, 99, 235); // Primary blue
    pdf.rect(x, y, cardWidth, 12, 'F');

    // School name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(schoolName, x + cardWidth / 2, y + 7, { align: 'center' });

    // Generate QR code
    try {
      const qrDataUrl = await QRCode.toDataURL(student.id, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      
      pdf.addImage(qrDataUrl, 'PNG', x + 5, y + 15, qrSize, qrSize);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Student info
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    const maxNameWidth = cardWidth - qrSize - 15;
    const nameLines = pdf.splitTextToSize(student.name, maxNameWidth);
    pdf.text(nameLines, x + qrSize + 10, y + 20);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(`NIS: ${student.nis}`, x + qrSize + 10, y + 28);
    pdf.text(`Kelas: ${getClassName(student.class_id)}`, x + qrSize + 10, y + 34);

    // Footer
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Kartu Absensi Digital', x + cardWidth / 2, y + cardHeight - 3, { align: 'center' });
  }

  // Save PDF
  pdf.save(`Kartu_QR_Siswa_${new Date().toISOString().split('T')[0]}.pdf`);
}
