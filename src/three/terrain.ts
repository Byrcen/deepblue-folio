// 两侧山体 / 沙丘：CPU 噪声置换的暗色地形 + 青色轮廓辉光
// 附带第五幕的「光缝」：沿地形蜿蜒生长的发光路径

import * as THREE from 'three'

function hashNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.8 + Math.sin(z * 0.6)) * 0.5 +
    Math.sin(z * 0.9 + Math.sin(x * 0.5) * 1.7) * 0.35 +
    Math.sin((x + z) * 0.45) * 0.15
  )
}

/** 地形高度函数（world xz），光缝与相机路径共用 */
export function heightAt(x: number, z: number): number {
  const side = THREE.MathUtils.smoothstep(Math.abs(x), 11, 42)
  const base = side * 13
  const n = 0.62 + 0.38 * hashNoise(x * 0.11, z * 0.1)
  const back = THREE.MathUtils.smoothstep(-z, 34, 70) * 5 // 远处地平线隆起
  return base * n + back * (0.5 + 0.5 * n)
}

export interface Terrain {
  group: THREE.Group
  uniforms: {
    uRim: { value: number }
    uOpacity: { value: number }
  }
  seamUniforms: {
    uTime: { value: number }
    uProgress: { value: number }
    uOpacity: { value: number }
  }
}

export function createTerrain(quality: 'high' | 'low'): Terrain {
  const group = new THREE.Group()
  const seg = quality === 'high' ? 150 : 80

  const geo = new THREE.PlaneGeometry(220, 160, seg, Math.floor(seg * 0.6))
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, heightAt(x, z) - 0.4)
  }
  geo.computeVertexNormals()

  const uniforms = {
    uRim: { value: 0.55 },
    uOpacity: { value: 1 },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uRim;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 base = vec3(0.012, 0.03, 0.075);
        vec3 cyan = vec3(0.30, 0.88, 1.0);
        vec3 blue = vec3(0.18, 0.49, 0.96);

        vec3 nrm = normalize(vNormal);
        vec3 v = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - max(dot(nrm, v), 0.0), 4.0);
        float h = smoothstep(0.5, 10.0, vWorld.y);
        float dist = length(cameraPosition - vWorld);
        float fade = exp(-dist * 0.012);

        // 中心光源（立方体）照亮内侧山坡：水线附近最亮，向上渐暗
        vec3 L = normalize(vec3(0.0, 2.0, 0.0) - vWorld);
        float facing = max(dot(nrm, L), 0.0);
        float att = exp(-length(vWorld.xz) * 0.06);
        float shore = smoothstep(8.0, 0.0, vWorld.y);
        float slope = clamp((1.0 - nrm.y) * 2.5, 0.0, 1.0); // 只照亮坡面，平地不发光

        vec3 col = base * (0.3 + h * 0.4);
        col += mix(blue, cyan, 0.45) * facing * att * slope * (0.25 + shore * 0.8) * uRim;
        col += blue * rim * uRim * 0.10 * (0.3 + h);
        col += cyan * rim * rim * rim * uRim * 0.22;
        col *= (0.35 + 0.65 * fade);

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })

  const terrainMesh = new THREE.Mesh(geo, mat)
  terrainMesh.renderOrder = 1
  group.add(terrainMesh)

  // ---- 光缝（第五幕的履历轨迹） ----
  const seamPts: THREE.Vector3[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const z = 4 - t * 46
    const x = Math.sin(t * Math.PI * 2.2) * (6 + t * 10) - 2
    seamPts.push(new THREE.Vector3(x, heightAt(x, z) + 0.25, z))
  }
  const seamCurve = new THREE.CatmullRomCurve3(seamPts)
  const seamGeo = new THREE.TubeGeometry(seamCurve, 240, 0.09, 6, false)
  // TubeGeometry 的 uv.x 即沿管方向 0..1
  const seamUniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
  }
  const seamMat = new THREE.ShaderMaterial({
    uniforms: seamUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying float vT;
      void main() {
        vT = uv.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      varying float vT;

      void main() {
        if (vT > uProgress) discard;
        vec3 cyan = vec3(0.35, 0.9, 1.0);
        vec3 white = vec3(0.9, 0.98, 1.0);
        // 生长前端的亮头
        float head = smoothstep(uProgress - 0.07, uProgress, vT);
        // 沿线流动的能量脉冲
        float pulse = 0.55 + 0.45 * sin(vT * 60.0 - uTime * 4.0);
        vec3 col = mix(cyan, white, head) * (1.1 + head * 2.0) * pulse;
        gl_FragColor = vec4(col, uOpacity * (0.65 + head * 0.35));
      }
    `,
  })
  const seamMesh = new THREE.Mesh(seamGeo, seamMat)
  seamMesh.renderOrder = 6 // 置于地形与海面之后，避免被 alpha=1 的透明面盖掉
  group.add(seamMesh)

  return { group, uniforms, seamUniforms }
}
