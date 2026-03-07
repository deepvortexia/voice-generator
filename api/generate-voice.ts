import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[generate-voice] Request received:', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' })
  }

  if (text.trim().length > 500) {
    return res.status(400).json({ error: 'Text must be 500 characters or less' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Please sign in to generate voices' })
  }

  const apiKey = process.env.REPLICATE_API_TOKEN
  console.log('[generate-voice] API key check:', apiKey ? `loaded (${apiKey.slice(0, 8)}...)` : 'MISSING')
  if (!apiKey) {
    return res.status(500).json({ error: 'Replicate API key not configured' })
  }

  let userId: string
  let currentCredits: number

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    userId = user.id
    console.log('[generate-voice] User verified:', { userId: user.id })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    if (!profile || profile.credits < 1) {
      return res.status(402).json({ error: 'Insufficient credits. Please purchase more credits to continue.' })
    }

    currentCredits = profile.credits

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        credits: profile.credits - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('credits', profile.credits)
      .select()
      .single()

    if (updateError || !updatedProfile) {
      return res.status(409).json({ error: 'Credit check failed, please try again' })
    }
  } catch (error: any) {
    console.error('[generate-voice] Auth error:', error)
    return res.status(500).json({ error: 'Failed to verify credits' })
  }

  let generationFailed = false

  try {
    // Use the models endpoint to always run the latest version of chatterbox-turbo
    const response = await fetch('https://api.replicate.com/v1/models/resemble-ai/chatterbox-turbo/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          text: text.trim(),
        },
      }),
    })

    const prediction = await response.json()
    console.log('[generate-voice] Replicate response:', { status: response.status, ok: response.ok })

    if (!response.ok) {
      generationFailed = true
      throw new Error(prediction.detail || 'Failed to create prediction')
    }

    // Poll for completion
    let result = prediction
    const pollStartTime = Date.now()

    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1500))

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { 'Authorization': `Token ${apiKey}` } }
      )

      if (!pollResponse.ok) {
        generationFailed = true
        throw new Error(`Failed to poll prediction status: ${pollResponse.status}`)
      }

      result = await pollResponse.json()
      console.log('[generate-voice] Poll result:', { status: result.status, id: result.id })

      if (Date.now() - pollStartTime > 90000) {
        generationFailed = true
        throw new Error('Processing timeout')
      }
    }

    if (result.status === 'failed') {
      generationFailed = true
      throw new Error(result.error || 'Voice generation failed')
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output

    if (!outputUrl) {
      generationFailed = true
      throw new Error('No audio returned from model')
    }

    // Upload to Supabase Storage for a permanent URL
    let audioUrl: string = outputUrl
    try {
      const audioRes = await fetch(outputUrl)
      if (audioRes.ok) {
        const audioBuffer = await audioRes.arrayBuffer()
        const fileName = `${userId}/${Date.now()}-voice.mp3`
        const { error: uploadError } = await supabase.storage
          .from('generated-audio')
          .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false })
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('generated-audio')
            .getPublicUrl(fileName)
          if (publicUrl) {
            audioUrl = publicUrl
            console.log('[generate-voice] Uploaded to Supabase Storage:', audioUrl)
          }
        } else {
          console.error('[generate-voice] Storage upload failed, using Replicate URL:', uploadError)
        }
      }
    } catch (storageErr) {
      console.error('[generate-voice] Storage error, using Replicate URL:', storageErr)
    }

    // Log generation (non-blocking)
    void supabase
      .from('generation_logs')
      .insert({ user_id: userId, tool: 'voice-generator', created_at: new Date().toISOString() })

    return res.status(200).json({ audio: audioUrl })
  } catch (error: any) {
    console.error('[generate-voice] Error:', error?.message)

    if (generationFailed) {
      try {
        await supabase
          .from('profiles')
          .update({ credits: currentCredits, updated_at: new Date().toISOString() })
          .eq('id', userId)
        console.log(`[generate-voice] Refunded credit to user ${userId}`)
      } catch (refundError) {
        console.error('[generate-voice] Failed to refund credit:', refundError)
      }
    }

    return res.status(500).json({ error: error.message || 'Failed to generate voice' })
  }
}
