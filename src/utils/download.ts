export function downloadImage(dataUrl: string, filename?: string) {
  const link = document.createElement('a');
  link.download = filename || 'watermarked-image.png';
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
