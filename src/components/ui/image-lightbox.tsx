import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './button';

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setScale(1);
      setRotation(0);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => prev + 90);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
        >
          <ZoomOut className="h-5 w-5 text-white" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
        >
          <ZoomIn className="h-5 w-5 text-white" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); handleRotate(); }}
        >
          <RotateCw className="h-5 w-5 text-white" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full bg-destructive/80 hover:bg-destructive backdrop-blur-sm"
          onClick={onClose}
        >
          <X className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Image */}
      <div 
        className="max-w-[90vw] max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>

      {/* Hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Tekan ESC atau klik di luar gambar untuk menutup
      </p>
    </div>
  );
}

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ClickableImage({ src, alt, className }: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in transition-transform hover:scale-[1.02] ${className || ''}`}
        onClick={() => setIsOpen(true)}
        loading="lazy"
      />
      <ImageLightbox
        src={src}
        alt={alt}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
