import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Zap, FileText, Users } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { ImageItem } from '@/types';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface DropZoneProps {
  onImagesUpload: (images: ImageItem[]) => void;
}

export function DropZone({ onImagesUpload }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const convertPdfToImages = useCallback(async (file: File): Promise<ImageItem[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: ImageItem[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 2; // High resolution
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/png');
      images.push({
        id: `pdf-${Date.now()}-${i}`,
        src: dataUrl,
        width: viewport.width,
        height: viewport.height,
        name: `${file.name}-page-${i}.png`,
      });
    }

    return images;
  }, []);

  const processFiles = useCallback(async (files: FileList) => {
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter(file => file.type.startsWith('image/'));
    const pdfFiles = allFiles.filter(file => file.type === 'application/pdf');

    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      alert('Please select image or PDF files');
      return;
    }

    setIsProcessing(true);

    try {
      // Process image files
      const imagePromises = imageFiles.map((file, index) => {
        return new Promise<ImageItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                id: `img-${Date.now()}-${index}`,
                src: e.target?.result as string,
                width: img.width,
                height: img.height,
                name: file.name
              });
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      });

      // Process PDF files
      const pdfPromises = pdfFiles.map(file => convertPdfToImages(file));

      const [images, ...pdfImageArrays] = await Promise.all([
        Promise.all(imagePromises),
        ...pdfPromises,
      ]);

      const allImages = [...images, ...pdfImageArrays.flat()];
      onImagesUpload(allImages);
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Failed to process some files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onImagesUpload, convertPdfToImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div className="bg-card rounded-2xl shadow-xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-float shadow-glow">
          <Upload className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Upload Your Files</h2>
        <p className="text-muted-foreground">Drop images or PDFs here or click to browse. Multiple files supported.</p>
      </div>
      
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
          }
        `}
      >
        <input
          type="file"
          multiple
          accept="image/*,.pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <ImageIcon className={`w-16 h-16 transition-colors ${isDragOver ? 'text-primary' : 'text-muted-foreground/50'}`} />
            <div>
              {isProcessing ? (
                <p className="text-lg font-medium text-primary">Processing files... Please wait</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">Drop images or PDFs here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Support for JPG, PNG, GIF, WebP, PDF (Max 10MB each)</p>
                </>
              )}
            </div>
          </div>
        </label>
      </div>
      
      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
          <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">Fast Processing</h3>
          <p className="text-sm text-muted-foreground">Instant watermark application</p>
        </div>
        <div className="text-center p-4 bg-secondary/5 rounded-lg border border-secondary/10">
          <FileText className="w-8 h-8 text-secondary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">PDF Export</h3>
          <p className="text-sm text-muted-foreground">Professional PDF generation</p>
        </div>
        <div className="text-center p-4 bg-success/5 rounded-lg border border-success/10">
          <Users className="w-8 h-8 text-success mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">Batch Ready</h3>
          <p className="text-sm text-muted-foreground">Process multiple images</p>
        </div>
      </div>
    </div>
  );
}
