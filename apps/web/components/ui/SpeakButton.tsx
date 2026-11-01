"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Volume2 } from "lucide-react"
import { ttsApi } from "@/lib/api"
import { registerSpeechAudio } from "@/lib/speech-audio"

interface SpeakButtonProps {
  text: string
  voice?: string
  instructions?: string
  className?: string
  playbackRate?: number
  title?: string
}

// Object URLs survive for the whole session so replays are instant.
const audioUrlCache = new Map<string, string>()

// Shared so other surfaces (e.g. the auto-play in a listening drill) reuse the
// same per-session URL cache instead of re-fetching the audio for the same text.
export async function getCachedAudioUrl(
  text: string,
  voice = "marin",
  instructions?: string,
): Promise<string> {
  const cacheKey = `${voice}|${instructions ?? ""}|${text}`
  let url = audioUrlCache.get(cacheKey)
  if (!url) {
    url = await ttsApi.speak(text, voice, { instructions })
    audioUrlCache.set(cacheKey, url)
  }
  return url
}

export function SpeakButton({
  text,
  voice = "marin",
  instructions,
  className = "",
  playbackRate = 1,
  title = "Listen to pronunciation",
}: SpeakButtonProps) {
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const stopAudioRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopAudioRef.current?.(), [])

  async function handleSpeak() {
    if (loading || playing || !text) return
    setLoading(true)
    try {
      const url = await getCachedAudioUrl(text, voice, instructions)
      const audio = new Audio(url)
      audio.playbackRate = playbackRate
      stopAudioRef.current = registerSpeechAudio(audio, () => {
        setPlaying(false)
        stopAudioRef.current = null
      })
      await audio.play()
      setPlaying(true)
    } catch {
      stopAudioRef.current?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSpeak}
      disabled={loading || playing}
      title={title}
      // The ::after layer widens the tap area to ~44px on phones without
      // changing the icon's visual size or the surrounding layout.
      className={`relative inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground after:absolute after:-inset-2 after:content-[''] transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Volume2 className={`size-3.5 ${playing ? "text-indigo-500" : ""}`} />
      )}
    </button>
  )
}
