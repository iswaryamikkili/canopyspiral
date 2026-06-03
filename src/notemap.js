/**
 * noteMap.js
 * Converts MIDI note numbers to 3D positions on the polar spiral.
 * D3 is used purely for scale math — no DOM touched.
 */
import * as d3 from 'd3'

export const SEMITONES  = 12
export const MIN_OCTAVE = 1
export const MAX_OCTAVE = 8
export const OCTAVES    = MAX_OCTAVE - MIN_OCTAVE   // 7

// Spiral radii in Three.js units
export const R_INNER = 0.25   // C8 (innermost)
export const R_OUTER = 3.2    // C1 (outermost)

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
export const isSharp    = s => [1,3,6,8,10].includes(s)

// D3 scales
const radiusScale = d3.scaleLinear()
  .domain([MIN_OCTAVE, MAX_OCTAVE])
  .range([R_OUTER, R_INNER])   // octave 1 outer, octave 8 inner

const angleScale = d3.scaleLinear()
  .domain([0, SEMITONES])
  .range([0, Math.PI * 2])

export function midiToSemitoneOctave(midi) {
  return { semitone: midi % 12, octave: Math.floor(midi / 12) - 1 }
}

/**
 * Returns {x, y, z, r, angle, semitone, octave}
 * for a given MIDI note in Three.js world space.
 * The spiral lies in the XZ plane; Y is up.
 */
export function midiTo3D(midi) {
  const { semitone, octave } = midiToSemitoneOctave(midi)
  const r     = radiusScale(Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, octave)))
  const angle = angleScale(semitone) - Math.PI / 2   // C at top
  return {
    x: Math.cos(angle) * r,
    y: 0,
    z: Math.sin(angle) * r,
    r, angle, semitone, octave,
  }
}

/** Width of one octave band */
export const bandWidth = () => (R_OUTER - R_INNER) / (OCTAVES + 1)

/** Colour per pitch class */
export const PITCH_COLORS = [
  '#E8C97B','#C8A96E','#A8956B','#C8B89A',
  '#9EC4B0','#7EB8A8','#6AAEB8','#5B9FC4',
  '#7A8EC4','#9B88C4','#C488B8','#C47A8A',
]

export const CYN_MID  = '#00F5FF'
export const CYN_CORE = '#AFFFFF'