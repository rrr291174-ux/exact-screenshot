export interface ImageState {
  images: ImageItem[];
  currentImageId: string | null;
}

export interface ImageItem {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
}

export interface WatermarkControls {
  bannerHeightPercent: number;
  bannerWidthPercent: number;
  bgColor: string;
  textColor: string;
  fontSizeMultiplier: number;
  offsetX: number;
  offsetY: number;
  fontFamily: string;
  watermarkText: string;
  imagesPerPage: number;
  imageSpacing: number;
  imagePadding: number;
}

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}
