import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './Gallery.css'

interface FavoriteItem {
  id: string
  resultUrl: string
  createdAt: number
}

interface FavoritesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FavoritesModal({ isOpen, onClose }: FavoritesModalProps) {
  const { session } = useAuth()
  const token = session?.access_token

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadFavorites = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites((data.favorites || []).map((f: any) => ({
          id: f.id,
          resultUrl: f.result_url,
          createdAt: new Date(f.created_at).getTime(),
        })))
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isOpen) loadFavorites()
  }, [isOpen, loadFavorites])

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch {}
  }

  const handleDownload = async (resultUrl: string, _id: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    try {
      const res = await fetch(resultUrl, { mode: 'cors' })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      if (isMobile) {
        const filename = `voice-${Date.now()}.mp3`
        const file = new File([blob], filename, { type: 'audio/mpeg' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
        window.open(resultUrl, '_blank')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voice-${Date.now()}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try right-clicking and "Save Image As..."')
    }
  }

  if (!isOpen) return null

  return (
    <div className="gallery-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="gallery-content">
        <div className="gallery-header">
          <h2>⭐ Saved Favorites</h2>
          <button onClick={onClose} className="gallery-close">✕</button>
        </div>

        {!token ? (
          <p className="gallery-empty">Sign in to view your saved favorites.</p>
        ) : loading ? (
          <p className="favorites-loading">Loading...</p>
        ) : favorites.length === 0 ? (
          <p className="gallery-empty">No favorites saved yet. Remove a background and click ❤️ Save!</p>
        ) : (
          <div className="gallery-grid">
            {favorites.map((item) => (
              <div key={item.id} className="gallery-item">
                <audio controls src={item.resultUrl} style={{ width: '100%' }} />
                <div className="gallery-item-info">
                  <p className="gallery-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  className="gallery-download-btn"
                  onClick={(e) => { e.stopPropagation(); handleDownload(item.resultUrl, item.id) }}
                  title="Download"
                  aria-label="Download audio"
                >💾</button>
                <button
                  className="gallery-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
