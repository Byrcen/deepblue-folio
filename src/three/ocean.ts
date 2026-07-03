// 夜海：起伏的暗蓝水面 + 立方体正下方的辉光与涟漪

import * as THREE from 'three'

export interface Ocean {
  mesh: THREE.Mesh
  group: THREE.Group
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uGlow: { value: number }
  }
}

export function createOcean(quality: 'high' | 'low'): Ocean {
  const seg = quality === 'high' ? 140 : 80
  const geo = new THREE.PlaneGeometry(260, 260, seg, seg)
  geo.rotateX(-Math.PI / 2)

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uGlow: { value: 1 },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      varying float vElev;

      void main() {
        vec3 p = position;
        float t = uTime;
        float e = 0.0;
        e += sin(p.x * 0.14 + t * 0.55) * 0.32;
        e += sin(p.z * 0.19 + t * 0.75) * 0.24;
        e += sin((p.x + p.z) * 0.075 + t * 0.38) * 0.42;
        e += sin(p.x * 0.32 - t * 1.0) * sin(p.z * 0.28 + t * 0.6) * 0.10;
        p.y += e;
        vElev = e;
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uGlow;
      varying vec3 vPos;
      varying float vElev;

      void main() {
        vec3 deep = vec3(0.012, 0.045, 0.115);
        vec3 blue = vec3(0.18, 0.49, 0.96);
        vec3 cyan = vec3(0.30, 0.88, 1.0);

        float d = length(vPos.xz);

        // 立方体辉光：中心径向发光 + 波峰高亮（收紧半径，避免白池）
        float glow = exp(-d * 0.45) * uGlow;
        float crest = smoothstep(0.25, 0.85, vElev);

        // 涟漪环
        float rings = (sin(d * 1.35 - uTime * 1.1) * 0.5 + 0.5) * exp(-d * 0.35) * 0.6;

        vec3 col = deep * (0.45 + crest * 0.35);
        col += blue * glow * (0.15 + crest * 0.25);
        col += cyan * glow * glow * 0.15;
        col += cyan * rings * uGlow * 0.07;
        // 立方体在水面的反射光柱（沿 z 轴拉长的光带）
        float refl = exp(-abs(vPos.x) * 0.55) * exp(-d * 0.12) * uGlow;
        col += mix(blue, cyan, 0.55) * refl * 0.08 * (0.8 + crest * 0.6);
        // 水面星芒碎光：波峰上稀疏的亮点
        float sp = sin(vPos.x * 6.7 + uTime * 0.5)
                 + sin(vPos.z * 7.9 - uTime * 0.7)
                 + sin((vPos.x + vPos.z) * 4.3 + uTime * 0.3);
        sp = pow(clamp(sp / 3.0, 0.0, 1.0), 16.0);
        col += vec3(0.65, 0.92, 1.0) * sp * exp(-d * 0.05) * uGlow * 0.5;
        // 广域的微光与远处海平线
        col += blue * exp(-d * 0.045) * 0.015;
        col += blue * smoothstep(40.0, 110.0, d) * 0.02;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0
  mesh.renderOrder = 1

  // ---- 水面上漂浮的万点星光 ----
  const sprayCount = quality === 'high' ? 600 : 260
  const sprayGeo = new THREE.BufferGeometry()
  const sPos = new Float32Array(sprayCount * 3)
  const sSeed = new Float32Array(sprayCount)
  for (let i = 0; i < sprayCount; i++) {
    const r = 7 + Math.pow(Math.random(), 1.4) * 65
    const a = Math.random() * Math.PI * 2
    sPos[i * 3] = Math.sin(a) * r
    sPos[i * 3 + 1] = 0.15 + Math.random() * 1.2
    sPos[i * 3 + 2] = Math.cos(a) * r
    sSeed[i] = Math.random()
  }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  sprayGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1))
  const sprayMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uOpacity: uniforms.uOpacity },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      varying float vSeed;
      varying float vA;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p.y += sin(uTime * (0.25 + aSeed * 0.6) + aSeed * 40.0) * 0.18;
        float d = length(p.xz);
        vA = exp(-d * 0.028);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.2 + aSeed * 2.6) * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying float vSeed;
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.08, length(c));
        float tw = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * (0.7 + vSeed * 2.2) + vSeed * 50.0));
        vec3 col = mix(vec3(0.25, 0.6, 1.0), vec3(0.5, 0.9, 1.0), vSeed);
        gl_FragColor = vec4(col, m * tw * vA * uOpacity * 0.85);
      }
    `,
  })
  const spray = new THREE.Points(sprayGeo, sprayMat)
  spray.frustumCulled = false
  spray.renderOrder = 5

  const group = new THREE.Group()
  group.add(mesh, spray)
  return { mesh, group, uniforms }
}
