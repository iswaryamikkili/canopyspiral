import * as THREE from 'three'
import {
  SEMITONES, MIN_OCTAVE, MAX_OCTAVE,
  R_INNER, R_OUTER, isSharp, bandWidth,
} from './noteMap'

const BAND  = bandWidth()
const STEPS = 32

// Black & white piano key colours
function cellBaseColor(semitone) {
  if (isSharp(semitone)) return new THREE.Color(0x0a0a0a) // black keys
  return new THREE.Color(0xf8f6ee)                         // white keys
}

function buildArcShape(innerR, outerR, startAngle, endAngle, steps) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps)
    pts.push(new THREE.Vector2(Math.cos(a) * outerR, Math.sin(a) * outerR))
  }
  for (let i = steps; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / steps)
    pts.push(new THREE.Vector2(Math.cos(a) * innerR, Math.sin(a) * innerR))
  }
  return new THREE.Shape(pts)
}

export function buildSpiral() {
  const group    = new THREE.Group()
  const sliceAng = (Math.PI * 2) / SEMITONES
  const angPad   = 0.018

  for (let oct = MIN_OCTAVE; oct <= MAX_OCTAVE; oct++) {
    const octIdx = oct - MIN_OCTAVE
    const outerR = R_OUTER - octIdx * BAND
    const innerR = outerR  - BAND + 0.02

    for (let s = 0; s < SEMITONES; s++) {
      if (oct === MIN_OCTAVE && s === SEMITONES - 1) continue

      const startAngle = s * sliceAng - Math.PI / 2 + angPad
      const endAngle   = startAngle + sliceAng - angPad * 2
      const shape      = buildArcShape(innerR, outerR, startAngle, endAngle, STEPS)
      const geometry   = new THREE.ShapeGeometry(shape)
      const color      = cellBaseColor(s)

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive:    color.clone().multiplyScalar(0.05),
        roughness:   isSharp(s) ? 0.15 : 0.65,
        metalness:   isSharp(s) ? 0.35 : 0.05,

        side:        THREE.DoubleSide,
        transparent: true,
        opacity:     1
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.userData   = { semitone: s, octave: oct, baseColor: color.clone() }

      // Grid lines
      const edges   = new THREE.EdgesGeometry(geometry)
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x444444, transparent: true, opacity: 0.5,
      })
      const lines = new THREE.LineSegments(edges, lineMat)
      lines.rotation.x = -Math.PI / 2

      group.add(mesh)
      group.add(lines)
    }
  }

  // Centre dot
  const dotGeo = new THREE.CircleGeometry(0.12, 32)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const dot    = new THREE.Mesh(dotGeo, dotMat)
  dot.rotation.x = -Math.PI / 2
  group.add(dot)

  const ringGeo = new THREE.RingGeometry(0.12, 0.15, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  group.add(ring)

  return group
}

export function flashCell(spiralGroup, semitone, octave, amp) {
  spiralGroup.children.forEach(child => {
    const ud = child.userData
    if (ud.semitone === semitone && ud.octave === octave && child.material?.color) {
      const mat  = child.material
      const base = ud.baseColor
      mat.color.set(0x00F5FF)
      mat.emissive.set(0x00F5FF)
      mat.emissiveIntensity = 1 + amp * 0.8
      let t = 0
      const decay = () => {
        t += 0.05
        if (t >= 1) {
          mat.color.copy(base)
          mat.emissive.copy(base).multiplyScalar(0.05)
          mat.emissiveIntensity = 1
          return
        }
        mat.color.lerpColors(new THREE.Color(0x00F5FF), base, t)
        mat.emissive.lerpColors(new THREE.Color(0x00F5FF), base.clone().multiplyScalar(0.05), t)
        requestAnimationFrame(decay)
      }
      requestAnimationFrame(decay)
    }
  })
}