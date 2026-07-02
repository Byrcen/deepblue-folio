// 发光核心体：27 体素组成的立方体（InstancedMesh）
// 第二幕裂解为绕核心旋转的碎块，并向水面倾泻光瀑粒子

import * as THREE from 'three'

export interface Cube {
  group: THREE.Group
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uEnergy: { value: number }
  }
  fallUniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
  }
  state: { explode: number }
  update(t: number): void
}

const COUNT = 27
const SPACING = 0.82

export function createCube(quality: 'high' | 'low'): Cube {
  const group = new THREE.Group()
  group.position.set(0, 1.9, 0)

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uEnergy: { value: 1 },
  }

  const geo = new THREE.BoxGeometry(0.76, 0.76, 0.76)
  const seeds = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) seeds[i] = Math.random()
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying float vSeed;

      void main() {
        vUv = uv;
        vSeed = aSeed;
        vec4 ip = instanceMatrix * vec4(position, 1.0);
        vec4 w = modelMatrix * ip;
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uEnergy;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying float vSeed;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec3 deep = vec3(0.03, 0.09, 0.22);
        vec3 blue = vec3(0.18, 0.49, 0.96);
        vec3 cyan = vec3(0.30, 0.88, 1.0);

        // 面上流动的能量噪声（电路感）
        float n = noise(vUv * 2.0 + vSeed * 17.0 + uTime * 0.22);
        n += noise(vUv * 5.0 - uTime * 0.13) * 0.45;
        float energy = smoothstep(0.5, 1.3, n) * uEnergy;

        // 呼吸脉冲
        float pulse = 0.75 + 0.25 * sin(uTime * 1.4 + vSeed * 6.28);

        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(normalize(vNormal), v), 0.0), 2.2);

        vec3 col = deep;
        col += mix(blue, cyan, n) * energy * 0.5 * pulse;
        col += cyan * fres * 0.45 * uEnergy;
        col += blue * 0.14;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })

  const voxels = new THREE.InstancedMesh(geo, mat, COUNT)
  voxels.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  voxels.renderOrder = 2
  group.add(voxels)

  // 组装态的外轮廓线
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x4de1ff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.5, 2.5, 2.5)), edgeMat)
  group.add(edges)

  // ---- 光瀑粒子（第二幕，世界坐标独立于自转） ----
  const fallCount = quality === 'high' ? 700 : 320
  const fallGeo = new THREE.BufferGeometry()
  const fPos = new Float32Array(fallCount * 3) // 占位，真实位置在顶点着色器算
  const fSeed = new Float32Array(fallCount * 3) // x偏移种子 / z偏移种子 / 相位
  for (let i = 0; i < fallCount; i++) {
    fSeed[i * 3] = Math.random() * 2 - 1
    fSeed[i * 3 + 1] = Math.random() * 2 - 1
    fSeed[i * 3 + 2] = Math.random()
  }
  fallGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
  fallGeo.setAttribute('aSeed', new THREE.BufferAttribute(fSeed, 3))

  const fallUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
  }
  const fallMat = new THREE.ShaderMaterial({
    uniforms: fallUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime;
      varying float vProg;

      void main() {
        float prog = fract(aSeed.z + uTime * 0.30);
        vProg = prog;
        float spread = mix(0.35, 1.3, prog * prog);
        vec3 p = vec3(aSeed.x * spread, mix(1.9, -0.15, prog), aSeed.y * spread);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = mix(5.0, 2.0, prog) * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vProg;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.1, length(c));
        vec3 col = mix(vec3(0.85, 0.97, 1.0), vec3(0.25, 0.6, 1.0), vProg);
        gl_FragColor = vec4(col, m * (1.0 - vProg * 0.55) * uOpacity);
      }
    `,
  })
  const fall = new THREE.Points(fallGeo, fallMat)
  fall.frustumCulled = false
  fall.renderOrder = 5

  const state = { explode: 0 }
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const v3 = new THREE.Vector3()
  const s3 = new THREE.Vector3()

  // 体素网格偏移
  const offsets: THREE.Vector3[] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) offsets.push(new THREE.Vector3(x, y, z))

  function update(t: number): void {
    const ex = state.explode
    group.position.y = 2.25 + Math.sin(t * 0.8) * 0.12
    group.rotation.y = t * 0.12 + ex * 1.4
    edgeMat.opacity = 0.4 * (1 - ex) * uniforms.uOpacity.value

    for (let i = 0; i < COUNT; i++) {
      const o = offsets[i]
      const seed = seeds[i]
      const dist = ex * (1.6 + seed * 3.0)
      const len = o.length() || 1
      v3.set(
        o.x * SPACING + (o.x / len) * dist,
        o.y * SPACING + (o.y / len) * dist + ex * Math.sin(t * 1.2 + seed * 9.0) * 0.25,
        o.z * SPACING + (o.z / len) * dist,
      )
      e.set(ex * seed * 5 + ex * t * (0.2 + seed * 0.4), ex * seed * 7, ex * seed * 3)
      q.setFromEuler(e)
      const sc = 1 - ex * (0.2 + seed * 0.25)
      s3.setScalar(sc)
      m4.compose(v3, q, s3)
      voxels.setMatrixAt(i, m4)
    }
    voxels.instanceMatrix.needsUpdate = true
  }
  update(0)

  const holder = new THREE.Group()
  holder.add(group)
  holder.add(fall)

  return { group: holder, uniforms, fallUniforms, state, update }
}
