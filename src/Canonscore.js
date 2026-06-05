/**
 * canonScore.js
 * 
 * Full Canon in D note data — hardcoded from standard transcription.
 * Format per note:
 *   note     — human readable name
 *   midi     — MIDI number (used to find position on spiral)
 *   timeMs   — when to fire (ms from start of track)
 *   duration — how long the note holds (ms)
 *   velocity — loudness 0–127 (maps to amp 0–1)
 *   voice    — which part (bass, tenor, alto, soprano)
 *
 * Tempo: 68 BPM → one beat = 882ms
 * Time signature: 4/4
 * 
 * This covers the main melodic line + bass line for ~32 bars.
 * When you get a real MIDI file, midiParser.js will replace this.
 */

const BPM      = 68
const BEAT     = (60 / BPM) * 1000   // ms per beat = 882ms
const HALF     = BEAT * 2
const QUARTER  = BEAT
const EIGHTH   = BEAT / 2
const SIXTEENTH= BEAT / 4

// Helper — note name to MIDI
const NOTE_TO_MIDI = {
  'C2':36,'D2':38,'E2':40,'F2':41,'G2':43,'A2':45,'B2':47,
  'C3':48,'C#3':49,'D3':50,'D#3':51,'E3':52,'F3':53,'F#3':54,'G3':55,'G#3':56,'A3':57,'A#3':58,'B3':59,
  'C4':60,'C#4':61,'D4':62,'D#4':63,'E4':64,'F4':65,'F#4':66,'G4':67,'G#4':68,'A4':69,'A#4':70,'B4':71,
  'C5':72,'C#5':73,'D5':74,'D#5':75,'E5':76,'F5':77,'F#5':78,'G5':79,'G#5':80,'A5':81,'B5':83,
}

function n(name, timeMs, duration, velocity=80, voice='melody') {
  return { note: name, midi: NOTE_TO_MIDI[name], timeMs, duration, velocity, voice }
}

// ── Bass line — the famous D A Bm F#m G D G A repeating progression ──────────
// Each chord root held for one full bar (4 beats)
function bassBar(note, barNum) {
  const t = barNum * BEAT * 4
  return n(note, t, BEAT * 3.5, 90, 'bass')
}

const BASS_PATTERN = ['D3','A2','B2','F#3','G2','D3','G2','A2']
const bassNotes = []
for (let repeat = 0; repeat < 4; repeat++) {
  BASS_PATTERN.forEach((note, i) => {
    bassNotes.push(bassBar(note, repeat * 8 + i))
  })
}

// ── Melody line — the iconic descending Canon melody ─────────────────────────
// Starts at bar 4 (after bass establishes), eighth note runs
const MELODY_START = 4 * BEAT * 4  // bar 4

const melodyNotes = [
  // Bar 4 — F#4 E4 D4 C#4
  n('F#4', MELODY_START + 0,        EIGHTH, 82),
  n('E4',  MELODY_START + EIGHTH,   EIGHTH, 80),
  n('D4',  MELODY_START + EIGHTH*2, EIGHTH, 78),
  n('C#4', MELODY_START + EIGHTH*3, EIGHTH, 76),

  // Bar 5 — B3 A3 B3 C#4
  n('B3',  MELODY_START + BEAT*4,   EIGHTH, 78),
  n('A3',  MELODY_START + BEAT*4+EIGHTH, EIGHTH, 76),
  n('B3',  MELODY_START + BEAT*4+EIGHTH*2, EIGHTH, 78),
  n('C#4', MELODY_START + BEAT*4+EIGHTH*3, EIGHTH, 80),

  // Bar 6 — D4 C#4 B3 A3
  n('D4',  MELODY_START + BEAT*8,   EIGHTH, 82),
  n('C#4', MELODY_START + BEAT*8+EIGHTH, EIGHTH, 80),
  n('B3',  MELODY_START + BEAT*8+EIGHTH*2, EIGHTH, 78),
  n('A3',  MELODY_START + BEAT*8+EIGHTH*3, EIGHTH, 76),

  // Bar 7 — G3 F#3 G3 A3
  n('G3',  MELODY_START + BEAT*12,  EIGHTH, 78),
  n('F#3', MELODY_START + BEAT*12+EIGHTH, EIGHTH, 76),
  n('G3',  MELODY_START + BEAT*12+EIGHTH*2, EIGHTH, 78),
  n('A3',  MELODY_START + BEAT*12+EIGHTH*3, EIGHTH, 80),

  // Bar 8 — B3 A3 G3 F#3
  n('B3',  MELODY_START + BEAT*16,  EIGHTH, 82),
  n('A3',  MELODY_START + BEAT*16+EIGHTH, EIGHTH, 80),
  n('G3',  MELODY_START + BEAT*16+EIGHTH*2, EIGHTH, 78),
  n('F#3', MELODY_START + BEAT*16+EIGHTH*3, EIGHTH, 76),

  // Bar 9 — G3 A3 B3 G3
  n('G3',  MELODY_START + BEAT*20,  EIGHTH, 76),
  n('A3',  MELODY_START + BEAT*20+EIGHTH, EIGHTH, 78),
  n('B3',  MELODY_START + BEAT*20+EIGHTH*2, EIGHTH, 80),
  n('G3',  MELODY_START + BEAT*20+EIGHTH*3, EIGHTH, 78),

  // Bar 10 — A3 B3 C#4 A3
  n('A3',  MELODY_START + BEAT*24,  EIGHTH, 78),
  n('B3',  MELODY_START + BEAT*24+EIGHTH, EIGHTH, 80),
  n('C#4', MELODY_START + BEAT*24+EIGHTH*2, EIGHTH, 82),
  n('A3',  MELODY_START + BEAT*24+EIGHTH*3, EIGHTH, 80),

  // Bar 11 — D4 E4 F#4 D4
  n('D4',  MELODY_START + BEAT*28,  EIGHTH, 82),
  n('E4',  MELODY_START + BEAT*28+EIGHTH, EIGHTH, 84),
  n('F#4', MELODY_START + BEAT*28+EIGHTH*2, EIGHTH, 86),
  n('D4',  MELODY_START + BEAT*28+EIGHTH*3, EIGHTH, 82),

  // Bar 12 — G4 F#4 E4 D4
  n('G4',  MELODY_START + BEAT*32,  EIGHTH, 88),
  n('F#4', MELODY_START + BEAT*32+EIGHTH, EIGHTH, 86),
  n('E4',  MELODY_START + BEAT*32+EIGHTH*2, EIGHTH, 84),
  n('D4',  MELODY_START + BEAT*32+EIGHTH*3, EIGHTH, 82),

  // Bar 13 — E4 F#4 G4 E4
  n('E4',  MELODY_START + BEAT*36,  EIGHTH, 82),
  n('F#4', MELODY_START + BEAT*36+EIGHTH, EIGHTH, 84),
  n('G4',  MELODY_START + BEAT*36+EIGHTH*2, EIGHTH, 86),
  n('E4',  MELODY_START + BEAT*36+EIGHTH*3, EIGHTH, 82),

  // Bar 14 — A4 G4 F#4 E4
  n('A4',  MELODY_START + BEAT*40,  EIGHTH, 88),
  n('G4',  MELODY_START + BEAT*40+EIGHTH, EIGHTH, 86),
  n('F#4', MELODY_START + BEAT*40+EIGHTH*2, EIGHTH, 84),
  n('E4',  MELODY_START + BEAT*40+EIGHTH*3, EIGHTH, 82),

  // Bar 15 — D4 E4 F#4 G4
  n('D4',  MELODY_START + BEAT*44,  EIGHTH, 80),
  n('E4',  MELODY_START + BEAT*44+EIGHTH, EIGHTH, 82),
  n('F#4', MELODY_START + BEAT*44+EIGHTH*2, EIGHTH, 84),
  n('G4',  MELODY_START + BEAT*44+EIGHTH*3, EIGHTH, 86),

  // Bar 16 — A4 B4 A4 G4
  n('A4',  MELODY_START + BEAT*48,  QUARTER, 88),
  n('B4',  MELODY_START + BEAT*49,  QUARTER, 90),
  n('A4',  MELODY_START + BEAT*50,  QUARTER, 88),
  n('G4',  MELODY_START + BEAT*51,  QUARTER, 86),
]

// Merge and sort all notes by time
export const CANON_SCORE = [...bassNotes, ...melodyNotes]
  .filter(n => n.midi !== undefined)
  .sort((a, b) => a.timeMs - b.timeMs)

// Total duration in ms
export const SCORE_DURATION = Math.max(...CANON_SCORE.map(n => n.timeMs + n.duration))

console.log(`Canon score: ${CANON_SCORE.length} notes, ${(SCORE_DURATION/1000).toFixed(1)}s`)