import * as THREE from 'three'

const MAX_PARTICLES = 600   // reduced from 2000
const HALO_SEGMENTS = 40

let positions, colors, sizes, velocities, lifetimes, maxLifetimes
let geometry, points, scene

export function initParticles(threeScene) {
  scene = threeScene

  positions    = new Float32Array(MAX_PARTICLES * 3)
  colors       = new Float32Array(MAX_PARTICLES * 3)
  sizes        = new Float32Array(MAX_PARTICLES)
  velocities   = new Float32Array(MAX_PARTICLES * 3)
  lifetimes    = new Float32Array(MAX_PARTICLES)
  maxLifetimes = new Float32Array(MAX_PARTICLES)

  geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.PointsMaterial({
    size:            0.05,          // smaller dots
    vertexColors:    true,
    transparent:     true,
    opacity:         1,
    depthWrite:      false,
    blending:        THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  points = new THREE.Points(geometry, material)
  scene.add(points)

  for (let i = 0; i < MAX_PARTICLES; i++) lifetimes[i] = 0
}

function allocSlot() {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (lifetimes[i] <= 0) return i
  }
  return 0
}

const CYN = new THREE.Color(0x00F5FF)
const WHT = new THREE.Color(0xAFFFFF)

// Burst — fewer, smaller
export function burst(x, y, z, amp) {
  const count = 10 + Math.round(amp * 8)   // max ~18 particles
  for (let k = 0; k < count; k++) {
    const i = allocSlot(), i3 = i * 3
    positions[i3]     = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z

    const theta = Math.random() * Math.PI * 2
    const phi   = Math.random() * Math.PI
    const spd   = 0.01 + Math.random() * 0.035 * (1 + amp)
    velocities[i3]     = Math.sin(phi) * Math.cos(theta) * spd
    velocities[i3 + 1] = Math.abs(Math.cos(phi)) * spd * 1.2
    velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * spd

    const c = Math.random() > 0.4 ? CYN : WHT
    colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b

    sizes[i]        = 0.03 + Math.random() * 0.05
    maxLifetimes[i] = 30 + Math.random() * 25
    lifetimes[i]    = maxLifetimes[i]
  }
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate    = true
  geometry.attributes.size.needsUpdate     = true
}

// Trail dots — fewer, slow drift
export function trailDots(x, y, z, amp) {
  const count = 5 + Math.round(amp * 5)   // max ~10
  for (let k = 0; k < count; k++) {
    const i = allocSlot(), i3 = i * 3
    positions[i3]     = x + (Math.random() - 0.5) * 0.08
    positions[i3 + 1] = y
    positions[i3 + 2] = z + (Math.random() - 0.5) * 0.08

    const angle = Math.random() * Math.PI * 2
    const spd   = 0.003 + Math.random() * 0.012
    velocities[i3]     = Math.cos(angle) * spd
    velocities[i3 + 1] = 0.003 + Math.random() * 0.007
    velocities[i3 + 2] = Math.sin(angle) * spd

    colors[i3] = CYN.r; colors[i3+1] = CYN.g; colors[i3+2] = CYN.b

    sizes[i]        = 0.02 + Math.random() * 0.03
    maxLifetimes[i] = 45 + Math.random() * 35 + k * 4
    lifetimes[i]    = maxLifetimes[i]
  }
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate    = true
  geometry.attributes.size.needsUpdate     = true
}

// Halo — smaller, shorter duration
export function spawnHalo(x, y, z, amp) {
  const geo = new THREE.TorusGeometry(0.01, 0.012, 6, HALO_SEGMENTS)
  const mat = new THREE.MeshBasicMaterial({
    color:       0x00F5FF,
    transparent: true,
    opacity:     0.7,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  })
  const torus = new THREE.Mesh(geo, mat)
  torus.position.set(x, y + 0.01, z)
  torus.rotation.x = Math.PI / 2
  scene.add(torus)

  const targetR  = 0.15 + amp * 0.2   // much smaller: max 0.35 vs old 0.85
  const duration = 500 + amp * 300     // shorter: max 800ms vs old 1400ms
  const start    = performance.now()

  function animateHalo() {
    const elapsed = performance.now() - start
    const t       = Math.min(elapsed / duration, 1)
    torus.scale.setScalar((0.01 + (targetR - 0.01) * t) / 0.01)
    mat.opacity = (1 - t) * 0.7
    if (t < 1) requestAnimationFrame(animateHalo)
    else        scene.remove(torus)
  }
  requestAnimationFrame(animateHalo)
}

export function updateParticles() {
  let anyAlive = false
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (lifetimes[i] <= 0) continue
    const i3 = i * 3
    lifetimes[i]--
    const t = lifetimes[i] / maxLifetimes[i]

    positions[i3]     += velocities[i3]
    positions[i3 + 1] += velocities[i3 + 1]
    positions[i3 + 2] += velocities[i3 + 2]
    velocities[i3 + 1] -= 0.0006

    const fade = t * t
    colors[i3]     = CYN.r * fade
    colors[i3 + 1] = CYN.g * fade
    colors[i3 + 2] = CYN.b * fade

    anyAlive = true
  }
  if (anyAlive) {
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate    = true
  }
}