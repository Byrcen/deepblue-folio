// 夜空星点：穹顶上缓慢闪烁的微光，贯穿全程

import * as THREE from 'three'

export interface Stars {
  points: THREE.Points
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
  }
}

export function createStars(quality: 'high' | 'low'): Stars {
  const count = quality === 'high' ? 900 : 400
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 上半球均匀分布
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 0.85) // 避开地平线以下
    const r = 260
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.cos(phi) + 4
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    seed[i] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.7 },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.0 + aSeed * 2.2;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.1, length(c));
        float tw = 0.55 + 0.45 * sin(uTime * (0.4 + vSeed * 1.2) + vSeed * 50.0);
        vec3 col = mix(vec3(0.75, 0.85, 1.0), vec3(0.5, 0.85, 1.0), vSeed);
        gl_FragColor = vec4(col, m * tw * uOpacity);
      }
    `,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  return { points, uniforms }
}
