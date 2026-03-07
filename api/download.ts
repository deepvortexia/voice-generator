import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Image URL is required' })
  }

  // Validate that URL is from allowed hosts to prevent SSRF attacks
  try {
    const imageUrl = new URL(url)
    const allowedHosts = [
      'oaidalleapiprodscus.blob.core.windows.net',
      'dalleprodsec.blob.core.windows.net',
      'replicate.delivery',
      'pbxt.replicate.delivery'
    ]
    if (!allowedHosts.some(host => imageUrl.hostname === host || imageUrl.hostname.endsWith(`.${host}`))) {
      return res.status(400).json({ error: 'Invalid image URL' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' })
  }

  try {
    // Fetch the image from the hosting service
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Failed to fetch image')
    }

    const imageBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)

    // Get content type from the response, default to image/png
    const contentType = response.headers.get('content-type') || 'image/png'
    const extension = contentType.includes('jpeg') ? 'jpg' : 'png'

    // Set appropriate headers
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="emoticon-${Date.now()}.${extension}"`)
    res.setHeader('Cache-Control', 'no-cache')
    
    return res.send(buffer)
  } catch (error) {
    console.error('Error downloading image:', error)
    return res.status(500).json({ error: 'Failed to download image' })
  }
}
