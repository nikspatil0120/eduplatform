import React from 'react'
import { useParams } from 'react-router-dom'
import { useCourseStore } from '../store'

const CertificateView = () => {
  const { id } = useParams()
  const certificates = useCourseStore(s => s.listCertificates())
  const cert = certificates.find(c => c.id === id)

  if (!cert) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-700 dark:text-gray-300">Certificate not found.</div>
      </div>
    )
  }

  const issuedDate = new Date(cert.issuedAt)

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex items-center justify-center p-6">
      {/* Print-only styles: hide everything except the certificate area */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certificate-print-area, #certificate-print-area * { visibility: visible; }
          #certificate-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="certificate-print-area" className="bg-white w-full max-w-4xl aspect-[1.414/1] shadow-2xl relative overflow-hidden rounded-xl">
        {/* Elegant gradient frame */}
        <div className="absolute inset-0 p-3">
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"></div>
        </div>
        <div className="absolute inset-[12px] rounded-md bg-white overflow-hidden">
          {/* Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
            <div className="text-[120px] font-extrabold tracking-widest">EDU</div>
          </div>

          {/* Top ribbon */}
          <div className="relative">
            <div className="h-20 w-full bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50"></div>
            <div className="absolute inset-0 flex items-center justify-between px-10">
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-semibold text-gray-900">EduPlatform</div>
              </div>
              <img alt="logo" src="/vite.svg" className="h-10 w-10 opacity-80" />
            </div>
          </div>

          {/* Body */}
          <div className="relative h-full w-full flex items-center justify-center">
            <div className="text-center px-14 -mt-6">
              <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium text-xs tracking-wide">
                <span>OFFICIAL CERTIFICATE</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-wide mb-4 mt-4">Certificate of Course Completion</h1>
              <p className="text-lg md:text-xl text-gray-700 mb-2">This is to certify that</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">{cert.userName}</p>
              <p className="text-lg md:text-xl text-gray-700 mb-6">has successfully completed the course</p>
              <p className="text-2xl md:text-3xl font-extrabold text-indigo-700 mb-8">{cert.courseName}</p>

              {/* Accents */}
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 uppercase tracking-widest">
                <span className="h-px w-16 bg-gray-300"></span>
                <span>achievement</span>
                <span className="h-px w-16 bg-gray-300"></span>
              </div>

              {/* Details row (date and certificate id only) */}
              <div className="flex justify-between items-end px-10 mt-10">
                <div className="text-left">
                  <div className="text-sm text-gray-600 mb-1">Date</div>
                  <div className="font-medium">{issuedDate.toLocaleDateString()} {issuedDate.toLocaleTimeString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Certificate ID</div>
                  <div className="font-mono">{cert.id}</div>
                </div>
              </div>

              {/* Centered seal */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-10 w-10">
                    <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.5-1.5z" />
                  </svg>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-6 w-6 bg-amber-600 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print fixed bottom-6 right-6">
        <button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
      </div>
    </div>
  )
}

export default CertificateView


