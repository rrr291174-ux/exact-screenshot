import { useEffect, useRef, useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, RotateCcw, FileImage, ChevronLeft, ChevronRight, FileText, Type, 
  ArrowDown, Layers, Maximize2, ZoomIn, ZoomOut, RotateCw, Move, Edit3
} from 'lucide-react';
import { ImageState, WatermarkControls, ImageItem, ImageTransform } from '@/types';
import { downloadImage } from '@/utils/download';

interface EditorPanelProps {
  imageState: ImageState;
  onReset: () => void;
}

const TELEGRAM_LINK = 'https://t.me/tgdsc2025';

const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Impact', label: 'Impact (Bold)' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
];

const IMAGES_PER_PAGE_OPTIONS = [
  { value: 1, label: '1 image per page (Full size)' },
  { value: 2, label: '2 images per page (Vertical stack)' },
  { value: 3, label: '3 images per page (Vertical stack)' },
  { value: 4, label: '4 images per page (Vertical stack)' },
];

export function EditorPanel({ imageState, onReset }: EditorPanelProps) {
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'move' | 'zoom' | 'rotate'>('move');
  const [imageTransforms, setImageTransforms] = useState<{ [key: string]: ImageTransform }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [controls, setControls] = useState<WatermarkControls>({
    bannerHeightPercent: 4.5,
    bannerWidthPercent: 22,
    bgColor: '#FFD400',
    textColor: '#000000',
    fontSizeMultiplier: 0.55,
    offsetX: 20,
    offsetY: 20,
    fontFamily: 'Arial',
    watermarkText: 'TGDSCGROUP',
    imagesPerPage: 2,
    imageSpacing: 0,
    imagePadding: 0,
  });

  // Initialize transforms for new images
  useEffect(() => {
    const newTransforms: { [key: string]: ImageTransform } = {};
    imageState.images.forEach(img => {
      if (!imageTransforms[img.id]) {
        newTransforms[img.id] = { x: 0, y: 0, scale: 1, rotation: 0 };
      } else {
        newTransforms[img.id] = imageTransforms[img.id];
      }
    });
    setImageTransforms(newTransforms);
  }, [imageState.images]);

  const drawWatermark = useCallback((imageItem: ImageItem, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const transform = imageTransforms[imageItem.id] || { x: 0, y: 0, scale: 1, rotation: 0 };

    const baseWidth = imageItem.width;
    const baseHeight = imageItem.height;
    canvas.width = baseWidth;
    canvas.height = baseHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-canvas.width / 2 + transform.x, -canvas.height / 2 + transform.y);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, baseWidth, baseHeight);
      ctx.restore();

      // Watermark banner
      const bannerHeight = canvas.height * (controls.bannerHeightPercent / 100);
      const bannerWidth = canvas.width * (controls.bannerWidthPercent / 100);
      const x = canvas.width - bannerWidth - controls.offsetX;
      const y = canvas.height - bannerHeight - controls.offsetY;

      ctx.fillStyle = controls.bgColor;
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bannerWidth - radius, y);
      ctx.quadraticCurveTo(x + bannerWidth, y, x + bannerWidth, y + radius);
      ctx.lineTo(x + bannerWidth, y + bannerHeight - radius);
      ctx.quadraticCurveTo(x + bannerWidth, y + bannerHeight, x + bannerWidth - radius, y + bannerHeight);
      ctx.lineTo(x + radius, y + bannerHeight);
      ctx.quadraticCurveTo(x, y + bannerHeight, x, y + bannerHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      const fontSize = bannerHeight * controls.fontSizeMultiplier;
      ctx.font = `900 ${fontSize}px "${controls.fontFamily}", Arial, sans-serif`;
      ctx.fillStyle = controls.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(controls.watermarkText || 'TGDSCGROUP', x + bannerWidth / 2, y + bannerHeight / 2);
    };
    img.src = imageItem.src;
  }, [controls, imageTransforms]);

  useEffect(() => {
    imageState.images.forEach(imageItem => {
      const canvas = canvasRefs.current[imageItem.id];
      if (canvas) {
        drawWatermark(imageItem, canvas);
      }
    });
  }, [imageState.images, drawWatermark]);

  const handleMouseDown = (e: React.MouseEvent, imageId: string) => {
    if (!isEditMode || selectedTool !== 'move') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent, imageId: string) => {
    if (!isDragging || selectedTool !== 'move') return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        x: prev[imageId].x + deltaX,
        y: prev[imageId].y + deltaY
      }
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (imageId: string, delta: number) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        scale: Math.max(0.1, Math.min(3, prev[imageId].scale + delta))
      }
    }));
  };

  const handleRotate = (imageId: string, delta: number) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: { ...prev[imageId], rotation: prev[imageId].rotation + delta }
    }));
  };

  const resetTransform = (imageId: string) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: { x: 0, y: 0, scale: 1, rotation: 0 }
    }));
  };

  const handleCanvasClick = (e: React.MouseEvent, imageItem: ImageItem) => {
    if (isEditMode) return; // Don't redirect when in edit mode
    
    const canvas = canvasRefs.current[imageItem.id];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Calculate watermark banner position
    const bannerHeight = canvas.height * (controls.bannerHeightPercent / 100);
    const bannerWidth = canvas.width * (controls.bannerWidthPercent / 100);
    const x = canvas.width - bannerWidth - controls.offsetX;
    const y = canvas.height - bannerHeight - controls.offsetY;
    
    // Check if click is within watermark area
    if (clickX >= x && clickX <= x + bannerWidth && clickY >= y && clickY <= y + bannerHeight) {
      window.open(TELEGRAM_LINK, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      for (let i = 0; i < imageState.images.length; i++) {
        const imageItem = imageState.images[i];
        const canvas = canvasRefs.current[imageItem.id];
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          downloadImage(dataUrl, `watermarked-${imageItem.name}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('Failed to download images:', error);
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  const downloadPDF = useCallback(async (images: ImageItem[]) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const spacing = controls.imageSpacing;
    const padding = controls.imagePadding;
    const imagesPerPage = controls.imagesPerPage;
    
    const totalVerticalGaps = spacing * (imagesPerPage - 1);
    const totalVerticalPadding = padding * 2 * imagesPerPage;
    const useNoMargin = (spacing === 0 && padding === 0);
    const effectiveMargin = useNoMargin ? 0 : 20;
    
    const availableHeight = pageHeight - (effectiveMargin * 2) - totalVerticalGaps - totalVerticalPadding;
    const availableWidth = pageWidth - (effectiveMargin * 2) - (padding * 2);
    const imageHeight = availableHeight / imagesPerPage;
    const imageWidth = availableWidth;

    for (let i = 0; i < images.length; i++) {
      const canvas = canvasRefs.current[images[i].id];
      if (!canvas) continue;
      
      const imgData = canvas.toDataURL("image/png", 1.0);
      const positionInPage = i % imagesPerPage;
      
      if (i > 0 && positionInPage === 0) pdf.addPage();

      const x = effectiveMargin + padding;
      let y = useNoMargin 
        ? (positionInPage * imageHeight) 
        : effectiveMargin + (positionInPage * imageHeight) + (positionInPage * spacing) + padding;

      const ratio = Math.min(imageWidth / canvas.width, imageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const centeredX = x + (imageWidth - imgWidth) / 2;
      const centeredY = y + (imageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", centeredX, centeredY, imgWidth, imgHeight);
    }

    pdf.save("TGDSC_Watermarked.pdf");
  }, [controls.imagesPerPage, controls.imageSpacing, controls.imagePadding]);

  const handleDownloadPDF = useCallback(async () => {
    setIsCreatingPDF(true);
    try {
      await downloadPDF(imageState.images);
    } catch (error) {
      console.error('PDF creation failed:', error);
      alert('PDF creation failed. Please try downloading individual images.');
    } finally {
      setTimeout(() => setIsCreatingPDF(false), 1000);
    }
  }, [imageState.images, downloadPDF]);

  const updateControl = <K extends keyof WatermarkControls>(key: K, value: WatermarkControls[K]) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  const currentImage = imageState.images[currentImageIndex];
  const currentTransform = currentImage ? imageTransforms[currentImage.id] || { x: 0, y: 0, scale: 1, rotation: 0 } : null;

  return (
    <div className="space-y-6">
      {/* Edit Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setIsEditMode(!isEditMode)}
                variant={isEditMode ? "default" : "outline"}
                className={isEditMode ? "bg-secondary hover:bg-secondary/90" : ""}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditMode ? "Edit Mode ON" : "Edit Mode OFF"}
              </Button>
              
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={selectedTool === 'move' ? "default" : "outline"} onClick={() => setSelectedTool('move')}>
                    <Move className="w-4 h-4 mr-1" /> Move
                  </Button>
                  <Button size="sm" variant={selectedTool === 'zoom' ? "default" : "outline"} onClick={() => setSelectedTool('zoom')}>
                    <ZoomIn className="w-4 h-4 mr-1" /> Zoom
                  </Button>
                  <Button size="sm" variant={selectedTool === 'rotate' ? "default" : "outline"} onClick={() => setSelectedTool('rotate')}>
                    <RotateCw className="w-4 h-4 mr-1" /> Rotate
                  </Button>
                </div>
              )}
            </div>
            
            {currentImage && isEditMode && currentTransform && (
              <div className="text-sm text-muted-foreground">
                Position: ({Math.round(currentTransform.x)}, {Math.round(currentTransform.y)}) | 
                Scale: {currentTransform.scale.toFixed(2)}x | 
                Rotation: {currentTransform.rotation}°
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Navigation */}
      {imageState.images.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                disabled={currentImageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentImageIndex + 1} / {imageState.images.length}</span>
                <span className="text-sm text-muted-foreground">({currentImage?.name})</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentImageIndex(Math.min(imageState.images.length - 1, currentImageIndex + 1))}
                disabled={currentImageIndex === imageState.images.length - 1}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Preview {imageState.images.length > 1 && `(Image ${currentImageIndex + 1})`}
            {isEditMode && (
              <span className="text-sm bg-secondary/20 text-secondary px-2 py-1 rounded">
                {selectedTool === 'move' && '👆 Drag to move'}
                {selectedTool === 'zoom' && '🔍 Use buttons to zoom'}
                {selectedTool === 'rotate' && '🔄 Use buttons to rotate'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isEditMode && currentImage && (
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-card rounded-lg shadow-lg p-2 border">
                <Button size="sm" onClick={() => handleZoom(currentImage.id, 0.1)} disabled={currentTransform && currentTransform.scale >= 3}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleZoom(currentImage.id, -0.1)} disabled={currentTransform && currentTransform.scale <= 0.1}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="border-t my-1" />
                <Button size="sm" onClick={() => handleRotate(currentImage.id, 15)}>
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleRotate(currentImage.id, -15)}>
                  <RotateCw className="w-4 h-4 rotate-180" />
                </Button>
                <div className="border-t my-1" />
                <Button size="sm" onClick={() => resetTransform(currentImage.id)} variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div 
              className="overflow-auto max-h-96 border rounded-lg bg-muted/30 p-4"
              style={{ cursor: isEditMode && selectedTool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {imageState.images.map((imageItem, index) => (
                <div
                  key={imageItem.id}
                  className={index === currentImageIndex ? 'block' : 'hidden'}
                  onMouseDown={(e) => handleMouseDown(e, imageItem.id)}
                  onMouseMove={(e) => handleMouseMove(e, imageItem.id)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <canvas
                    ref={el => canvasRefs.current[imageItem.id] = el}
                    className="max-w-full h-auto mx-auto shadow-lg rounded"
                    style={{ maxHeight: '500px', cursor: isEditMode ? undefined : 'pointer' }}
                    onClick={(e) => handleCanvasClick(e, imageItem)}
                    title={isEditMode ? undefined : "Click watermark to join Telegram group"}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Watermark Settings (Applied to all {imageState.images.length} images)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Watermark Text */}
            <div className="space-y-2">
              <Label htmlFor="watermark-text" className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Watermark Text
              </Label>
              <Input
                id="watermark-text"
                type="text"
                value={controls.watermarkText}
                onChange={(e) => updateControl('watermarkText', e.target.value)}
                placeholder="Enter custom text..."
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">{controls.watermarkText.length}/30 characters</p>
            </div>

            {/* Images Per Page */}
            <div className="space-y-2">
              <Label htmlFor="images-per-page" className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> Images Per PDF Page
              </Label>
              <Select value={controls.imagesPerPage.toString()} onValueChange={(value) => updateControl('imagesPerPage', Number(value))}>
                <SelectTrigger><SelectValue placeholder="Select layout" /></SelectTrigger>
                <SelectContent>
                  {IMAGES_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{Math.ceil(imageState.images.length / controls.imagesPerPage)} PDF pages total</p>
            </div>

            {/* Vertical Gap */}
            <div className="space-y-2">
              <Label htmlFor="image-spacing" className="flex items-center gap-2">
                <ArrowDown className="w-4 h-4" /> Vertical Gap: {controls.imageSpacing}px
              </Label>
              <input
                type="range"
                id="image-spacing"
                min="0"
                max="100"
                value={controls.imageSpacing}
                onChange={(e) => updateControl('imageSpacing', Number(e.target.value))}
                className="w-full"
                disabled={controls.imagesPerPage === 1}
              />
            </div>

            {/* Image Padding */}
            <div className="space-y-2">
              <Label htmlFor="image-padding" className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> Image Padding: {controls.imagePadding}px
              </Label>
              <input
                type="range"
                id="image-padding"
                min="0"
                max="100"
                value={controls.imagePadding}
                onChange={(e) => updateControl('imagePadding', Number(e.target.value))}
                className="w-full"
                disabled={controls.imagesPerPage === 1}
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select value={controls.fontFamily} onValueChange={(value) => updateControl('fontFamily', value)}>
                <SelectTrigger><SelectValue placeholder="Select font" /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Banner Height */}
            <div className="space-y-2">
              <Label htmlFor="banner-height">Banner Height: {controls.bannerHeightPercent}%</Label>
              <input type="range" id="banner-height" min="2" max="10" step="0.5" value={controls.bannerHeightPercent}
                onChange={(e) => updateControl('bannerHeightPercent', Number(e.target.value))} className="w-full" />
            </div>

            {/* Banner Width */}
            <div className="space-y-2">
              <Label htmlFor="banner-width">Banner Width: {controls.bannerWidthPercent}%</Label>
              <input type="range" id="banner-width" min="10" max="40" value={controls.bannerWidthPercent}
                onChange={(e) => updateControl('bannerWidthPercent', Number(e.target.value))} className="w-full" />
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size: {Math.round(controls.fontSizeMultiplier * 100)}%</Label>
              <input type="range" id="font-size" min="30" max="80" step="5" value={controls.fontSizeMultiplier * 100}
                onChange={(e) => updateControl('fontSizeMultiplier', Number(e.target.value) / 100)} className="w-full" />
            </div>

            {/* Offset X */}
            <div className="space-y-2">
              <Label htmlFor="offset-x">Offset X: {controls.offsetX}px</Label>
              <input type="range" id="offset-x" min="0" max="100" step="5" value={controls.offsetX}
                onChange={(e) => updateControl('offsetX', Number(e.target.value))} className="w-full" />
            </div>

            {/* Offset Y */}
            <div className="space-y-2">
              <Label htmlFor="offset-y">Offset Y: {controls.offsetY}px</Label>
              <input type="range" id="offset-y" min="0" max="100" step="5" value={controls.offsetY}
                onChange={(e) => updateControl('offsetY', Number(e.target.value))} className="w-full" />
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex gap-2">
                <Input type="color" id="bg-color" value={controls.bgColor}
                  onChange={(e) => updateControl('bgColor', e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                <Input type="text" value={controls.bgColor} onChange={(e) => updateControl('bgColor', e.target.value)}
                  placeholder="#FFD400" className="flex-1" />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex gap-2">
                <Input type="color" id="text-color" value={controls.textColor}
                  onChange={(e) => updateControl('textColor', e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                <Input type="text" value={controls.textColor} onChange={(e) => updateControl('textColor', e.target.value)}
                  placeholder="#000000" className="flex-1" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Button onClick={handleDownloadAll} disabled={isDownloading} className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : `Download All (${imageState.images.length})`}
            </Button>
            
            <Button onClick={handleDownloadPDF} disabled={isCreatingPDF} className="bg-success hover:bg-success/90 text-success-foreground">
              <FileText className="w-4 h-4 mr-2" />
              {isCreatingPDF ? 'Creating PDF...' : `Download PDF (${Math.ceil(imageState.images.length / controls.imagesPerPage)} pages)`}
            </Button>
            
            <Button onClick={onReset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Start Over
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border">
            <strong className="text-primary">📄 PDF Layout Info</strong>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>📏 Layout: Vertical stacking</div>
              <div>🔲 Gap: {controls.imageSpacing === 0 ? "No gap" : `${controls.imageSpacing}px`}</div>
              <div>📐 Padding: {controls.imagePadding === 0 ? "None" : `${controls.imagePadding}px`}</div>
              <div>📄 Per Page: {controls.imagesPerPage} images</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
