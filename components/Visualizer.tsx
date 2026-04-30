'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAudio } from '@/context/AudioContext'
import { MilkDropEngine } from './visualizer/engine'
import { PRESETS } from './visualizer/shaders'

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<MilkDropEngine | null>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const { analyser, isPlaying } = useAudio()
  const [presetIndex, setPresetIndex] = useState(0)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [showName, setShowName] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return
    try {
      engineRef.current = new MilkDropEngine(canvasRef.current)
    } catch (e) {
      console.error('WebGL init failed:', e)
    }
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => engineRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-cycle presets every 20 seconds
  useEffect(() => {
    cycleTimerRef.current = setInterval(() => {
      setPresetIndex(prev => {
        const next = (prev + 1) % PRESETS.length
        engineRef.current?.setPreset(next)
        setPresetName(PRESETS[next].name)
        flashName()
        return next
      })
    }, 20000)
    return () => clearInterval(cycleTimerRef.current)
  }, [])

  const flashName = useCallback(() => {
    setShowName(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => setShowName(false), 3000)
  }, [])

  // Render loop
  useEffect(() => {
    if (!isPlaying || !analyser || !engineRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const loop = () => {
      if (engineRef.current && analyser) {
        engineRef.current.updateAudio(analyser)
        engineRef.current.render()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, analyser])

  const nextPreset = () => {
    const next = (presetIndex + 1) % PRESETS.length
    setPresetIndex(next)
    engineRef.current?.setPreset(next)
    setPresetName(PRESETS[next].name)
    flashName()

    // Reset auto-cycle timer
    if (cycleTimerRef.current) clearInterval(cycleTimerRef.current)
    cycleTimerRef.current = setInterval(() => {
      setPresetIndex(prev => {
        const n = (prev + 1) % PRESETS.length
        engineRef.current?.setPreset(n)
        setPresetName(PRESETS[n].name)
        flashName()
        return n
      })
    }, 20000)
  }

  const prevPreset = () => {
    const prev = (presetIndex - 1 + PRESETS.length) % PRESETS.length
    setPresetIndex(prev)
    engineRef.current?.setPreset(prev)
    setPresetName(PRESETS[prev].name)
    flashName()
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
      // Resize after fullscreen change
      setTimeout(() => engineRef.current?.resize(), 100)
    } catch (e) {
      console.error('Fullscreen failed:', e)
    }
  }

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => engineRef.current?.resize(), 100)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Keyboard shortcuts in fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in chat/input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPreset() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPreset() }
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presetIndex])

  return (
    <div
      ref={containerRef}
      onClick={nextPreset}
      onDoubleClick={(e) => { e.preventDefault(); toggleFullscreen() }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: isFullscreen ? '0' : '20px',
        background: '#000',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Preset name overlay */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 900,
        letterSpacing: '0.2em',
        opacity: showName ? 0.7 : 0,
        textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        transition: 'opacity 1s ease',
        fontFamily: 'monospace',
      }}>
        ♫ {presetName}
      </div>

      {/* Preset counter */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 700,
        opacity: showName ? 0.4 : 0,
        textShadow: '0 0 10px rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        transition: 'opacity 1s ease',
        fontFamily: 'monospace',
      }}>
        {presetIndex + 1}/{PRESETS.length}
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        fontSize: '8px',
        fontWeight: 700,
        opacity: showName ? 0.25 : 0,
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        transition: 'opacity 1s ease',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
      }}>
        CLICK: NEXT · DOUBLE-CLICK: FULLSCREEN · ← → KEYS
      </div>
    </div>
  )
}
