// 天空穹顶：地平线亮、天顶深的柔和渐变，替代纯色背景

import * as THREE from 'three'

export function createSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(320, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        // 地平线附近的深蓝微光 → 天顶近黑
        vec3 horizon = vec3(0.010, 0.026, 0.075);
        vec3 zenith = vec3(0.002, 0.004, 0.013);
        vec3 col = mix(horizon, zenith, pow(h, 0.6));
        // 正前方（立方体方向）地平线的一抹光晕
        float glow = exp(-abs(vDir.y) * 9.0) * exp(-abs(vDir.x) * 3.5);
        col += vec3(0.04, 0.12, 0.26) * glow * 0.3;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  return mesh
}
