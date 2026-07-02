// WebAudio 实时合成音效：环境低鸣 + 换幕提示音，无音频文件
// 默认关闭，用户点击开关后才创建 AudioContext

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: { stop(): void } | null = null
  enabled = false

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    if (this.enabled) {
      const ctx = this.ensure()
      void ctx.resume()
      this.startAmbient()
    } else {
      this.stopAmbient()
    }
    return this.enabled
  }

  /** 环境低鸣：双失谐正弦 + 低通噪声，缓慢呼吸 */
  private startAmbient(): void {
    if (this.ambient || !this.ctx || !this.master) return
    const ctx = this.ctx
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(this.master)
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5)

    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 54
    const g1 = ctx.createGain()
    g1.gain.value = 0.05
    o1.connect(g1).connect(out)

    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = 57.3
    const g2 = ctx.createGain()
    g2.gain.value = 0.04
    o2.connect(g2).connect(out)

    // 海风噪声
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 260
    const gn = ctx.createGain()
    gn.gain.value = 0.02
    noise.connect(lp).connect(gn).connect(out)

    // 缓慢呼吸 LFO 调制滤波
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 130
    lfo.connect(lfoGain).connect(lp.frequency)

    o1.start()
    o2.start()
    noise.start()
    lfo.start()

    this.ambient = {
      stop: () => {
        out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
        setTimeout(() => {
          o1.stop(); o2.stop(); noise.stop(); lfo.stop()
          out.disconnect()
        }, 700)
      },
    }
  }

  private stopAmbient(): void {
    this.ambient?.stop()
    this.ambient = null
  }

  /** 换幕提示音：短促下滑正弦 */
  blip(pitch = 0): void {
    if (!this.enabled || !this.ctx || !this.master) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'triangle'
    const f = 620 + pitch * 60
    o.frequency.setValueAtTime(f, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(f * 0.55, ctx.currentTime + 0.16)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.06, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
    o.connect(g).connect(this.master)
    o.start()
    o.stop(ctx.currentTime + 0.22)
  }

  /** 界面交互音：轻点击 */
  tick(): void {
    if (!this.enabled || !this.ctx || !this.master) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = 1200
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.035, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07)
    o.connect(g).connect(this.master)
    o.start()
    o.stop(ctx.currentTime + 0.08)
  }
}
