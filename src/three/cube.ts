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
const SPACING = 0.8
const VOXEL = 0.785 // 缝隙极窄，组装态读作一整块冰体

export function createCube(quality: 'high' | 'low'): Cube {
  const group = new THREE.Group()
  group.position.set(0, 1.9, 0)

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uEnergy: { value: 1 },
  }

  const geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL)
  const seeds = new Float32Array(COUNT)
  const offs = new Float32Array(COUNT * 3) // 体素在整块立方体中的原位（-1..1），供着色器做整体光照
  {
    let i = 0
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          seeds[i] = Math.random()
          offs[i * 3] = x
          offs[i * 3 + 1] = y
          offs[i * 3 + 2] = z
          i++
        }
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  geo.setAttribute('aHome', new THREE.InstancedBufferAttribute(offs, 3))

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute vec3 aHome;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying vec3 vLocal;
      varying float vSeed;

      void main() {
        vSeed = aSeed;
        // 组装态下顶点在整块立方体中的归一化坐标（约 -1..1）
        vLocal = (aHome * ${SPACING.toFixed(2)} + position) / 1.25;
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
      varying vec3 vLocal;
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
        vec3 deep = vec3(0.02, 0.09, 0.28);
        vec3 blue = vec3(0.09, 0.42, 1.0);
        vec3 cyan = vec3(0.35, 0.85, 1.0);
        vec3 white = vec3(0.85, 0.96, 1.0);

        vec3 n = normalize(vNormal);
        vec3 v = normalize(cameraPosition - vWorld);

        // 内部光核：由整块立方体中心向外柔和辐射
        float core = 1.0 - clamp(length(vLocal) * 0.55, 0.0, 1.0);
        core = pow(core, 1.4);

        // 极缓慢流动的内部能量（低频、细腻）
        float e = noise(vLocal.xy * 1.7 + uTime * 0.05) * 0.6
                + noise(vLocal.zy * 2.2 - uTime * 0.04) * 0.4;
        float energy = (0.65 + 0.45 * e) * uEnergy;

        // 内部光把顶面与受光侧「照透」，底部留深
        float top = clamp(n.y, 0.0, 1.0);
        float side = clamp(n.x * 0.6 + n.z * 0.4, 0.0, 1.0);
        float vert = smoothstep(-1.4, 1.1, vLocal.y); // 面上自下而上渐亮

        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);

        vec3 col = deep;
        col += mix(blue, cyan, core * 0.5 + vert * 0.5) * (core * 0.9 + vert * 0.5) * energy;
        col += white * pow(core, 4.0) * 0.35 * energy;
        col += cyan * top * 0.35 * energy;
        col += cyan * side * 0.2 * energy;
        col += blue * 0.1;
        col += cyan * fres * 0.4;

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
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.42, 2.42, 2.42)), edgeMat)
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
    group.position.y = 2.25 + Math.sin(t * 0.5) * 0.1
    group.rotation.y = t * 0.06 + ex * 1.4
    edgeMat.opacity = 0.14 * (1 - ex) * uniforms.uOpacity.value

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
