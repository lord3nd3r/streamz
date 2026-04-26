'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

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

  // Initialize audio object on client
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.crossOrigin = 'anonymous'
    
    // Recovery on error
    audioRef.current.onerror = () => {
      console.error('Audio error, attempting recovery...')
      if (activeStream) {
        audioRef.current!.src = `${activeStream.mount}?t=${Date.now()}`
        audioRef.current!.load()
        if (isPlaying) audioRef.current!.play()
      }
    }

    return () => {
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

  const setupAudioContext = () => {
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
  }

  const playStream = (stream: any) => {
    if (!audioRef.current) return
    setupAudioContext()

    // If it's the same stream and already playing, do nothing
    if (activeStream?.id === stream.id && isPlaying) return

    setActiveStream(stream)
    audioRef.current.src = `${stream.mount}?t=${Date.now()}`
    audioRef.current.load()
    audioRef.current.play().then(() => {
      setIsPlaying(true)
    }).catch(err => {
      console.error('Playback failed:', err)
      setIsPlaying(false)
    })
  }

  const togglePlay = () => {
    if (!audioRef.current || !activeStream) return
    setupAudioContext()

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        console.error('Resume failed:', err)
      })
    }
  }

  const updateVolume = (val: number) => {
    setVolume(val)
  }

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
