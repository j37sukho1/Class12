export class AudioSynther {
  private ctx: AudioContext | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private isBgmPlaying = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBGM() {
    if (!this.ctx || this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    
    // Very simple plinky BGM logic using scheduling
    const playNote = (freq: number, timeOffset: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + timeOffset);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + timeOffset + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + timeOffset);
      osc.stop(this.ctx.currentTime + timeOffset + duration);
    };

    // looping interval for simple 8-bit tune
    const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    let noteIdx = 0;
    
    // We use a setInterval to schedule notes ahead. 
    // In a real game, Web Audio API scheduling is better, but this is simple.
    (window as any).bgmInterval = setInterval(() => {
      if (!this.isBgmPlaying) {
        clearInterval((window as any).bgmInterval);
        return;
      }
      playNote(melody[noteIdx % melody.length], 0, 0.2);
      noteIdx++;
    }, 250);
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if ((window as any).bgmInterval) {
      clearInterval((window as any).bgmInterval);
    }
  }

  playEat() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playBomb() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}
