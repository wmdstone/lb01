'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

// ============================================================================
// ImageWithFallback Component
// 
// A resilient image component that provides:
// - Skeleton loading state during image load
// - Themed gradient placeholder on error (no broken image icons)
// - Smooth transitions between states
// - Anti-alt-text strategy (never shows raw alt text on failure)
// - Proper object-fit: cover to prevent layout shift
// ============================================================================

export interface ImageWithFallbackProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  /** Custom fallback component or null to use default gradient */
  fallback?: React.ReactNode;
  /** Show skeleton loader while loading (default: true) */
  showSkeleton?: boolean;
  /** Custom skeleton className */
  skeletonClassName?: string;
  /** Brand text to show on fallback (default: "PPMH") */
  brandText?: string;
  /** Gradient variant for fallback */
  gradientVariant?: 'primary' | 'secondary' | 'muted' | 'editorial';
  /** Callback when image loads successfully */
  onLoadSuccess?: () => void;
  /** Callback when image fails to load */
  onLoadError?: () => void;
  /** Container className for the wrapper div */
  containerClassName?: string;
}

type LoadingState = 'loading' | 'loaded' | 'error';

// Gradient definitions matching site design
const gradients: Record<string, string> = {
  primary: 'bg-gradient-to-br from-primary/10 via-primary/5 to-background',
  secondary: 'bg-gradient-to-br from-secondary/10 via-secondary/5 to-background',
  muted: 'bg-gradient-to-br from-muted via-muted/50 to-background',
  editorial: 'bg-gradient-to-br from-foreground/[0.03] via-foreground/[0.02] to-background',
};

/**
 * Skeleton Loader Component
 * Animated placeholder while image is loading
 */
const SkeletonLoader = memo(function SkeletonLoader({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div 
      className={cn(
        'absolute inset-0 bg-muted animate-pulse',
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
    </div>
  );
});

/**
 * Fallback Placeholder Component
 * Themed gradient with optional brand text
 */
const FallbackPlaceholder = memo(function FallbackPlaceholder({
  brandText = 'PPMH',
  gradientVariant = 'editorial',
  className,
}: {
  brandText?: string;
  gradientVariant?: keyof typeof gradients;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        gradients[gradientVariant] || gradients.editorial,
        className
      )}
      role="img"
      aria-label={brandText}
    >
      <span className="font-display text-foreground/10 text-4xl font-black select-none">
        {brandText}
      </span>
    </div>
  );
});

/**
 * ImageWithFallback - Zero broken image component
 * 
 * This component wraps next/image with enhanced error handling:
 * 1. Shows skeleton loader while image is loading
 * 2. Displays themed gradient placeholder on error
 * 3. Never shows broken image icons or raw alt text
 * 4. Smooth fade transitions between states
 */
export const ImageWithFallback = memo(function ImageWithFallback({
  src,
  alt,
  fallback,
  showSkeleton = true,
  skeletonClassName,
  brandText = 'PPMH',
  gradientVariant = 'editorial',
  onLoadSuccess,
  onLoadError,
  containerClassName,
  className,
  fill,
  priority,
  ...props
}: ImageWithFallbackProps) {
  const [state, setState] = useState<LoadingState>(() => {
    // If no src, go straight to error state
    if (!src || src === '') return 'error';
    return 'loading';
  });

  // Reset state when src changes
  useEffect(() => {
    if (!src || src === '') {
      setState('error');
    } else {
      setState('loading');
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setState('loaded');
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  const handleError = useCallback(() => {
    setState('error');
    onLoadError?.();
  }, [onLoadError]);

  // If in error state with custom fallback
  if (state === 'error' && fallback) {
    return (
      <div className={cn('relative overflow-hidden', containerClassName)}>
        {fallback}
      </div>
    );
  }

  // If in error state with default fallback
  if (state === 'error') {
    return (
      <div className={cn('relative overflow-hidden', containerClassName)}>
        <FallbackPlaceholder 
          brandText={brandText}
          gradientVariant={gradientVariant}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton Loader */}
      {showSkeleton && state === 'loading' && (
        <SkeletonLoader className={skeletonClassName} />
      )}
      
      {/* Actual Image */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        referrerPolicy="no-referrer"
        className={cn(
          'transition-opacity duration-500',
          state === 'loading' ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
});

// ============================================================================
// Thumbnail Component - Optimized for article cards
// ============================================================================

export interface ThumbnailProps {
  src?: string | null;
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '3/2';
  priority?: boolean;
  className?: string;
  brandText?: string;
  sizes?: string;
}

export const Thumbnail = memo(function Thumbnail({
  src,
  alt,
  aspectRatio = '4/3',
  priority = false,
  className,
  brandText = 'PPMH',
  sizes = '(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 320px',
}: ThumbnailProps) {
  const aspectClasses: Record<string, string> = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '3/2': 'aspect-[3/2]',
  };

  if (!src) {
    return (
      <div 
        className={cn(
          'relative w-full overflow-hidden bg-muted',
          aspectClasses[aspectRatio],
          className
        )}
      >
        <FallbackPlaceholder brandText={brandText} />
      </div>
    );
  }

  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      brandText={brandText}
      containerClassName={cn(
        'relative w-full',
        aspectClasses[aspectRatio],
        className
      )}
      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
    />
  );
});

// ============================================================================
// Avatar Component - Optimized for user photos
// ============================================================================

export interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackInitials?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
};

export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
  fallbackInitials,
}: AvatarImageProps) {
  const initials = fallbackInitials || alt.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const FallbackAvatar = (
    <div 
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold',
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={alt}
    >
      {initials}
    </div>
  );

  if (!src) {
    return FallbackAvatar;
  }

  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      width={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 56 : 80}
      height={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 56 : 80}
      fallback={FallbackAvatar}
      containerClassName={cn(
        'rounded-full',
        sizeClasses[size],
        className
      )}
      className="object-cover rounded-full"
      showSkeleton={true}
      skeletonClassName="rounded-full"
    />
  );
});

// ============================================================================
// CSS Keyframes (add to globals.css if not present)
// ============================================================================
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   animation: shimmer 1.5s infinite;
// }

export default ImageWithFallback;
