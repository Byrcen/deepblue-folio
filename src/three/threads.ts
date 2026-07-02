// 第三幕：穿梭交织的发光丝线（协作网络的隐喻）
// 每条线是一条 CatmullRom 曲线，能量脉冲沿线流动

import * as THREE from 'three'

export interface Threads {
  group: THREE.Group
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
  }
}

export function createThreads(quality: 'high' | 'low'): Threads {
  const group = new THREE.Group()
  const lineCount = quality === 'high' ? 22 : 12

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
  }

  const vertexShader = /* glsl */ `
    attribute float aT;
    varying float vT;
    void main() {
      vT = aT;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uSeed;
    varying float vT;

    void main() {
      vec3 blue = vec3(0.18, 0.49, 0.96);
      vec3 cyan = vec3(0.35, 0.9, 1.0);

      // 基础微光 + 沿线流动的能量脉冲（两个错相脉冲）
      float base = 0.45;
      float p1 = fract(vT * 1.2 - uTime * (0.16 + uSeed * 0.12) + uSeed);
      float p2 = fract(vT * 0.7 + uTime * (0.10 + uSeed * 0.08) + uSeed * 2.7);
      float pulse = exp(-pow((p1 - 0.5) * 9.0, 2.0)) * 3.2
                  + exp(-pow((p2 - 0.5) * 12.0, 2.0)) * 2.2;

      // 线两端淡出
      float ends = smoothstep(0.0, 0.12, vT) * smoothstep(1.0, 0.88, vT);

      vec3 col = mix(blue, cyan, vT * 0.6 + uSeed * 0.3) * (base + pulse);
      gl_FragColor = vec4(col, uOpacity * ends * (0.55 + pulse * 0.35));
    }
  `

  const materials: THREE.ShaderMaterial[] = []

  for (let li = 0; li < lineCount; li++) {
    const seed = li / lineCount
    // 控制点：从远处 (-z) 流向观者身后，横向缠绕
    const ctrl: THREE.Vector3[] = []
    const baseX = (Math.random() * 2 - 1) * 14
    const baseY = 0.8 + Math.random() * 5.5
    for (let c = 0; c <= 6; c++) {
      const t = c / 6
      ctrl.push(
        new THREE.Vector3(
          baseX + Math.sin(t * Math.PI * (1.5 + seed) + seed * 9) * (3 + seed * 7),
          baseY + Math.sin(t * Math.PI * 2 + li) * (1 + seed * 2.2),
          8 - t * 68,
        ),
      )
    }
    const curve = new THREE.CatmullRomCurve3(ctrl)
    const pts = curve.getPoints(quality === 'high' ? 180 : 100)

    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const ts = new Float32Array(pts.length)
    for (let i = 0; i < pts.length; i++) ts[i] = i / (pts.length - 1)
    geo.setAttribute('aT', new THREE.BufferAttribute(ts, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uOpacity: uniforms.uOpacity,
        uSeed: { value: Math.random() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    materials.push(mat)
    const line = new THREE.Line(geo, mat)
    line.renderOrder = 4
    group.add(line)
  }

  // 环境浮尘
  const dustCount = quality === 'high' ? 500 : 220
  const dustGeo = new THREE.BufferGeometry()
  const dPos = new Float32Array(dustCount * 3)
  const dSeed = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    dPos[i * 3] = (Math.random() * 2 - 1) * 22
    dPos[i * 3 + 1] = Math.random() * 8
    dPos[i * 3 + 2] = 10 - Math.random() * 70
    dSeed[i] = Math.random()
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1))
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uOpacity: uniforms.uOpacity },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p.y += sin(uTime * 0.5 + aSeed * 6.28) * 0.6;
        p.x += cos(uTime * 0.3 + aSeed * 12.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aSeed * 2.5) * (12.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.05, length(c));
        float tw = 0.5 + 0.5 * sin(uTime * (1.0 + vSeed * 3.0) + vSeed * 40.0);
        gl_FragColor = vec4(vec3(0.4, 0.8, 1.0), m * tw * 0.5 * uOpacity);
      }
    `,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  dust.renderOrder = 4
  group.add(dust)

  group.visible = false
  return { group, uniforms }
}
