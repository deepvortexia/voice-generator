import { useState, useEffect, useRef } from 'react'
import './App.css'
import Header from './components/Header'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthModal } from './components/AuthModal'
import { PricingModal } from './components/PricingModal'
import { Notification } from './components/Notification'
import { useCredits } from './hooks/useCredits'
import { AuthCallback } from './pages/AuthCallback'
import { HowToUse } from './pages/HowToUse'

const CREDIT_REFRESH_ERROR = 'Payment successful, but there was a temporary issue syncing your credits. Please refresh the page to see your updated balance.'
const PENDING_STRIPE_SESSION_KEY = 'pending_stripe_session'
const MAX_CHARS = 500

const cleanUrlParams = () => {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppContent() {
  const [text, setText] = useState('')
  const [exaggeration, setExaggeration] = useState(0.5)
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null)
  const [resultAudio, setResultAudio] = useState('')
  const [favSaving, setFavSaving] = useState(false)
  const [favSaved, setFavSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [loadingStage, setLoadingStage] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { user, session, loading } = useAuth()
  const { hasCredits, refreshProfile } = useCredits()

  const processedSessionIdRef = useRef<string | null>(null)
  const processedPendingSessionRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => { setIsLoaded(true) }, [])

  useEffect(() => {
    const handleStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) return
      if (processedSessionIdRef.current === sessionId) return
      if (loading) return
      processedSessionIdRef.current = sessionId
      if (user) {
        try {
          await refreshProfile()
          setShowNotification(true)
          cleanUrlParams()
        } catch {
          setToast({ title: 'Sync Error', message: CREDIT_REFRESH_ERROR, type: 'warning' })
        }
      } else {
        localStorage.setItem(PENDING_STRIPE_SESSION_KEY, sessionId)
        cleanUrlParams()
      }
    }
    handleStripeReturn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  useEffect(() => {
    const processPending = async () => {
      if (!user) { processedPendingSessionRef.current = false; return }
      if (processedPendingSessionRef.current) return
      const pendingSession = localStorage.getItem(PENDING_STRIPE_SESSION_KEY)
      if (pendingSession) {
        processedPendingSessionRef.current = true
        try {
          await refreshProfile()
          localStorage.removeItem(PENDING_STRIPE_SESSION_KEY)
          setShowNotification(true)
        } catch {
          processedPendingSessionRef.current = false
          setToast({ title: 'Sync Error', message: CREDIT_REFRESH_ERROR, type: 'warning' })
        }
      }
    }
    processPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const generateVoice = async () => {
    if (!text.trim()) { setToast({ title: 'No Text', message: 'Please enter some text to generate a voice.', type: 'warning' }); return }
    if (!user) { setIsAuthModalOpen(true); return }
    if (!hasCredits) { setIsPricingModalOpen(true); return }

    const clearIntervals = () => {
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null }
    }

    setIsLoading(true)
    setResultAudio('')
    setToast(null)
    setLoadingStage(1)
    setLoadingProgress(0)
    setElapsedSeconds(0)

    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

    // Stage 1: progress 0→10% over ~600ms (step 2 every 60ms)
    await new Promise<void>(resolve => {
      let p = 0
      progressIntervalRef.current = setInterval(() => {
        p += 2
        setLoadingProgress(p)
        if (p >= 10) {
          if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
          resolve()
        }
      }, 60)
    })

    // Stage 2: asymptotic progress toward 85%
    setLoadingStage(2)
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(p => { const gap = 85 - p; return p + gap * 0.003 })
    }, 100)

    try {
      const token = session?.access_token
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 100000)

      let referenceAudioBase64: string | undefined
      if (referenceAudio) {
        referenceAudioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(referenceAudio)
        })
      }

      let response: Response
      try {
        response = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ text: text.trim(), exaggeration, ...(referenceAudioBase64 ? { referenceAudio: referenceAudioBase64 } : {}) }),
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeout)
        if (fetchErr.name === 'AbortError') {
          setToast({ title: 'Request Timed Out', message: 'Generation took too long. Please try again. No credits were deducted.', type: 'warning' })
        } else {
          setToast({ title: 'Network Error', message: 'Could not connect to the server. Please check your connection.', type: 'error' })
        }
        clearIntervals()
        return
      }
      clearTimeout(timeout)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        switch (response.status) {
          case 401:
            setToast({ title: 'Session Expired', message: 'Please refresh and sign in again. No credits were deducted.', type: 'error' })
            break
          case 402:
            setToast({ title: 'Insufficient Credits', message: "You don't have enough credits. Purchase more to continue.", type: 'warning' })
            setIsPricingModalOpen(true)
            break
          case 429:
            setToast({ title: 'Too Many Requests', message: 'Please wait a moment before trying again.', type: 'warning' })
            break
          default:
            setToast({ title: 'Generation Failed', message: (data.error || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
            break
        }
        clearIntervals()
        return
      }

      const data = await response.json()
      setResultAudio(data.audio)
      await refreshProfile()

      // Stage 3: finalize to 100%
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
      setLoadingStage(3)
      await new Promise<void>(resolve => {
        progressIntervalRef.current = setInterval(() => {
          setLoadingProgress(p => {
            if (p >= 100) {
              if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
              resolve()
              return 100
            }
            return p + 3
          })
        }, 40)
      })
      clearIntervals()
    } catch (err: any) {
      clearIntervals()
      setToast({ title: 'Generation Failed', message: err.message || 'An unexpected error occurred.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadAudio = async () => {
    if (!resultAudio) return
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const filename = `voice-${Date.now()}.mp3`
    try {
      const response = await fetch(resultAudio)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      if (isMobile) {
        const file = new File([blob], filename, { type: 'audio/mpeg' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
        window.open(resultAudio, '_blank')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download audio. Please try again.')
    }
  }

  const saveFavorite = async () => {
    if (!resultAudio || !session?.access_token) return
    setFavSaving(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ result_url: resultAudio }),
      })
      if (res.ok) setFavSaved(true)
    } catch (err) {
      console.error('Save favorite error:', err)
    } finally {
      setFavSaving(false)
    }
  }

  const resetAll = () => {
    setResultAudio('')
    setText('')
    setToast(null)
    setFavSaved(false)
  }

  return (
    <div className={`app ${isLoaded ? 'fade-in' : ''}`}>
      <Header />

      <div className="app-container">
        <div className="particles">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((left, i) => (
            <div key={i} className="particle" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }}></div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="prompt-section-wrapper">
          <h3 className="prompt-section-title"><span className="title-icon">🎙️</span>Enter Your Text</h3>

          <div className="voice-input-wrapper">
            <textarea
              className="voice-textarea"
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type or paste the text you want to convert to speech..."
              rows={5}
              disabled={isLoading}
            />
            <div className={`char-counter ${text.length >= MAX_CHARS ? 'char-counter-limit' : ''}`}>
              {text.length} / {MAX_CHARS}
            </div>
          </div>

          <p className="voice-tip">💡 Tip: add [laugh] [chuckle] [cough] in your text</p>

          <div className="voice-option">
            <label className="voice-option-label">
              Voice Emotion <span className="voice-option-value">{exaggeration.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={exaggeration}
              onChange={e => setExaggeration(parseFloat(e.target.value))}
              disabled={isLoading}
              className="voice-slider"
            />
            <p className="voice-option-hint">0.1 = monotone · 0.5 = neutral · 1.0 = dramatic</p>
          </div>

          <div className="voice-option">
            <label className="voice-option-label">Clone a Voice <span className="voice-option-optional">(optional)</span></label>
            <label className="voice-file-label">
              <input
                type="file"
                accept=".mp3,.wav,.m4a"
                disabled={isLoading}
                onChange={e => setReferenceAudio(e.target.files?.[0] ?? null)}
                className="voice-file-input"
              />
              <span className="voice-file-btn">📂 Choose File</span>
              <span className="voice-file-name">{referenceAudio ? referenceAudio.name : 'No file chosen'}</span>
            </label>
            <p className="voice-option-hint">Upload 5-30 sec clip to clone that voice</p>
          </div>

          <button
            className="generate-btn-enhanced"
            onClick={generateVoice}
            disabled={isLoading || !text.trim()}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            {isLoading ? (
              <><span className="spinner"></span><span className="btn-text">Generating Voice...</span></>
            ) : (
              <><span className="btn-icon">🎙️</span><span className="btn-text">Generate Voice</span></>
            )}
          </button>
        </div>

        {isLoading && (
          <div className="loading-section">
            <div className="progress-stages">
              <div className={`progress-stage${loadingStage===1?' stage-active':loadingStage>1?' stage-done':''}`}>
                <div className="stage-dot"/>
                <span>Uploading image...</span>
              </div>
              <div className={`progress-stage${loadingStage===2?' stage-active':loadingStage>2?' stage-done':''}`}>
                <div className="stage-dot"/>
                <span>AI is animating your image...</span>
              </div>
              <div className={`progress-stage${loadingStage===3?' stage-active':''}`}>
                <div className="stage-dot"/>
                <span>Finalizing video...</span>
              </div>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{width:`${loadingProgress}%`}}/>
              </div>
              {loadingProgress>0&&(
                <div className="progress-bar-tip" style={{left:`${loadingProgress}%`}}/>
              )}
            </div>
            <div className="progress-footer">
              <span className="progress-percent">{Math.round(loadingProgress)}%</span>
              <span className="progress-elapsed">{elapsedSeconds}s...</span>
            </div>
          </div>
        )}

        {resultAudio && !isLoading && (
          <div className="result-section slide-up">
            <h2 className="result-title">Voice Generated ✨</h2>

            <div className="audio-player-wrapper">
              <audio
                ref={audioRef}
                controls
                src={resultAudio}
                className="audio-player"
                autoPlay
              />
            </div>

            <div className="action-buttons">
              <button onClick={downloadAudio} className="action-btn download-btn"><span>📥</span> Download MP3</button>
              {user && (
                <button onClick={saveFavorite} className="action-btn save-btn" disabled={favSaving || favSaved}>
                  <span>{favSaved ? '✅' : '⭐'}</span> {favSaving ? 'Saving...' : favSaved ? 'Saved!' : 'Save to Favorites'}
                </button>
              )}
              <button onClick={resetAll} className="action-btn regenerate-btn"><span>🔄</span> New Voice</button>
            </div>
          </div>
        )}
      </div>

      <section className="ecosystem-section">
        <h2 className="ecosystem-heading">Complete AI Ecosystem</h2>
        <div className="ecosystem-grid">
          {[
            { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',         status: 'Available Now',  isActive: true,  href: 'https://emoticons.deepvortexai.com',  isCurrent: false },
            { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork',                    status: 'Available Now',  isActive: true,  href: 'https://images.deepvortexai.com',     isCurrent: false },
            { name: 'Logo Gen',      icon: '🛡️', desc: 'AI logo creation',             status: 'Available Now',  isActive: true,  href: 'https://logo.deepvortexai.com',       isCurrent: false },
            { name: 'Avatar Gen',    icon: '🎭', desc: 'AI portrait styles',            status: 'Available Now',  isActive: true,  href: 'https://avatar.deepvortexai.com',     isCurrent: false },
            { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly',  status: 'Available Now',  isActive: true,  href: 'https://bgremover.deepvortexai.com',  isCurrent: false },
            { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',       status: 'Available Now',  isActive: true,  href: 'https://upscaler.deepvortexai.com',   isCurrent: false },
            { name: '3D Generator',  icon: '🧊', desc: 'Image to 3D model',             status: 'Available Now',  isActive: true,  href: 'https://3d.deepvortexai.com',         isCurrent: false },
            { name: 'Voice Gen',     icon: '🎙️', desc: 'AI Voice Generator',            status: 'Available Now',  isActive: true,  href: 'https://voice.deepvortexai.com',      isCurrent: true  },
            { name: 'Image → Video', icon: '🎬', desc: 'Animate images with AI',        status: 'Available Now',  isActive: true,  href: 'https://video.deepvortexai.com',      isCurrent: false },
          ].map((tool, idx) => (
            <div
              key={idx}
              className={`ecosystem-card ${tool.isActive ? 'eco-card-active' : 'eco-card-inactive'}${tool.isCurrent ? ' eco-glow' : ''}`}
              onClick={() => { if (tool.isActive && tool.href && !tool.isCurrent) window.location.href = tool.href }}
              role={tool.isActive && !tool.isCurrent ? 'button' : 'presentation'}
              style={{ cursor: tool.isActive && !tool.isCurrent ? 'pointer' : 'default' }}
            >
              <div className="eco-icon">{tool.icon}</div>
              <h3 className="eco-title">{tool.name}</h3>
              <p className="eco-desc">{tool.desc}</p>
              <div className="eco-status-container">
                <span className={`eco-status-badge ${tool.isActive ? 'eco-badge-active' : 'eco-badge-upcoming'}`}>
                  {tool.status}
                </span>
                {tool.isCurrent && <div className="eco-current-label">CURRENT TOOL</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a href="https://deepvortexai.com" className="footer-tagline footer-tagline-link">Deep Vortex AI - Building the complete AI creative ecosystem</a>
        <div className="footer-social">
          <a href="https://www.tiktok.com/@deepvortexai" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
            TikTok
          </a>
          <a href="https://x.com/deepvortexart" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X
          </a>
          <a href="https://deepvortexai.quora.com/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12.071 0C5.4 0 0 5.4 0 12.071c0 6.67 5.4 12.071 12.071 12.071 6.67 0 12.071-5.4 12.071-12.071C24.142 5.4 18.742 0 12.07 0zm2.028 18.383c-.5-.998-.954-1.88-1.907-1.88h-.213l1.193-2.647h-.002c-.362.12-.743.18-1.128.18-2.287 0-3.996-1.837-3.996-4.177s1.709-4.177 3.997-4.177 3.996 1.837 3.996 4.177c0 1.29-.496 2.432-1.32 3.29.277.397.533.812.793 1.227l.15.238c.278.442.55.886.832 1.33l-2.395 2.44zm-2.057-4.997c1.18 0 1.94-1.083 1.94-2.51 0-1.428-.76-2.511-1.94-2.511s-1.94 1.083-1.94 2.511c0 1.428.76 2.511 1.94 2.511z"/>
            </svg>
            Quora
          </a>
          <a href="mailto:admin@deepvortexai.com" className="footer-contact-btn">Contact Us</a>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
      {showNotification && (
        <Notification title="Payment Successful!" message="Your credits have been added to your account." onClose={() => setShowNotification(false)} />
      )}
      {toast && (
        <Notification title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

function App() {
  const path = window.location.pathname
  if (path === '/auth/callback') {
    return (
      <AuthProvider>
        <AuthCallback />
      </AuthProvider>
    )
  }

  if (path === '/how-to-use') {
    return <HowToUse />
  }

  return (
    <>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <a href="https://deepvortexai.com/game" target="_blank" rel="noopener noreferrer" className="play-earn-fab">⚡ Play & Earn</a>
    </>
  )
}

export default App
