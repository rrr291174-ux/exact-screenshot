import { useState } from 'react';
import { Header } from '@/components/Header';
import { DropZone } from '@/components/DropZone';
import { EditorPanel } from '@/components/EditorPanel';
import { ImageState, ImageItem } from '@/types';

const Index = () => {
  const [imageState, setImageState] = useState<ImageState>({
    images: [],
    currentImageId: null,
  });

  const handleImagesUpload = (images: ImageItem[]) => {
    setImageState({
      images,
      currentImageId: images[0]?.id || null,
    });
  };

  const handleReset = () => {
    setImageState({
      images: [],
      currentImageId: null,
    });
  };

  return (
    <div className="min-h-screen gradient-secondary">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {imageState.images.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <DropZone onImagesUpload={handleImagesUpload} />
          </div>
        ) : (
          <EditorPanel imageState={imageState} onReset={handleReset} />
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border bg-card/50">
        <p>© 2024 TET DSC Tech Squad. Built with ❤️ for the community.</p>
      </footer>
    </div>
  );
};

export default Index;
