import html2canvas from 'html2canvas';

export async function exportChartToPNG(elementId: string, fileName: string): Promise<void> {
  const element = document.getElementById(elementId);
  
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });

    // Convert to PNG and download
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw error;
  }
}

export async function exportMultipleChartsToPNG(charts: { elementId: string; fileName: string }[]): Promise<void> {
  for (const chart of charts) {
    await exportChartToPNG(chart.elementId, chart.fileName);
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
