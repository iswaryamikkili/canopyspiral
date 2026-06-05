/**
 * scorePlayer.js
 * 
 * Watches audioEl.currentTime every frame and fires notes
 * from a score array at the exact right millisecond.
 * 
 * This replaces FFT detection for known songs.
 * For unknown songs, the app falls back to audio.js FFT mode.
 */

let score        = []     // array of { midi, timeMs, duration, velocity }
let fired        = new Set()  // set of indices already fired this playthrough
let audioEl      = null
let onNoteCb     = null   // callback(midi, amp) called per note event

/**
 * Load a score and connect to the audio element.
 * Call this when the user loads a known song.
 */
export function initScorePlayer(scoreData, audioElement, onNote) {
  score    = scoreData
  audioEl  = audioElement
  onNoteCb = onNote
  fired    = new Set()
}

/**
 * Reset fired notes — call on stop or seek.
 */
export function resetScore() {
  fired = new Set()
}

/**
 * Call every animation frame while playing.
 * Returns array of { midi, amp } for notes that just fired.
 * Identical return shape to detectNotes() in audio.js — drop-in replacement.
 */
export function tickScore() {
  if (!audioEl || !score.length) return []

  const nowMs  = audioEl.currentTime * 1000
  const window = 30   // fire notes within 30ms lookahead
  const fired_this_frame = []

  for (let i = 0; i < score.length; i++) {
    if (fired.has(i)) continue

    const note = score[i]

    // Fire if we're within the lookahead window of this note's time
    if (nowMs >= note.timeMs - window && nowMs < note.timeMs + window) {
      fired.add(i)
      const amp = note.velocity / 127   // velocity 0–127 → amp 0–1
      fired_this_frame.push({ midi: note.midi, amp })
      if (onNoteCb) onNoteCb({ midi: note.midi, amp })
    }

    // Past this note — skip ahead (score is sorted by timeMs)
    if (note.timeMs > nowMs + 500) break
  }

  return fired_this_frame
}

/**
 * True if a score is loaded and ready.
 */
export function hasScore() {
  return score.length > 0
}