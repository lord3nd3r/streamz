'use client'

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

interface AudioContextType {
  activeStream: any | null
  isPlaying: boolean
  volume: number
  analyser: AnalyserNode | null
  playStream: (stream: any) => void
  togglePlay: () => void
  updateVolume: (val: number) => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [activeStream, setActiveStream] = useState<any | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  // ── Use refs to avoid stale closures in long-lived callbacks ──
  const activeStreamRef = useRef(activeStream)
  const isPlayingRef = useRef(isPlaying)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { activeStreamRef.current = activeStream }, [activeStream])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // Initialize audio object on client
  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    // Prevent the browser from aggressively releasing the connection
    audio.preload = 'auto'
    audioRef.current = audio

    // ── Robust error recovery using refs (never stale) ──
    audio.onerror = () => {
      const stream = activeStreamRef.current
      const playing = isPlayingRef.current
      if (!stream || !playing) return

      retryCountRef.current++
      const attempt = retryCountRef.current
      // Exponential backoff: 1s, 2s, 4s, 8s, capped at 15s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000)

      console.warn(`[AudioPlayer] Stream error (attempt ${attempt}), retrying in ${delay / 1000}s...`)

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        if (!audioRef.current || !activeStreamRef.current) return
        // Bust any caches / force reconnect with a fresh timestamp
        audioRef.current.src = `${activeStreamRef.current.mount}?t=${Date.now()}`
        audioRef.current.load()
        audioRef.current.play().then(() => {
          console.log('[AudioPlayer] Recovered successfully.')
          retryCountRef.current = 0
        }).catch(err => {
          console.error('[AudioPlayer] Recovery play failed:', err)
        })
      }, delay)
    }

    // Reset retry counter on successful playback
    audio.onplaying = () => {
      retryCountRef.current = 0
    }

    // ── Handle browser-level stalls (buffering that never resolves) ──
    let stallTimer: ReturnType<typeof setTimeout> | null = null

    audio.onwaiting = () => {
      // If we're stuck buffering for 20 seconds, treat it as an error
      if (stallTimer) clearTimeout(stallTimer)
      stallTimer = setTimeout(() => {
        if (audioRef.current && isPlayingRef.current && activeStreamRef.current) {
          console.warn('[AudioPlayer] Stall detected (20s buffering), forcing reconnect...')
          audioRef.current.src = `${activeStreamRef.current.mount}?t=${Date.now()}`
          audioRef.current.load()
          audioRef.current.play().catch(() => {})
        }
      }, 20000)
    }

    audio.onplaying = () => {
      retryCountRef.current = 0
      if (stallTimer) clearTimeout(stallTimer)
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (stallTimer) clearTimeout(stallTimer)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      const ans = ctx.createAnalyser()
      ans.fftSize = 256
      
      const source = ctx.createMediaElementSource(audioRef.current)
      source.connect(ans)
      ans.connect(ctx.destination)
      
      audioContextRef.current = ctx
      sourceRef.current = source
      setAnalyser(ans)
    }
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  const playStream = useCallback((stream: any) => {
    if (!audioRef.current) return
    setupAudioContext()

    // If it's the same stream and already playing, do nothing
    if (activeStreamRef.current?.id === stream.id && isPlayingRef.current) return

    // Reset retry state for new stream
    retryCountRef.current = 0
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)

    setActiveStream(stream)
    audioRef.current.src = `${stream.mount}?t=${Date.now()}`
    audioRef.current.load()
    audioRef.current.play().then(() => {
      setIsPlaying(true)
    }).catch(err => {
      console.error('Playback failed:', err)
      setIsPlaying(false)
    })
  }, [setupAudioContext])

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !activeStreamRef.current) return
    setupAudioContext()

    if (isPlayingRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      // On resume after pause, reconnect to get the live position
      audioRef.current.src = `${activeStreamRef.current.mount}?t=${Date.now()}`
      audioRef.current.load()
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        console.error('Resume failed:', err)
      })
    }
  }, [setupAudioContext])

  const updateVolume = useCallback((val: number) => {
    setVolume(val)
  }, [])

  return (
    <AudioContext.Provider value={{ activeStream, isPlaying, volume, analyser, playStream, togglePlay, updateVolume }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
