# 🌀 Deep Vortex - AI Emoticon Generator

Generate custom emojis and stickers using AI! Perfect for Discord, Slack, and social media.

![Deep Vortex Banner](https://via.placeholder.com/800x200/8b5cf6/ffffff?text=Deep+Vortex+Emoticon+Generator)

## ✨ Features

- 🎨 **Two Generation Modes:**
  - **Simple Emojis**: Flat, minimalist iOS-style emojis (1 word prompts)
  - **Creative Stickers**: Detailed illustrations with actions/scenes (complex prompts)
  
- ⚡ **Fast Generation**: 3-5 seconds per image
- 💾 **Gallery**: Save and view your generation history
- 📥 **Easy Download**: One-click download as PNG
- 🔄 **Regenerate**: Create variations of the same prompt
- 💡 **Prompt Examples**: Click-to-use example prompts
- 🎲 **Surprise Me**: Random prompt generator
- 📊 **Usage Counter**: Track how many images you've generated

## 📱 Using Your Emojis

Your generated emojis work great on all major platforms!

### Quick Platform Guide

- **💬 Discord**: Server custom emojis (128x128px, max 256KB)
- **💼 Slack**: Workspace reactions (128x128px, max 128KB)
- **🎮 Twitch**: Subscriber emotes (112x112px, requires Affiliate)
- **✈️ Telegram**: Sticker packs (512x512px, max 512KB)
- **📱 WhatsApp**: Personal stickers (512x512px, max 100KB)
- **🤖 Reddit**: Community emojis (128x128px, mods only)

**📖 [Complete Platform Usage Guide →](USAGE_GUIDE.md)**

Detailed instructions for uploading, resizing, and optimizing your emojis for every platform!

### Quick Tips

**For flat emojis** (Discord, Slack, Reddit):
- Use simple 1-2 word prompts
- Examples: `pizza`, `rocket`, `happy face`
- Perfect for reactions and quick communication

**For detailed stickers** (Telegram, WhatsApp):
- Use descriptive phrases with actions
- Examples: `astronaut cat in space`, `robot dancing`
- Great for creative expression

**Need to resize?** Use free tools like [Photopea](https://photopea.com) or [Squoosh](https://squoosh.app)

**Background too busy?** Remove it with [remove.bg](https://remove.bg)

## 🚀 Live Demo

Visit: [https://emoticon-generator-7cvg.vercel.app](https://emoticon-generator-7cvg.vercel.app)

## 📸 Examples

### Simple Flat Emojis

| Prompt | Style |
|--------|-------|
| `happy face` | Flat, iOS-style |
| `rocket` | Minimalist |
| `pizza` | Simple |

### Creative Stickers

| Prompt | Style |
|--------|-------|
| `astronaut cat in space` | Detailed illustration |
| `robot dancing with headphones` | Sticker-style |
| `dragon wearing sunglasses` | Creative |

## 🎯 How to Write Good Prompts

### For Flat Emojis (iOS-style):
Use **1-2 words**, simple objects:
```
✅ pizza
✅ rocket
✅ heart
✅ happy face
✅ coffee cup
```

### For Creative Stickers:
Use **descriptive phrases** with actions:
```
✅ astronaut cat in space
✅ robot dancing with headphones
✅ cat playing guitar
✅ dragon breathing fire
```

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: CSS with custom design system
- **AI Model**: [fofr/sdxl-emoji](https://replicate.com/fofr/sdxl-emoji) via Replicate API
- **Deployment**: Vercel
- **Storage**: localStorage (for gallery)

## 🏗️ Architecture

```
emoticon-generator/
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.css           # Styles and design system
│   ├── components/       # Reusable components
│   │   ├── Gallery.tsx   # Image history gallery
│   │   └── Gallery.css   # Gallery styles
│   └── main.tsx         # Entry point
├── api/
│   ├── generate.ts      # Image generation endpoint
│   └── download.ts      # Image download proxy
└── public/
    └── screenshots/     # Documentation images
```

## 💰 Cost & Limits

- **Model**: fofr/sdxl-emoji on Replicate
- **Cost**: ~$0.003 per image
- **Rate Limit**: 6 requests/minute (with <$5 credit)
- **With $2 credit**: ~660 images can be generated

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Replicate API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/deepvortexia/emoticon-generator.git
cd emoticon-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
REPLICATE_API_TOKEN=your_api_token_here
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## 📝 API Usage

### Generate Endpoint

**POST** `/api/generate`

```json
{
  "prompt": "happy cat"
}
```

**Response:**
```json
{
  "image": "https://replicate.delivery/...",
  "id": "prediction-id"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **AI Model**: [fofr/sdxl-emoji](https://replicate.com/fofr/sdxl-emoji) by fofr
- **API**: [Replicate](https://replicate.com)
- **Inspiration**: iOS/Android emoji design systems

## 📧 Contact

Created by [@deepvortexia](https://github.com/deepvortexia)

---

**⭐ If you like this project, give it a star!**

