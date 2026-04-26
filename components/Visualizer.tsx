'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useAudio } from '@/context/AudioContext'

type VisMode = 'pulse' | 'wave' | 'nebula' | 'prism'

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { analyser, isPlaying } = useAudio()
  const requestRef = useRef<number | undefined>(undefined)
  const [mode, setMode] = useState<VisMode>('pulse')
  const modeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hueRef = useRef(0)

  // Cycle modes every 15 seconds
  useEffect(() => {
    modeTimerRef.current = setInterval(() => {
      const modes: VisMode[] = ['pulse', 'wave', 'nebula', 'prism']
      setMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length])
    }, 15000)
    return () => clearInterval(modeTimerRef.current)
  }, [])

  const animate = () => {
    if (!canvasRef.current || !analyser) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    // Bass Detection (first 10 bins)
    let bassSum = 0
    for (let i = 0; i < 10; i++) bassSum += dataArray[i]
    const bassAvg = bassSum / 10
    const intensity = bassAvg / 255

    // Hue shifting
    hueRef.current = (hueRef.current + 0.5) % 360
    const accentColor = `hsl(${hueRef.current}, 100%, 50%)`

    // Clear with intensity-based trail
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + (intensity * 0.1)})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Apply "Shake" on heavy bass
    if (intensity > 0.8) {
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10)
    }

    if (mode === 'pulse') {
      const radius = Math.min(centerX, centerY) * 0.4
      ctx.lineWidth = 3
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * radius * 1.5
        const angle = (i * 2 * Math.PI) / bufferLength
        const xStart = centerX + Math.cos(angle) * radius
        const yStart = centerY + Math.sin(angle) * radius
        const xEnd = centerX + Math.cos(angle) * (radius + barHeight)
        const yEnd = centerY + Math.sin(angle) * (radius + barHeight)
        ctx.strokeStyle = accentColor
        ctx.beginPath()
        ctx.moveTo(xStart, yStart)
        ctx.lineTo(xEnd, yEnd)
        ctx.stroke()
      }
    } 
    else if (mode === 'wave') {
      ctx.beginPath()
      ctx.lineWidth = 4
      ctx.strokeStyle = accentColor
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()
    }
    else if (mode === 'nebula') {
      for (let i = 0; i < 50; i++) {
        const index = Math.floor(Math.random() * bufferLength)
        const val = dataArray[index] / 255
        const radius = val * 50 * intensity
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        ctx.fillStyle = accentColor
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    else if (mode === 'prism') {
      ctx.save()
      ctx.translate(centerX, centerY)
      for (let j = 0; j < 8; j++) {
        ctx.rotate(Math.PI / 4)
        ctx.beginPath()
        ctx.lineWidth = 2
        ctx.strokeStyle = accentColor
        for (let i = 0; i < bufferLength / 4; i++) {
          const x = i * 4
          const y = (dataArray[i] / 255) * 150
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // Reset translate
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate)
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isPlaying, analyser, mode])

  const nextMode = () => {
    const modes: VisMode[] = ['pulse', 'wave', 'nebula', 'prism']
    setMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length])
    // Reset timer when manually changed
    if (modeTimerRef.current) {
      clearInterval(modeTimerRef.current)
      modeTimerRef.current = setInterval(() => {
        setMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length])
      }, 15000)
    }
  }

  return (
    <div 
      onClick={nextMode}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '20px'
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        style={{ 
          width: '100%', 
          height: '100%', 
          background: '#000'
        }}
      />
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '0.2em',
        opacity: 0.5,
        textShadow: '0 0 10px #000',
        pointerEvents: 'none'
      }}>
        MODE: {mode.toUpperCase()}
      </div>
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        fontSize: '8px',
        fontWeight: 700,
        opacity: 0.3,
        letterSpacing: '0.1em',
        pointerEvents: 'none'
      }}>
        CLICK TO CYCLE
      </div>
    </div>
  )
}
