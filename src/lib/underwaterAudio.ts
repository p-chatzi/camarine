// Synthesised underwater ambience (filtered noise + random sonar pings) via the Web Audio API.
export class UnderwaterAudioEngine {
  ctx: AudioContext | null;
  isPlaying: boolean;
  masterGain: GainNode | null;
  pingInterval: ReturnType<typeof setInterval> | null;
  whiteNoise: AudioBufferSourceNode | undefined;
  lfo: OscillatorNode | undefined;
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.pingInterval = null;
  }

  start() {
    if (this.isPlaying) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.5);
      this.masterGain.connect(this.ctx.destination);

      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.5;
      }

      this.whiteNoise = this.ctx.createBufferSource();
      this.whiteNoise.buffer = noiseBuffer;
      this.whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.14;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 70;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.whiteNoise.connect(filter);
      filter.connect(this.masterGain);

      this.whiteNoise.start(0);
      lfo.start(0);
      this.lfo = lfo;

      this.pingInterval = setInterval(() => {
        const masterGain = this.masterGain;
        if (!this.ctx || !this.isPlaying || !masterGain) return;

        const osc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        const freqs = [396, 528, 639, 432];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[Math.floor(Math.random() * freqs.length)], this.ctx.currentTime);

        pingGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        pingGain.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 0.4);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.2);

        osc.connect(pingGain);
        pingGain.connect(masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 3.3);
      }, 5500);

      this.isPlaying = true;
    } catch (e) {
      console.warn('Web Audio API non supportée ou bloquée:', e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {
      console.warn(e);
    }
    this.isPlaying = false;
  }
}
