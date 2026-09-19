import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed or dismissed
    const isDismissed = localStorage.getItem('pwa-install-dismissed')
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isDismissed || isInstalled) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show after 30 seconds on first visit
      setTimeout(() => setShow(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
      setDeferredPrompt(null)
    }
  }

  const dismiss = () => {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="card p-4 shadow-2xl border border-orange/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-orange" />
          </div>
          <div className="flex-1">
            <div className="font-montserrat font-bold text-navy text-sm mb-0.5">Install MUTCU DMS</div>
            <div className="text-xs text-gray-500 mb-3">
              Add to your home screen for quick access — works offline too!
            </div>
            <div className="flex gap-2">
              <button onClick={install} className="btn-primary btn-sm flex-1 justify-center">
                <Download size={13} /> Install App
              </button>
              <button onClick={dismiss} className="btn-outline btn-sm px-2">
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}