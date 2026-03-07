import { useAuth } from '../context/AuthContext'
import './CreditDisplay.css'

interface CreditDisplayProps {
  onBuyCredits: () => void
  onSignIn: () => void
}

export const CreditDisplay = ({ onBuyCredits, onSignIn }: CreditDisplayProps) => {
  const { user, profile, signOut } = useAuth()

  if (!user || !profile) {
    return (
      <div className="credit-display">
        <button className="signin-btn" onClick={onSignIn}>
          🔐 Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="credit-display">
      <div className="credit-info">
        <div className="credit-balance">
          <span className="credit-icon">🎨</span>
          <span className="credit-count">{profile.credits}</span>
          <span className="credit-label">credits</span>
        </div>
        <button className="buy-credits-btn" onClick={onBuyCredits}>
          💳 Buy Credits
        </button>
      </div>
      
      <div className="user-menu">
        <div className="user-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || 'User'} />
          ) : (
            <div className="avatar-placeholder">
              {(profile.full_name || profile.email || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-name">{profile.full_name || 'User'}</div>
            <div className="user-email">{profile.email}</div>
          </div>
          <button className="signout-btn" onClick={signOut}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
