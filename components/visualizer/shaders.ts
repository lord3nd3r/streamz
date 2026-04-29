// MilkDrop-inspired GLSL fragment shader presets
// Each shader receives: uTime, uBass, uMid, uTreble, uResolution, uFeedback (previous frame)

export interface ShaderPreset {
  name: string
  fragment: string
}

const COMMON_HEADER = `
precision highp float;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform vec2 uResolution;
uniform sampler2D uFeedback;
uniform sampler2D uSpectrum;

vec2 uv() {
  return gl_FragCoord.xy / uResolution;
}

vec2 center() {
  return (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
`

export const PRESETS: ShaderPreset[] = [
  {
    name: 'WARP TUNNEL',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center();
  float r = length(p);
  float a = atan(p.y, p.x);

  // Tunnel warp driven by bass
  float z = 1.0 / (r + 0.01) + uTime * (0.5 + uBass * 2.0);
  float twist = a + sin(z * 0.3) * uMid * 2.0;

  // Sample feedback with warp
  vec2 warpUV = uv() + vec2(cos(twist), sin(twist)) * 0.008 * (1.0 + uBass);
  vec3 fb = texture2D(uFeedback, warpUV).rgb * 0.92;

  // Tunnel rings
  float ring = sin(z * 3.0 + a * 3.0) * 0.5 + 0.5;
  ring = pow(ring, 4.0 + uTreble * 8.0);

  // Color
  vec3 col = vec3(0.0);
  col.r = ring * (0.5 + 0.5 * sin(uTime * 0.7));
  col.g = ring * (0.5 + 0.5 * sin(uTime * 0.7 + 2.094));
  col.b = ring * (0.5 + 0.5 * sin(uTime * 0.7 + 4.189));
  col *= smoothstep(0.0, 0.3, r) * (1.0 + uBass * 3.0);

  gl_FragColor = vec4(max(fb, col * 0.7), 1.0);
}
`
  },
  {
    name: 'PLASMA MORPH',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center() * (2.0 + uBass);
  float t = uTime * 0.4;

  // Classic plasma with audio modulation
  float v = sin(p.x * 3.0 + t + uBass * 6.0);
  v += sin(p.y * 4.0 - t * 1.3);
  v += sin((p.x + p.y) * 2.0 + t * 0.7);
  v += sin(length(p) * 5.0 - t * 2.0 + uMid * 4.0);
  v *= 0.25;

  // Feedback with radial zoom
  vec2 fbUV = uv();
  vec2 toCenter = vec2(0.5) - fbUV;
  fbUV += toCenter * (0.005 + uBass * 0.015);
  fbUV += vec2(sin(t * 0.3), cos(t * 0.2)) * 0.002;
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.88;

  // Rich color palette
  vec3 col;
  col.r = sin(v * 3.14159 + uTime) * 0.5 + 0.5;
  col.g = sin(v * 3.14159 + uTime + 2.094) * 0.5 + 0.5;
  col.b = sin(v * 3.14159 + uTime + 4.189) * 0.5 + 0.5;
  col *= 0.6 + uBass * 0.8;

  gl_FragColor = vec4(max(fb * 0.95, col), 1.0);
}
`
  },
  {
    name: 'KALEIDOSCOPE',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center();
  float r = length(p);
  float a = atan(p.y, p.x);

  // Kaleidoscope symmetry (segments driven by treble)
  float segments = 6.0 + floor(uTreble * 4.0) * 2.0;
  a = mod(a, 6.28318 / segments);
  a = abs(a - 3.14159 / segments);
  p = vec2(cos(a), sin(a)) * r;

  // Warp space
  p += vec2(sin(uTime * 0.5 + p.y * 3.0), cos(uTime * 0.4 + p.x * 3.0)) * 0.1 * uMid;

  // Pattern
  float v = sin(p.x * 10.0 + uTime) + sin(p.y * 10.0 - uTime * 0.7);
  v += sin(length(p) * 15.0 - uTime * 3.0 * (0.5 + uBass));
  v = sin(v * 1.5) * 0.5 + 0.5;

  // Feedback with rotation
  vec2 fbUV = uv();
  vec2 fc = fbUV - 0.5;
  fc *= rot(0.01 + uBass * 0.03);
  fc *= 0.995;
  fbUV = fc + 0.5;
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.9;

  vec3 col;
  col.r = v * (0.5 + 0.5 * sin(uTime * 0.3));
  col.g = v * (0.5 + 0.5 * sin(uTime * 0.3 + 2.094));
  col.b = v * (0.5 + 0.5 * sin(uTime * 0.3 + 4.189));
  col *= 1.0 + uBass * 2.0;
  col *= smoothstep(1.5, 0.0, r);

  gl_FragColor = vec4(max(fb, col * 0.6), 1.0);
}
`
  },
  {
    name: 'STARFIELD',
    fragment: COMMON_HEADER + `
float star(vec2 p, float t) {
  float a = atan(p.y, p.x) / 6.28318;
  float r = length(p);
  float s = hash(floor(vec2(a * 40.0, 1.0)));
  float z = fract(s + t * 0.3);
  float d = smoothstep(0.02, 0.0, abs(r - z) - 0.001);
  return d * (1.0 - z);
}

void main() {
  vec2 p = center();
  float t = uTime * (0.5 + uBass * 1.5);

  // Rotate field
  p *= rot(t * 0.05 + uMid * 0.5);

  // Layers of stars
  float stars = 0.0;
  for (float i = 0.0; i < 4.0; i++) {
    float s = star(p * (1.0 + i * 0.5), t + i * 10.0);
    stars += s;
  }

  // Feedback with zoom
  vec2 fbUV = uv();
  vec2 toC = vec2(0.5) - fbUV;
  fbUV += toC * (-0.008 - uBass * 0.02);
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.85;

  // Nebula glow in center
  float glow = exp(-length(p) * 3.0) * uBass * 2.0;

  vec3 col = vec3(stars) * vec3(0.7, 0.8, 1.0);
  col += vec3(glow * 0.3, glow * 0.1, glow * 0.5);
  col += vec3(0.0, 0.0, stars * uTreble * 0.5);

  gl_FragColor = vec4(max(fb, col), 1.0);
}
`
  },
  {
    name: 'FRACTAL WAVE',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center() * (1.5 + uBass * 0.5);
  float t = uTime * 0.3;

  // Iterative fractal distortion
  vec2 z = p;
  float intensity = 0.0;
  for (int i = 0; i < 8; i++) {
    z = abs(z) / dot(z, z) - vec2(0.8 + sin(t) * 0.2, 0.6 + cos(t * 0.7) * 0.2 + uMid * 0.3);
    intensity += exp(-length(z) * 3.0);
  }
  intensity *= 0.125;

  // Feedback with subtle warp
  vec2 fbUV = uv();
  vec2 fc = fbUV - 0.5;
  fc *= rot(sin(uTime * 0.1) * 0.005);
  fc *= 1.003 + uBass * 0.01;
  fbUV = fc + 0.5;
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.88;

  // Spectrum-reactive color
  float hue = uTime * 0.2 + intensity * 2.0;
  vec3 col;
  col.r = sin(hue) * 0.5 + 0.5;
  col.g = sin(hue + 2.094) * 0.5 + 0.5;
  col.b = sin(hue + 4.189) * 0.5 + 0.5;
  col *= intensity * (1.0 + uBass * 3.0);

  gl_FragColor = vec4(max(fb, col * 0.7), 1.0);
}
`
  },
  {
    name: 'LIQUID MIRROR',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center();
  float t = uTime * 0.5;

  // Liquid distortion
  p.x += sin(p.y * 8.0 + t + uBass * 6.0) * 0.08 * (0.5 + uMid);
  p.y += cos(p.x * 6.0 + t * 1.3) * 0.08 * (0.5 + uBass);

  // Mirror fold
  p = abs(p);
  p -= 0.3;
  p = abs(p);

  // Pattern
  float d = length(p);
  float ring = sin(d * 20.0 - t * 3.0 * (0.5 + uBass)) * 0.5 + 0.5;
  ring = pow(ring, 3.0);

  float angle = atan(p.y, p.x);
  float spoke = sin(angle * 8.0 + t) * 0.5 + 0.5;
  spoke = pow(spoke, 6.0) * uTreble * 2.0;

  // Feedback with zoom-rotate
  vec2 fbUV = uv();
  vec2 fc = fbUV - 0.5;
  fc *= rot(0.015 + uBass * 0.02);
  fc *= 0.99;
  fbUV = fc + 0.5;
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.9;

  float hue = t * 0.5 + d * 3.0;
  vec3 col;
  col.r = sin(hue) * 0.5 + 0.5;
  col.g = sin(hue + 2.094) * 0.5 + 0.5;
  col.b = sin(hue + 4.189) * 0.5 + 0.5;
  col *= (ring + spoke) * (1.0 + uBass * 2.0);

  gl_FragColor = vec4(max(fb, col * 0.5), 1.0);
}
`
  },
  {
    name: 'GEISS PULSE',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center();
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = uTime;

  // Geiss-style radial pulse
  float wave = 0.0;
  for (float i = 1.0; i <= 5.0; i++) {
    float freq = i * 2.0 + uMid * 3.0;
    float amp = (0.3 / i) * (1.0 + uBass * 2.0);
    wave += sin(r * freq * 10.0 - t * (2.0 + i) + a * i) * amp;
  }
  wave = wave * 0.5 + 0.5;
  wave = pow(wave, 2.0 + uTreble * 4.0);

  // Center flash on heavy bass
  float flash = exp(-r * 4.0) * max(0.0, uBass - 0.6) * 5.0;

  // Feedback with inward pull
  vec2 fbUV = uv();
  vec2 toC = vec2(0.5) - fbUV;
  fbUV += toC * (0.01 + uBass * 0.02);
  fbUV += vec2(sin(a * 3.0 + t) * 0.003, cos(a * 3.0 + t) * 0.003);
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.87;

  float hue = t * 0.4 + a * 0.5;
  vec3 col;
  col.r = sin(hue) * 0.5 + 0.5;
  col.g = sin(hue + 2.094) * 0.5 + 0.5;
  col.b = sin(hue + 4.189) * 0.5 + 0.5;
  col *= wave;
  col += vec3(1.0, 0.8, 0.5) * flash;

  gl_FragColor = vec4(max(fb, col * 0.6), 1.0);
}
`
  },
  {
    name: 'ACID WORM',
    fragment: COMMON_HEADER + `
void main() {
  vec2 p = center() * (2.0 + uBass);
  float t = uTime * 0.6;

  // Domain repetition with rotation
  for (int i = 0; i < 3; i++) {
    p = abs(p) - 0.5;
    p *= rot(t * 0.3 + uMid);
  }

  // Worm pattern
  float d = length(p);
  float v = sin(p.x * 8.0 + t * 2.0) * cos(p.y * 8.0 - t * 1.5);
  v += sin(d * 12.0 - t * 4.0 * (0.3 + uBass));
  v = abs(v);
  v = 0.02 / v;

  // Feedback with swirl
  vec2 fbUV = uv();
  vec2 fc = fbUV - 0.5;
  float fr = length(fc);
  fc *= rot(0.02 * sin(fr * 10.0 + uTime));
  fc *= 0.998;
  fbUV = fc + 0.5;
  vec3 fb = texture2D(uFeedback, fbUV).rgb * 0.9;

  vec3 col = vec3(v * 0.2, v * 0.8, v * 1.2) * (0.5 + uBass);
  col *= vec3(
    0.5 + 0.5 * sin(uTime * 0.5),
    0.5 + 0.5 * sin(uTime * 0.5 + 2.0),
    0.5 + 0.5 * sin(uTime * 0.5 + 4.0)
  );

  gl_FragColor = vec4(max(fb, col * 0.5), 1.0);
}
`
  }
]

// Simple vertex shader (fullscreen quad)
export const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`
