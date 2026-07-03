// 夜海：起伏的暗蓝水面 + 立方体正下方的辉光与涟漪
// 倒影：镜像相机每帧把场景渲到低分辨率纹理，海面 shader 以波浪扰动采样（Reflector 思路）

import * as THREE from 'three'

export interface Ocean {
  mesh: THREE.Mesh
  group: THREE.Group
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uGlow: { value: number }
  }
  updateReflection(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void
  reflRT: THREE.WebGLRenderTarget
}

export function createOcean(quality: 'high' | 'low'): Ocean {
  const seg = quality === 'high' ? 140 : 80
  const geo = new THREE.PlaneGeometry(260, 260, seg, seg)
  geo.rotateX(-Math.PI / 2)

  const reflRT = new THREE.WebGLRenderTarget(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512)
  const reflMatrix = new THREE.Matrix4()

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uGlow: { value: 1 },
    uReflMap: { value: reflRT.texture },
    uReflMatrix: { value: reflMatrix },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform mat4 uReflMatrix;
      varying vec3 vPos;
      varying vec4 vRefl;

      // 低频涌浪：振幅压小，平静水面的倒影才立得住
      float elev(vec2 q, float t) {
        float e = 0.0;
        e += sin(q.x * 0.14 + t * 0.50) * 0.10;
        e += sin(q.y * 0.19 + t * 0.65) * 0.08;
        e += sin((q.x + q.y) * 0.075 + t * 0.34) * 0.13;
        e += sin(q.x * 0.32 - t * 0.9) * sin(q.y * 0.28 + t * 0.55) * 0.06;
        return e;
      }

      void main() {
        vec3 p = position;
        p.y += elev(p.xz, uTime);
        vPos = p;
        // 用起伏后的顶点算投影坐标：倒影随波浪整体晃动
        vRefl = uReflMatrix * modelMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uGlow;
      uniform sampler2D uReflMap;
      varying vec3 vPos;
      varying vec4 vRefl;

      // 与顶点着色器同一波场，用于有限差分求法线
      float elev(vec2 q, float t) {
        float e = 0.0;
        e += sin(q.x * 0.14 + t * 0.50) * 0.10;
        e += sin(q.y * 0.19 + t * 0.65) * 0.08;
        e += sin((q.x + q.y) * 0.075 + t * 0.34) * 0.13;
        e += sin(q.x * 0.32 - t * 0.9) * sin(q.y * 0.28 + t * 0.55) * 0.06;
        return e;
      }

      void main() {
        vec3 deep = vec3(0.010, 0.038, 0.10);
        vec3 blue = vec3(0.18, 0.49, 0.96);

        float t = uTime;
        float d = length(vPos.xz);

        // ---- 波面法线：低频涌浪的有限差分 + 两个八度的高频微涟漪解析斜率 ----
        float eps = 0.22;
        vec2 slope = vec2(
          elev(vPos.xz + vec2(eps, 0.0), t) - elev(vPos.xz - vec2(eps, 0.0), t),
          elev(vPos.xz + vec2(0.0, eps), t) - elev(vPos.xz - vec2(0.0, eps), t)
        ) / (2.0 * eps);
        slope.x += sin(vPos.x * 1.9 + t * 1.1) * cos(vPos.z * 1.4 - t * 0.8) * 0.045
                 + sin(vPos.x * 4.1 - t * 1.7) * cos(vPos.z * 3.7 + t * 1.3) * 0.022;
        slope.y += sin(vPos.z * 2.1 - t * 0.9) * cos(vPos.x * 1.2 + t * 0.7) * 0.045
                 + sin(vPos.z * 4.5 + t * 1.5) * cos(vPos.x * 3.3 - t * 1.1) * 0.022;
        vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

        // ---- 菲涅尔：正俯视几乎不反射（水色），掠射角接近全反射 ----
        vec3 V = normalize(cameraPosition - vPos);
        float cosT = clamp(dot(n, V), 0.0, 1.0);
        float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);

        // ---- 倒影采样：法线扰动投影坐标 + 轻微纵向拖尾（波纹对细长倒影的拉伸） ----
        vec2 ruv = vRefl.xy / max(vRefl.w, 0.001);
        ruv += n.xz * 0.22;
        vec3 refl = texture2D(uReflMap, ruv).rgb * 0.5
                  + texture2D(uReflMap, ruv + vec2(0.0, 0.008)).rgb * 0.3
                  + texture2D(uReflMap, ruv + vec2(0.0, 0.020)).rgb * 0.2;

        // ---- 合成：水体基色暗沉，亮度几乎全部来自倒影本身 ----
        vec3 col = deep * (0.35 + 0.30 * cosT);
        // 立方体的光在水中的微弱散射（贴近光源，不再做大范围辉光）
        col += blue * exp(-d * 0.50) * uGlow * 0.06;
        // 镜面倒影：菲涅尔调制 × 距离包络（倒影集中在立方体周围一片，远场沉回水色）；
        // 二次项轻微抬高光核镜像（补偿倒影通道无 bloom）
        float reach = exp(-d * 0.045);
        col += refl * fres * reach * 1.2;
        col += refl * refl * fres * reach * 0.7;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0
  // 必须晚于地形（renderOrder 1）绘制：地形中心区在 y=-0.4，若后画会以 alpha=1 整面盖掉水面；
  // 山体高于水面的部分由深度测试正确遮挡（地形写深度）
  mesh.renderOrder = 2

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
        gl_FragColor = vec4(col, m * tw * vA * uOpacity * 0.45);
      }
    `,
  })
  const spray = new THREE.Points(sprayGeo, sprayMat)
  spray.frustumCulled = false
  spray.renderOrder = 5

  const group = new THREE.Group()
  group.add(mesh, spray)

  // ---- 平面反射：绕 y=0 镜像主相机，把场景（除水面自身）渲到 reflRT ----
  const mirrorCam = new THREE.PerspectiveCamera()
  const ndcToUv = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1,
  )
  const dir = new THREE.Vector3()
  const target = new THREE.Vector3()
  const clipPlane = new THREE.Vector4()
  const qv = new THREE.Vector4()
  const waterPlane = new THREE.Plane()

  function updateReflection(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): void {
    if (!group.visible || uniforms.uOpacity.value <= 0.01) return
    if (camera.position.y <= 0.05) return // 相机贴到水面以下时无镜像意义

    // 相机位置 / 视点 / up 向量全部对 y=0 平面取镜像
    mirrorCam.position.copy(camera.position)
    mirrorCam.position.y *= -1
    camera.getWorldDirection(dir)
    target.copy(camera.position).add(dir)
    target.y *= -1
    mirrorCam.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    mirrorCam.up.y *= -1
    mirrorCam.lookAt(target)
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix)
    mirrorCam.updateMatrixWorld()

    // 斜近裁剪面：把投影矩阵的近平面折到水面，裁掉水下几何，防止穿帮
    waterPlane.set(new THREE.Vector3(0, 1, 0), 0).applyMatrix4(mirrorCam.matrixWorldInverse)
    clipPlane.set(waterPlane.normal.x, waterPlane.normal.y, waterPlane.normal.z, waterPlane.constant)
    const pm = mirrorCam.projectionMatrix.elements
    qv.x = (Math.sign(clipPlane.x) + pm[8]) / pm[0]
    qv.y = (Math.sign(clipPlane.y) + pm[9]) / pm[5]
    qv.z = -1
    qv.w = (1 + pm[10]) / pm[14]
    clipPlane.multiplyScalar(2 / clipPlane.dot(qv))
    pm[2] = clipPlane.x
    pm[6] = clipPlane.y
    pm[10] = clipPlane.z + 1 - 0.003 // clipBias：留一点余量避免水面缝隙闪烁
    pm[14] = clipPlane.w

    // NDC → 纹理坐标（shader 里再乘 modelMatrix）
    reflMatrix.copy(ndcToUv).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse)

    const prevRT = renderer.getRenderTarget()
    group.visible = false // 别把水面自己渲进倒影
    renderer.setRenderTarget(reflRT)
    renderer.render(scene, mirrorCam)
    renderer.setRenderTarget(prevRT)
    group.visible = true
  }

  return { mesh, group, uniforms, updateReflection, reflRT }
}
