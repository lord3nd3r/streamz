// WebGL engine for MilkDrop-style feedback-loop visualizations
import { VERTEX_SHADER, PRESETS, type ShaderPreset } from './shaders'

export class MilkDropEngine {
  private gl: WebGLRenderingContext
  private programs: Map<string, WebGLProgram> = new Map()
  private currentPreset: number = 0
  private framebuffers: WebGLFramebuffer[] = []
  private textures: WebGLTexture[] = []
  private pingPong: number = 0
  private quadBuffer: WebGLBuffer | null = null
  private spectrumTexture: WebGLTexture | null = null
  private startTime: number = performance.now() / 1000
  private width: number = 0
  private height: number = 0

  // Smoothed audio values
  private bass: number = 0
  private mid: number = 0
  private treble: number = 0

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    })
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl
    this.resize()
    this.initQuad()
    this.initFramebuffers()
    this.initSpectrumTexture()
    this.compileAllPresets()
  }

  private initQuad() {
    const gl = this.gl
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    this.quadBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  private initFramebuffers() {
    const gl = this.gl
    // Two framebuffers for ping-pong (feedback loop)
    for (let i = 0; i < 2; i++) {
      const tex = this.createTexture()
      const fb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      this.textures.push(tex)
      this.framebuffers.push(fb)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private initSpectrumTexture() {
    const gl = this.gl
    this.spectrumTexture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(256))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  private compileProgram(preset: ShaderPreset): WebGLProgram | null {
    const gl = this.gl
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = this.compileShader(gl.FRAGMENT_SHADER, preset.fragment)
    if (!vs || !fs) return null

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return null
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return program
  }

  private compileAllPresets() {
    for (const preset of PRESETS) {
      const program = this.compileProgram(preset)
      if (program) {
        this.programs.set(preset.name, program)
      }
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    const rect = this.canvas.getBoundingClientRect()
    this.width = Math.floor(rect.width * dpr)
    this.height = Math.floor(rect.height * dpr)
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.gl.viewport(0, 0, this.width, this.height)

    // Resize framebuffer textures
    const gl = this.gl
    for (const tex of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
  }

  updateAudio(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)

    // Update spectrum texture
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, data.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data)

    // Extract bands with smoothing
    const len = data.length
    let bassSum = 0, midSum = 0, trebleSum = 0
    const bassEnd = Math.floor(len * 0.1)
    const midEnd = Math.floor(len * 0.5)

    for (let i = 0; i < bassEnd; i++) bassSum += data[i]
    for (let i = bassEnd; i < midEnd; i++) midSum += data[i]
    for (let i = midEnd; i < len; i++) trebleSum += data[i]

    const targetBass = bassSum / (bassEnd * 255)
    const targetMid = midSum / ((midEnd - bassEnd) * 255)
    const targetTreble = trebleSum / ((len - midEnd) * 255)

    // Smooth with different attack/release
    const attack = 0.3
    const release = 0.05
    this.bass += (targetBass > this.bass ? attack : release) * (targetBass - this.bass)
    this.mid += (targetMid > this.mid ? attack : release) * (targetMid - this.mid)
    this.treble += (targetTreble > this.treble ? attack : release) * (targetTreble - this.treble)
  }

  setPreset(index: number) {
    this.currentPreset = index % PRESETS.length
  }

  getPresetName(): string {
    return PRESETS[this.currentPreset].name
  }

  getPresetCount(): number {
    return PRESETS.length
  }

  getCurrentPreset(): number {
    return this.currentPreset
  }

  render() {
    const gl = this.gl
    const preset = PRESETS[this.currentPreset]
    const program = this.programs.get(preset.name)
    if (!program) return

    const readIdx = this.pingPong
    const writeIdx = 1 - this.pingPong

    // Render to framebuffer (write)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeIdx])
    gl.useProgram(program)

    // Bind quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    const aPos = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const time = performance.now() / 1000 - this.startTime
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time)
    gl.uniform1f(gl.getUniformLocation(program, 'uBass'), this.bass)
    gl.uniform1f(gl.getUniformLocation(program, 'uMid'), this.mid)
    gl.uniform1f(gl.getUniformLocation(program, 'uTreble'), this.treble)
    gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this.width, this.height)

    // Bind feedback texture (previous frame)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[readIdx])
    gl.uniform1i(gl.getUniformLocation(program, 'uFeedback'), 0)

    // Bind spectrum texture
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTexture)
    gl.uniform1i(gl.getUniformLocation(program, 'uSpectrum'), 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // Now render framebuffer to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[writeIdx])
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    this.pingPong = writeIdx
  }

  destroy() {
    const gl = this.gl
    for (const [, program] of this.programs) {
      gl.deleteProgram(program)
    }
    for (const fb of this.framebuffers) gl.deleteFramebuffer(fb)
    for (const tex of this.textures) gl.deleteTexture(tex)
    if (this.spectrumTexture) gl.deleteTexture(this.spectrumTexture)
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer)
  }
}
