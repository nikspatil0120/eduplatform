import { useState, useEffect } from 'react'

const Avatar = ({ 
  src, 
  alt = 'User Avatar', 
  size = 'md', 
  className = '',
  fallbackName = 'User'
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [shouldUseFallback, setShouldUseFallback] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-32 h-32'
  }

  const sizePixels = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 128
  }

  const getFallbackUrl = () => {
    const pixels = sizePixels[size] || 48
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=6366f1&color=ffffff&size=${pixels}`
  }

  // Check if URL is a problematic Google avatar URL
  const isProblematicGoogleUrl = (url) => {
    if (!url) return false
    return url.includes('lh3.googleusercontent.com') || 
           url.includes('googleusercontent.com') ||
           url.includes('accounts.google.com/avatar')
  }

  // Use effect to detect problematic URLs early
  useEffect(() => {
    if (isProblematicGoogleUrl(src)) {
      console.warn('🚫 Detected problematic Google avatar URL, using fallback:', src)
      setShouldUseFallback(true)
      setImageError(true)
      setImageLoading(false)
    } else {
      setShouldUseFallback(false)
      setImageError(false)
      setImageLoading(true)
    }
  }, [src])

  const processGoogleAvatarUrl = (url) => {
    if (!url) return url
    
    // If it's a problematic Google URL, return null to force fallback
    if (isProblematicGoogleUrl(url)) {
      return null
    }
    
    // Ensure HTTPS for other URLs
    let processedUrl = url.replace(/^http:/, 'https:')
    return processedUrl
  }

  const handleImageLoad = () => {
    if (!shouldUseFallback) {
      setImageLoading(false)
      setImageError(false)
    }
  }

  const handleImageError = (e) => {
    if (!shouldUseFallback) {
      console.warn('Avatar image failed to load:', src)
      setImageError(true)
      setImageLoading(false)
      setShouldUseFallback(true)
    }
  }

  // Determine which image source to use
  const getImageSrc = () => {
    if (!src || shouldUseFallback || imageError) {
      return getFallbackUrl()
    }
    
    const processed = processGoogleAvatarUrl(src)
    return processed || getFallbackUrl()
  }

  const imageSrc = getImageSrc()

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {imageLoading && !shouldUseFallback && (
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse`} />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 ${(imageLoading && !shouldUseFallback) ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  )
}

export default Avatar