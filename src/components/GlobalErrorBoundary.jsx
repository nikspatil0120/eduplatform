import React from 'react'

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-xl text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{String(this.state.error?.message || 'Unexpected error')}</p>
            <button className="btn-primary" onClick={() => window.location.assign('/')}>Go to Home</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default GlobalErrorBoundary


