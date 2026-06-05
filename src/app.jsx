/**
 * App.jsx — updated for score mode + MIDI file upload
 */
import { useState, useRef, useCallback } from 'react'
import SpiralCanvas from './SpiralCanvas'
import { initAudio, resumeAudio, resetDebounce } from './audio'
import { initScorePlayer, resetScore, hasScore } from './Scoreplayer'
import { parseMidi } from './Midiparser'
import { CANON_SCORE } from './Canonscore'
import { NOTE_NAMES } from './noteMap'

export default function App() {
  const audioEl       = useRef(null)
  const audioInited   = useRef(false)
  const [ready,       setReady]       = useState(false)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [audioFile,   setAudioFile]   = useState('')
  const [midiFile,    setMidiFile]    = useState('')
  const [scoreMode,   setScoreMode]   = useState('canon')  // 'canon' | 'midi' | 'fft'
  const [isDrag,      setIsDrag]      = useState(false)
  const [currentNote, setCurrentNote] = useState(null)
  const noteTimer     = useRef(null)

  // ── Load audio MP3 ─────────────────────────────────────────────────────
  const loadAudio = useCallback(file => {
    if (!file) return
    if (audioEl.current) {
      audioEl.current.pause()
      audioEl.current.currentTime = 0
    }
    setIsPlaying(false)
    setAudioFile(file.name)
    audioEl.current.src = URL.createObjectURL(file)

    if (!audioInited.current) {
      initAudio(audioEl.current)
      audioInited.current = true
    }

    // Auto-load Canon in D score unless user loaded a custom MIDI
    if (scoreMode === 'canon' || scoreMode === 'fft') {
      initScorePlayer(
        scoreMode === 'canon' ? CANON_SCORE : [],
        audioEl.current,
        null
      )
    }

    setReady(true)
  }, [scoreMode])

  // ── Load MIDI file ─────────────────────────────────────────────────────
  const loadMidi = useCallback(async file => {
    if (!file) return
    setMidiFile(file.name)
    try {
      const score = await parseMidi(file)
      initScorePlayer(score, audioEl.current, null)
      setScoreMode('midi')
      console.log(`MIDI loaded: ${score.length} notes`)
    } catch(err) {
      console.error('MIDI parse error:', err)
      alert('Could not read MIDI file — falling back to audio detection')
      setScoreMode('fft')
    }
  }, [])

  const onAudioChange = e => { loadAudio(e.target.files[0]); e.target.value = '' }
  const onMidiChange  = e => { loadMidi(e.target.files[0]);  e.target.value = '' }

  const onDrop = e => {
    e.preventDefault(); setIsDrag(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) loadMidi(file)
    else loadAudio(file)
  }

  // ── Transport ──────────────────────────────────────────────────────────
  const play = async () => {
    if (!ready) return
    resumeAudio()
    resetDebounce()
    resetScore()
    try {
      await audioEl.current.play()
      setIsPlaying(true)
    } catch(err) { console.error('Play failed:', err) }
  }

  const pause = () => { audioEl.current.pause(); setIsPlaying(false) }

  const stop = () => {
    audioEl.current.pause()
    audioEl.current.currentTime = 0
    setIsPlaying(false)
    resetDebounce()
    resetScore()
  }

  const onEnded = () => { setIsPlaying(false); resetScore() }

  const handleNote = useCallback(({ semitone, octave }) => {
    setCurrentNote(NOTE_NAMES[semitone] + octave)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setCurrentNote(null), 600)
  }, [])

  // ── Score mode badge ───────────────────────────────────────────────────
  const modeBadge = {
    canon: { label: 'Canon score', color: '#14532d', bg: '#dcfce7' },
    midi:  { label: `MIDI: ${midiFile}`, color: '#1e3a8a', bg: '#dbeafe' },
    fft:   { label: 'Audio detect', color: '#9a3412', bg: '#fef3e8' },
  }[scoreMode]

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      height:'100%', padding:'1rem 1rem 0', background:'var(--bg)',
    }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'.6rem', flexShrink:0 }}>
        <div style={{
          fontFamily:"'DM Serif Display',serif", fontStyle:'italic',
          fontSize:'clamp(1.3rem,3vw,1.9rem)', letterSpacing:'.02em', color:'var(--text)',
        }}>Canon in D</div>
        <div style={{ fontSize:'.62rem', color:'var(--muted)', letterSpacing:'.18em', textTransform:'uppercase', marginTop:'.15rem' }}>
          three.js · react · d3 · web audio
        </div>
      </div>

      {/* Upload row — audio + optional MIDI */}
      <div style={{ display:'flex', gap:'8px', flexShrink:0, flexWrap:'wrap', justifyContent:'center', marginBottom:'.5rem' }}>

        {/* Audio upload */}
        <div
          className={`upload-zone${isDrag?' drag':''}`}
          onDragOver={e=>{e.preventDefault();setIsDrag(true)}}
          onDragLeave={()=>setIsDrag(false)}
          onDrop={onDrop}
        >
          <input type="file" accept="audio/*" onChange={onAudioChange} />
          {audioFile
            ? <span style={{color:'var(--accent)'}}>{audioFile}</span>
            : <span>Drop MP3 / WAV or click</span>
          }
        </div>

        {/* MIDI upload */}
        <div className="upload-zone">
          <input type="file" accept=".mid,.midi" onChange={onMidiChange} />
          {midiFile
            ? <span style={{color:'var(--accent)'}}>{midiFile}</span>
            : <span>Drop .mid file (optional)</span>
          }
        </div>
      </div>

      {/* Score mode indicator */}
      <div style={{
        fontSize:'10px', fontWeight:500, padding:'2px 10px',
        borderRadius:'10px', background: modeBadge.bg, color: modeBadge.color,
        marginBottom:'.5rem', flexShrink:0, letterSpacing:'.05em',
      }}>
        {modeBadge.label}
      </div>

      {/* FFT toggle */}
      <div style={{ marginBottom:'.5rem', flexShrink:0 }}>
        <button
          style={{ fontSize:'.62rem', opacity: scoreMode==='fft'?1:0.5 }}
          onClick={() => setScoreMode(m => m==='fft'?'canon':'fft')}
        >
          {scoreMode==='fft' ? '⚡ FFT mode (click for score)' : '🎼 Score mode (click for FFT)'}
        </button>
      </div>

      {/* Transport */}
      <div className="controls" style={{ flexShrink:0 }}>
        <button onClick={play}  disabled={!ready||isPlaying}>▶ Play</button>
        <button onClick={pause} disabled={!isPlaying}>⏸ Pause</button>
        <button onClick={stop}  disabled={!ready}>■ Stop</button>
        {!isPlaying && ready && (audioEl.current?.currentTime||0) > 0 && (
          <button onClick={play}>↩ Resume</button>
        )}
      </div>

      {/* Canvas */}
      <div className="canvas-wrap">
        <SpiralCanvas isPlaying={isPlaying} onNote={handleNote} />
        <div className="note-hud" style={{ opacity: currentNote?1:0 }}>
          {currentNote}
        </div>
      </div>

      <audio ref={audioEl} crossOrigin="anonymous" onEnded={onEnded} style={{display:'none'}} />
    </div>
  )
}