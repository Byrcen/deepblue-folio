// 第四~六幕：大地数据网格与「城市灯火」节点
// 节点随 uRise 依次从地下升起，第六幕整体提亮

import * as THREE from 'three'

export interface CityGrid {
  group: THREE.Group
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uRise: { value: number }
    uBoost: { value: number }
  }
}

export function createCityGrid(quality: 'high' | 'low'): CityGrid {
  const group = new THREE.Group()
  group.position.set(0, 0.02, -22)

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uRise: { value: 0 },
    uBoost: { value: 1 },
  }

  // ---- 网格线 ----
  const SIZE = 130
  const DIV = 26
  const linePts: number[] = []
  for (let i = 0; i <= DIV; i++) {
    const c = -SIZE / 2 + (SIZE / DIV) * i
    linePts.push(-SIZE / 2, 0, c, SIZE / 2, 0, c)
    linePts.push(c, 0, -SIZE / 2, c, 0, SIZE / 2)
  }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3))

  const lineMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uBoost;
      varying vec3 vPos;
      void main() {
        float d = length(vPos.xz);
        float mask = smoothstep(65.0, 18.0, d);
        vec3 col = vec3(0.14, 0.35, 0.75) * uBoost;
        gl_FragColor = vec4(col, uOpacity * mask * 0.42);
      }
    `,
  })
  const lines = new THREE.LineSegments(lineGeo, lineMat)
  lines.renderOrder = 3
  group.add(lines)

  // ---- 城市灯火节点 ----
  const count = quality === 'high' ? 750 : 350
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count * 2) // 升起次序 / 闪烁相位
  const cell = SIZE / DIV
  for (let i = 0; i < count; i++) {
    // 吸附到网格交点附近，营造「城市街区」感
    const gx = Math.round((Math.random() * 2 - 1) * 10)
    const gz = Math.round((Math.random() * 2 - 1) * 10)
    pos[i * 3] = gx * cell * 0.5 + (Math.random() * 2 - 1) * 1.2
    pos[i * 3 + 1] = 0
    pos[i * 3 + 2] = gz * cell * 0.5 + (Math.random() * 2 - 1) * 1.2
    seed[i * 2] = Math.random()
    seed[i * 2 + 1] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2))

  const nodeMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aSeed;
      uniform float uTime;
      uniform float uRise;
      varying vec2 vSeed;
      varying float vShow;

      void main() {
        vSeed = aSeed;
        // 依种子错峰升起
        float show = clamp(uRise * 1.8 - aSeed.x * 0.8, 0.0, 1.0);
        show = show * show * (3.0 - 2.0 * show);
        vShow = show;
        vec3 p = position;
        p.y = mix(-2.5, 0.12 + aSeed.y * 0.25, show);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max((1.8 + aSeed.y * 3.2) * (60.0 / -mv.z) * (0.4 + show * 0.6), 1.6);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uBoost;
      varying vec2 vSeed;
      varying float vShow;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.08, length(c));
        float tw = 0.65 + 0.35 * sin(uTime * (1.5 + vSeed.y * 2.5) + vSeed.x * 40.0);
        vec3 col = mix(vec3(0.18, 0.49, 0.96), vec3(0.35, 0.9, 1.0), vSeed.y);
        gl_FragColor = vec4(col * uBoost * 1.3, m * tw * vShow * uOpacity);
      }
    `,
  })
  const nodes = new THREE.Points(geo, nodeMat)
  nodes.frustumCulled = false
  nodes.renderOrder = 3
  group.add(nodes)

  group.visible = false
  return { group, uniforms }
}
