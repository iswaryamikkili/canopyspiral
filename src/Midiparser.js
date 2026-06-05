/**
 * midiParser.js
 * 
 * Parses a real .mid file into the same format as canonScore.js
 * so the rest of the app works identically with both.
 * 
 * Output format: array of
 *   { note, midi, timeMs, duration, velocity, voice }
 * 
 * Usage:
 *   import { parseMidi } from './midiParser'
 *   const score = await parseMidi(file)   // file = File object from input
 */

// MIDI note number → note name
const MIDI_TO_NOTE = {}
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
for (let i = 0; i < 128; i++) {
  MIDI_TO_NOTE[i] = NAMES[i % 12] + Math.floor(i / 12 - 1)
}

/**
 * Read a variable-length MIDI value from a DataView.
 * Returns { value, bytesRead }
 */
function readVarLen(view, offset) {
  let value = 0
  let bytesRead = 0
  let byte
  do {
    byte = view.getUint8(offset + bytesRead)
    value = (value << 7) | (byte & 0x7F)
    bytesRead++
  } while (byte & 0x80)
  return { value, bytesRead }
}

/**
 * Parse a MIDI track chunk into an array of events with absolute tick times.
 */
function parseTrack(view, offset, length) {
  const end    = offset + length
  const events = []
  let tick     = 0
  let lastStatus = 0

  while (offset < end) {
    // Delta time
    const delta = readVarLen(view, offset)
    offset += delta.bytesRead
    tick   += delta.value

    let status = view.getUint8(offset)

    // Running status — reuse last status byte if high bit not set
    if (status & 0x80) {
      lastStatus = status
      offset++
    } else {
      status = lastStatus
    }

    const type    = (status & 0xF0) >> 4
    const channel = status & 0x0F

    if (type === 0x9) {
      // Note On
      const note     = view.getUint8(offset++)
      const velocity = view.getUint8(offset++)
      events.push({ tick, type: velocity > 0 ? 'noteOn' : 'noteOff', note, velocity, channel })

    } else if (type === 0x8) {
      // Note Off
      const note     = view.getUint8(offset++)
      const velocity = view.getUint8(offset++)
      events.push({ tick, type: 'noteOff', note, velocity, channel })

    } else if (type === 0xA) {
      offset += 2   // aftertouch

    } else if (type === 0xB) {
      offset += 2   // control change

    } else if (type === 0xC) {
      offset += 1   // program change

    } else if (type === 0xD) {
      offset += 1   // channel pressure

    } else if (type === 0xE) {
      offset += 2   // pitch bend

    } else if (status === 0xFF) {
      // Meta event
      const metaType = view.getUint8(offset++)
      const len      = readVarLen(view, offset)
      offset        += len.bytesRead

      if (metaType === 0x51) {
        // Tempo — microseconds per beat
        const us = (view.getUint8(offset) << 16) |
                   (view.getUint8(offset+1) << 8) |
                    view.getUint8(offset+2)
        events.push({ tick, type: 'tempo', usPerBeat: us })
      }
      offset += len.value

    } else if (status === 0xF0 || status === 0xF7) {
      // SysEx
      const len = readVarLen(view, offset)
      offset   += len.bytesRead + len.value

    } else {
      offset++   // unknown, skip
    }
  }

  return events
}

/**
 * Main export — parse a File object (.mid) into a score array.
 */
export async function parseMidi(file) {
  const buffer = await file.arrayBuffer()
  const view   = new DataView(buffer)

  // Header chunk — "MThd"
  const headerMagic = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  )
  if (headerMagic !== 'MThd') throw new Error('Not a valid MIDI file')

  const format    = view.getUint16(8)
  const numTracks = view.getUint16(10)
  const ticksPerBeat = view.getUint16(12)

  let offset  = 14
  let tempoUs = 500000   // default 120 BPM
  const allEvents = []

  // Parse each track
  for (let t = 0; t < numTracks; t++) {
    const magic = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset+1),
      view.getUint8(offset+2), view.getUint8(offset+3)
    )
    if (magic !== 'MTrk') { offset += 4; continue }
    const trackLen = view.getUint32(offset + 4)
    offset += 8

    const events = parseTrack(view, offset, trackLen)
    events.forEach(e => { e.track = t; allEvents.push(e) })
    offset += trackLen
  }

  // Sort by tick
  allEvents.sort((a, b) => a.tick - b.tick || a.type.localeCompare(b.type))

  // Convert ticks to ms, match noteOn/noteOff pairs
  function tickToMs(tick) {
    return (tick / ticksPerBeat) * (tempoUs / 1000)
  }

  const score  = []
  const active = {}   // key = `${track}-${note}` → noteOn event

  for (const ev of allEvents) {
    if (ev.type === 'tempo') {
      tempoUs = ev.usPerBeat
      continue
    }

    const key = `${ev.track}-${ev.note}`

    if (ev.type === 'noteOn') {
      active[key] = ev

    } else if (ev.type === 'noteOff' && active[key]) {
      const on  = active[key]
      const timeMs    = tickToMs(on.tick)
      const duration  = tickToMs(ev.tick) - timeMs
      score.push({
        note:     MIDI_TO_NOTE[on.note],
        midi:     on.note,
        timeMs:   Math.round(timeMs),
        duration: Math.max(50, Math.round(duration)),
        velocity: on.velocity,
        voice:    on.channel === 0 ? 'melody' : 'bass',
      })
      delete active[key]
    }
  }

  return score.sort((a, b) => a.timeMs - b.timeMs)
}