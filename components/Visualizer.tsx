'use client'

import React, { useRef, useEffect } from 'react'
import { useAudio } from '@/context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { analyser, isPlaying } = useAudio()
  const requestRef = useRef<number | undefined>(undefined)

  const animate = () => {
    if (!canvasRef.current || !analyser) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    // Clear with slight trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) * 0.4
    
    // Get accent color from CSS
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00f2ff'

    // Draw circular bars
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

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
      
      // Mirror effect
      const xEnd2 = centerX + Math.cos(angle) * (radius - barHeight * 0.5)
      const yEnd2 = centerY + Math.sin(angle) * (radius - barHeight * 0.5)
      
      ctx.strokeStyle = `rgba(${parseInt(accentColor.slice(1,3), 16)}, ${parseInt(accentColor.slice(3,5), 16)}, ${parseInt(accentColor.slice(5,7), 16)}, 0.3)`
      ctx.beginPath()
      ctx.moveTo(xStart, yStart)
      ctx.lineTo(xEnd2, yEnd2)
      ctx.stroke()
    }

    // Outer glow ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 1
    ctx.stroke()

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
  }, [isPlaying, analyser])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      style={{ 
        width: '100%', 
        height: '100%', 
        borderRadius: '20px',
        background: 'transparent'
      }}
    />
  )
}
