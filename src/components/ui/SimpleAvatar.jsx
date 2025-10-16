const SimpleAvatar = ({ 
  src, 
  alt = 'User Avatar', 
  size = 'md', 
  className = '',
  fallbackName = 'User'
}) => {
  console.log('🖼️ SimpleAvatar rendered with:', { src, fallbackName, size })
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

  // For Google avatars, always use fallback due to CORS issues
  const shouldUseFallback = src && (
    src.includes('googleusercontent.com') || 
    src.includes('lh3.googleusercontent.com') ||
    src.includes('accounts.google.com')
  )

  if (shouldUseFallback) {
    console.log('🚫 SimpleAvatar: Using fallback for Google URL:', src)
  }

  const imageSrc = shouldUseFallback ? getFallbackUrl() : (src || getFallbackUrl())

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 dark:border-gray-700`}
        onError={(e) => {
          // If the fallback fails, use a different service
          if (!e.target.src.includes('ui-avatars.com')) {
            e.target.src = getFallbackUrl()
          }
        }}
      />
    </div>
  )
}

export default SimpleAvatar