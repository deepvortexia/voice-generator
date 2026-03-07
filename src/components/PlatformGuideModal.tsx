import { useState } from 'react';
import './PlatformGuideModal.css';

interface PlatformRequirements {
  format?: string;
  size?: string;
  sizes?: string;
  maxSize?: string;
  note?: string;
}

interface Platform {
  icon: string;
  name: string;
  steps: string[];
  requirements: PlatformRequirements;
}

interface Platforms {
  [key: string]: Platform;
}

const PLATFORMS: Platforms = {
  discord: {
    icon: '💬',
    name: 'Discord',
    steps: [
      'Download your emoji (PNG format)',
      'Right-click on your server name',
      'Select "Server Settings" → "Emoji"',
      'Click "Upload Emoji"',
      'Choose your downloaded PNG file',
      'Name it (example: astronautcat)',
      'Save and use with :emojiname:'
    ],
    requirements: {
      format: 'PNG',
      size: '128x128px recommended',
      maxSize: '256 KB',
      note: 'Need "Manage Emojis" permission'
    }
  },
  slack: {
    icon: '💼',
    name: 'Slack',
    steps: [
      'Download your emoji',
      'Click your workspace name in the top left',
      'Select "Customize workspace"',
      'Go to "Emoji" tab',
      'Click "Add Custom Emoji"',
      'Upload your PNG file',
      'Name it (use letters, numbers, dashes only)',
      'Save and use with :emojiname:'
    ],
    requirements: {
      format: 'PNG or GIF',
      size: '128x128px recommended',
      maxSize: '128 KB (auto-compressed if larger)',
      note: 'Workspace admin permission needed'
    }
  },
  telegram: {
    icon: '✈️',
    name: 'Telegram',
    steps: [
      'Download your emoji (PNG)',
      'Open Telegram and search for @Stickers bot',
      'Send command: /newpack',
      'Follow bot instructions',
      'Upload your image file',
      'Send an emoji that represents it',
      'Send /publish when done to finalize your pack'
    ],
    requirements: {
      format: 'PNG with transparent background',
      size: '512x512px',
      maxSize: '512 KB',
      note: 'Can have up to 120 stickers per pack'
    }
  },
  whatsapp: {
    icon: '📱',
    name: 'WhatsApp',
    steps: [
      'Download a sticker maker app',
      'iOS: "Sticker Maker Studio"',
      'Android: "Sticker.ly" or "Personal Stickers"',
      'Open the app and create a new sticker pack',
      'Add your downloaded emojis to the pack',
      'Name your pack',
      'Tap "Add to WhatsApp"',
      'Use your stickers in WhatsApp chats!'
    ],
    requirements: {
      format: 'PNG or WebP',
      size: '512x512px',
      maxSize: '100 KB per sticker',
      note: 'Need minimum 3 stickers per pack'
    }
  },
  twitch: {
    icon: '🎮',
    name: 'Twitch',
    steps: [
      'Download your emoji',
      'Resize to 3 sizes: 28x28px, 56x56px, 112x112px',
      'Go to twitch.tv/dashboard',
      'Navigate to Settings → Emotes',
      'Upload all 3 size versions',
      'Name your emote',
      'Submit for approval',
      'Wait 24-48 hours for review'
    ],
    requirements: {
      format: 'PNG with transparency',
      sizes: '28x28, 56x56, 112x112px (all 3 required)',
      maxSize: '1 MB per file',
      note: 'Must be Twitch Affiliate or Partner'
    }
  },
  reddit: {
    icon: '🤖',
    name: 'Reddit',
    steps: [
      'Go to your subreddit',
      'Click "Mod Tools" (must be moderator)',
      'Select "Emoji"',
      'Click "Upload Emoji"',
      'Choose your PNG file',
      'Name your emoji',
      'Set user permissions',
      'Save'
    ],
    requirements: {
      format: 'PNG',
      size: '128x128px recommended',
      maxSize: 'No specific limit',
      note: 'Moderator only, max 250 emojis per subreddit'
    }
  },
  twitter: {
    icon: '🐦',
    name: 'Twitter/X',
    steps: [
      'Download your emoji',
      'Create a new tweet',
      'Click the image/media icon',
      'Upload your emoji PNG as an image',
      'Add your text',
      'Tweet!'
    ],
    requirements: {
      format: 'PNG, JPG, GIF',
      maxSize: '5 MB per image',
      note: 'No custom emoji support - emojis are posted as images'
    }
  }
};

interface PlatformGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlatformGuideModal({ isOpen, onClose }: PlatformGuideModalProps) {
  const [activeTab, setActiveTab] = useState('discord');

  if (!isOpen) return null;

  const platform = PLATFORMS[activeTab];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📱 How to Use Your Emojis</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="platform-tabs">
          {Object.keys(PLATFORMS).map((key) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {PLATFORMS[key].icon} {PLATFORMS[key].name}
            </button>
          ))}
        </div>

        <div className="platform-content">
          <h3>{platform.icon} {platform.name}</h3>
          
          <div className="steps-section">
            <h4>📋 Steps:</h4>
            <ol>
              {platform.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="requirements-section">
            <h4>✅ Requirements:</h4>
            <ul>
              {platform.requirements.format && <li><strong>Format:</strong> {platform.requirements.format}</li>}
              {platform.requirements.size && <li><strong>Size:</strong> {platform.requirements.size}</li>}
              {platform.requirements.sizes && <li><strong>Sizes:</strong> {platform.requirements.sizes}</li>}
              {platform.requirements.maxSize && <li><strong>Max file size:</strong> {platform.requirements.maxSize}</li>}
              {platform.requirements.note && <li><strong>Note:</strong> {platform.requirements.note}</li>}
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <a 
            href="https://github.com/deepvortexia/emoticon-generator/blob/main/USAGE_GUIDE.md" 
            target="_blank" 
            rel="noopener noreferrer"
            className="full-guide-link"
          >
            📖 View Full Detailed Guide on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
