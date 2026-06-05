/**
 * SpiralCanvas.jsx
 * Uses scorePlayer (score mode) when a score is loaded,
 * falls back to audio.js FFT detection for unknown songs.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildSpiral, flashCell } from './spiral'
import { initParticles, burst, trailDots, spawnHalo, updateParticles } from './particles'
import { detectNotes } from './audio'
import { tickScore, hasScore } from './Scoreplayer'
import { midiTo3D, midiToSemitoneOctave } from './noteMap'

export default function SpiralCanvas({ isPlaying, onNote }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ isPlaying: false })

  useEffect(() => { stateRef.current.isPlaying = isPlaying }, [isPlaying])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x04050a)
    scene.fog        = new THREE.FogExp2(0x04050a, 0.10)

    const getSize = () => ({
      w: mount.offsetWidth  || window.innerWidth,
      h: mount.offsetHeight || window.innerHeight,
    })
    const { w, h } = getSize()
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
    camera.position.set(0, 5.5, 4.0)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x04050a, 1)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(3, 6, 3)
    scene.add(dir)
    const rim = new THREE.DirectionalLight(0x4488ff, 0.4)
    rim.position.set(-4, 2, -4)
    scene.add(rim)

    const spiral = buildSpiral()
    scene.add(spiral)
    initParticles(scene)

    const onResize = () => {
      const { w: rw, h: rh } = getSize()
      camera.aspect = rw / rh
      camera.updateProjectionMatrix()
      renderer.setSize(rw, rh)
    }
    window.addEventListener('resize', onResize)

    let rafId
    function animate() {
      rafId = requestAnimationFrame(animate)

      if (stateRef.current.isPlaying) {
        // ── Score mode (MIDI/transcription) or FFT fallback ──────────
        const notes = hasScore() ? tickScore() : detectNotes()

        notes.forEach(({ midi, amp }) => {
          const pos = midiTo3D(midi)
          const { semitone, octave } = midiToSemitoneOctave(midi)
          flashCell(spiral, semitone, octave, amp)
          burst(pos.x, pos.y, pos.z, amp)
          setTimeout(() => trailDots(pos.x, pos.y, pos.z, amp), 120)
          spawnHalo(pos.x, pos.y, pos.z, amp)
          if (onNote) onNote({ midi, amp, semitone, octave })
        })
      }

      updateParticles()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width:'100%', height:'100%', display:'block' }} />
}