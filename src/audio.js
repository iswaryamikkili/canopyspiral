/**
 * audio.js — fixed transport + replay
 */

const AMP_THRESH  = 88
const DEBOUNCE_MS = 80

let audioCtx  = null
let analyser  = null
let freqData  = null
let lastFired = {}

export function initAudio(audioEl) {
  // Don't re-create context — just reconnect source to new audio element
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser  = audioCtx.createAnalyser()
    analyser.fftSize               = 8192
    analyser.smoothingTimeConstant = 0.82
    freqData  = new Uint8Array(analyser.frequencyBinCount)
    analyser.connect(audioCtx.destination)
  }

  // Disconnect old source if any, connect new one
  try {
    const src = audioCtx.createMediaElementSource(audioEl)
    src.connect(analyser)
  } catch(e) {
    // source already connected to this element — that's fine
  }
}

export function resumeAudio() {
  if (audioCtx?.state === 'suspended') audioCtx.resume()
}

export function resetDebounce() {
  lastFired = {}
}

function binToFreq(bin) {
  return bin * audioCtx.sampleRate / analyser.fftSize
}
function freqToMidi(f) {
  return Math.round(69 + 12 * Math.log2(f / 440))
}

export function detectNotes() {
  if (!analyser) return []
  analyser.getByteFrequencyData(freqData)

  const sr     = audioCtx.sampleRate
  const fft    = analyser.fftSize
  const minBin = Math.floor(27  / (sr / fft))
  const maxBin = Math.ceil(4200 / (sr / fft))
  const peaks  = []

  for (let i = minBin + 1; i < maxBin - 1; i++) {
    const v = freqData[i]
    if (v > AMP_THRESH && v >= freqData[i-1] && v >= freqData[i+1])
      peaks.push({ bin: i, amp: v })
  }

  peaks.sort((a, b) => b.amp - a.amp)
  const now = performance.now()

  return peaks.slice(0, 6)
    .map(p => ({ midi: freqToMidi(binToFreq(p.bin)), amp: p.amp / 255 }))
    .filter(n => {
      if (n.midi < 21 || n.midi > 108) return false
      if (now - (lastFired[n.midi] || 0) < DEBOUNCE_MS) return false
      lastFired[n.midi] = now
      return true
    })
}

export function getEnergy() {
  if (!freqData) return 0
  let sum = 0
  for (let i = 0; i < freqData.length; i++) sum += freqData[i]
  return sum / freqData.length / 255
}