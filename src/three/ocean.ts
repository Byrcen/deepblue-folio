// 夜海：起伏的暗蓝水面 + 立方体正下方的辉光与涟漪

import * as THREE from 'three'

export interface Ocean {
  mesh: THREE.Mesh
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
        e += sin(p.x * 0.14 + t * 0.9) * 0.34;
        e += sin(p.z * 0.19 + t * 1.25) * 0.26;
        e += sin((p.x + p.z) * 0.075 + t * 0.6) * 0.45;
        e += sin(p.x * 0.32 - t * 1.6) * sin(p.z * 0.28 + t) * 0.12;
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

        // 立方体辉光：中心径向发光 + 波峰高亮
        float glow = exp(-d * 0.30) * uGlow;
        float crest = smoothstep(0.25, 0.85, vElev);

        // 涟漪环
        float rings = (sin(d * 1.35 - uTime * 1.8) * 0.5 + 0.5) * exp(-d * 0.30) * 0.6;

        vec3 col = deep * (0.7 + crest * 0.5);
        col += blue * glow * (0.30 + crest * 0.35);
        col += cyan * glow * glow * 0.45;
        col += cyan * rings * uGlow * 0.16;
        // 广域的微光与远处海平线
        col += blue * exp(-d * 0.045) * 0.05;
        col += blue * smoothstep(40.0, 110.0, d) * 0.03;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0
  mesh.renderOrder = 1
  return { mesh, uniforms }
}
