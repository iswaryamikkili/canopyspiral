import { useState, useRef, useCallback } from 'react'
import SpiralCanvas from './SpiralCanvas'
import { initAudio, resumeAudio, resetDebounce } from './audio'
import { NOTE_NAMES } from './noteMap'

export default function App() {
  const audioEl       = useRef(null)
  const audioInited   = useRef(false)   // track if audio graph built
  const [ready,       setReady]       = useState(false)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [fileName,    setFileName]    = useState('')
  const [isDrag,      setIsDrag]      = useState(false)
  const [currentNote, setCurrentNote] = useState(null)
  const noteTimer     = useRef(null)

  const loadFile = useCallback(file => {
    if (!file) return

    // Pause anything currently playing first
    if (audioEl.current) {
      audioEl.current.pause()
      audioEl.current.currentTime = 0
    }
    setIsPlaying(false)
    setFileName(file.name)

    const url = URL.createObjectURL(file)
    audioEl.current.src = url

    // Only init audio graph once (Web Audio limitation)
    if (!audioInited.current) {
      initAudio(audioEl.current)
      audioInited.current = true
    }

    setReady(true)
  }, [])

  const onFileChange = e => {
    const file = e.target.files[0]
    if (file) loadFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const onDrop = e => {
    e.preventDefault()
    setIsDrag(false)
    loadFile(e.dataTransfer.files[0])
  }

  // ── PLAY ──────────────────────────────────────────────────────────────
  const play = async () => {
    if (!ready) return
    resumeAudio()
    resetDebounce()
    try {
      await audioEl.current.play()
      setIsPlaying(true)
    } catch(err) {
      console.error('Play failed:', err)
    }
  }

  // ── PAUSE ─────────────────────────────────────────────────────────────
  const pause = () => {
    audioEl.current.pause()
    setIsPlaying(false)
  }

  // ── STOP — pauses + resets to start, ready to play again ─────────────
  const stop = () => {
    audioEl.current.pause()
    audioEl.current.currentTime = 0
    setIsPlaying(false)
    resetDebounce()
  }

  // ── Auto-stop when track ends ─────────────────────────────────────────
  const onEnded = () => {
    setIsPlaying(false)
    resetDebounce()
  }

  const handleNote = useCallback(({ semitone, octave }) => {
    setCurrentNote(NOTE_NAMES[semitone] + octave)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setCurrentNote(null), 600)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: '1rem 1rem 0', background: 'var(--bg)',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '.75rem', flexShrink: 0 }}>
        <div style={{
          fontFamily: "'DM Serif Display', serif", fontStyle: 'italic',
          fontSize: 'clamp(1.3rem,3vw,1.9rem)', letterSpacing: '.02em', color: 'var(--text)',
        }}>Canon in D</div>
        <div style={{
          fontSize: '.62rem', color: 'var(--muted)',
          letterSpacing: '.18em', textTransform: 'uppercase', marginTop: '.15rem',
        }}>three.js · react · d3 · web audio</div>
      </div>

      {/* Upload */}
      <div
        className={`upload-zone${isDrag ? ' drag' : ''}`}
        style={{ flexShrink: 0 }}
        onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={onDrop}
      >
        <input type="file" accept="audio/*" onChange={onFileChange} />
        {fileName
          ? <span style={{ color: 'var(--accent)' }}>{fileName}</span>
          : <span>Drop MP3 / WAV here — or click to browse</span>
        }
      </div>

      {/* Transport */}
      <div className="controls" style={{ flexShrink: 0 }}>
        {/* Play: disabled while already playing */}
        <button onClick={play}  disabled={!ready || isPlaying}>▶ Play</button>
        {/* Pause: only enabled while playing */}
        <button onClick={pause} disabled={!isPlaying}>⏸ Pause</button>
        {/* Stop: enabled whenever ready, resets to start */}
        <button onClick={stop}  disabled={!ready}>■ Stop</button>
        {/* Resume after pause */}
        {!isPlaying && ready && audioEl.current?.currentTime > 0 && (
          <button onClick={play}>↩ Resume</button>
        )}
      </div>

      {/* Canvas */}
      <div className="canvas-wrap">
        <SpiralCanvas isPlaying={isPlaying} onNote={handleNote} />
        <div className="note-hud" style={{ opacity: currentNote ? 1 : 0 }}>
          {currentNote}
        </div>
      </div>

      {/* Audio element — hidden, with onEnded handler */}
      <audio
        ref={audioEl}
        crossOrigin="anonymous"
        onEnded={onEnded}
        style={{ display: 'none' }}
      />
    </div>
  )
}