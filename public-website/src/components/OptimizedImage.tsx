import { useEffect, useRef } from 'react';
import { optimizeImage } from '../utils/coreWebVitals';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean; // For LCP images
  width?: number;
  height?: number;
}

/**
 * Optimized Image Component
 * Automatically applies Core Web Vitals optimizations
 */
export default function OptimizedImage({
  src,
  alt,
  priority = false,
  width,
  height,
  loading,
  fetchPriority,
  ...props
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      optimizeImage(imgRef.current);
    }
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : loading || 'lazy'}
      fetchPriority={priority ? 'high' : fetchPriority || 'auto'}
      decoding="async"
      {...props}
    />
  );
}
