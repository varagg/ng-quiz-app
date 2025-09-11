import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private muted = false;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private volume = 0.8;

  constructor(){
    try{ this.muted = localStorage.getItem('quiz_muted') === 'true'; }catch(e){}
  try{ const v = parseFloat(localStorage.getItem('quiz_volume') || ''); if(!isNaN(v)) this.volume = v; }catch(e){}
  }

  isMuted(){ return this.muted; }

  toggleMute(state?: boolean){
    if(typeof state === 'boolean') this.muted = state;
    else this.muted = !this.muted;
    try{ localStorage.setItem('quiz_muted', String(this.muted)); }catch(e){}
  }

  setVolume(v: number){
    this.volume = Math.max(0, Math.min(1, v));
    try{ localStorage.setItem('quiz_volume', String(this.volume)); }catch(e){}
  }

  getVolume(){ return this.volume; }

  private getCtx(){
    try{
      if(!this.ctx){ this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      // ensure analyser is connected
      if(this.ctx && !this.analyser){
        try{
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 256;
          this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          // connect analyser to destination via a silent gain
          const g = this.ctx.createGain(); g.gain.value = 0; this.analyser.connect(g); g.connect(this.ctx.destination);
        }catch(e){}
      }
      return this.ctx;
    }catch(e){ return null; }
  }

  // play a richer tone with an envelope
  tone(opts: { freq?: number, duration?: number, type?: OscillatorType, detune?: number } = {}){
    if(this.muted) return;
    const { freq = 440, duration = 160, type = 'sine', detune = 0 } = opts;
    const C = this.getCtx(); if(!C) return;
    try{
      const o = C.createOscillator(); const g = C.createGain();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      // ADSR-ish envelope
      const now = C.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(this.volume * 0.12, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration/1000);
      // connect to analyser if present
      if(this.analyser){ o.connect(this.analyser); this.analyser.connect(g); } else { o.connect(g); }
      g.connect(C.destination);
      o.start(now);
      setTimeout(()=>{ try{ o.stop(); g.disconnect(); o.disconnect(); }catch(e){} }, duration + 20);
    }catch(e){}
  }

  success(){ this.tone({ freq: 880, duration: 220, type: 'sine' }); }
  smallSuccess(){ this.tone({ freq: 660, duration: 140, type: 'triangle' }); }
  fail(){ this.tone({ freq: 240, duration: 260, type: 'sawtooth', detune: -20 }); }
  // action-specific sounds
  chooseCorrect(){ this.tone({ freq: 992, duration: 100, type: 'sine' }); }
  chooseWrong(){ this.tone({ freq: 220, duration: 120, type: 'sawtooth' }); }
  skip(){ this.tone({ freq: 320, duration: 90, type: 'triangle' }); }
  next(){ this.tone({ freq: 520, duration: 80, type: 'square' }); }

  // Visualizer API: fill provided array with frequency data; returns length or 0
  getVisualizerData(targetArray?: Uint8Array){
    if(!this.analyser || !this.dataArray) return 0;
  this.analyser.getByteFrequencyData(this.dataArray as any);
    if(targetArray){ targetArray.set(this.dataArray.subarray(0, Math.min(targetArray.length, this.dataArray.length))); }
    return this.dataArray.length;
  }

  // trigger a short UI pulse on a CSS selector; returns true if element found
  pulseSelector(selector: string){
    try{
      const el = document.querySelector(selector) as HTMLElement | null;
      if(!el) return false;
      el.classList.remove('sound-pulse');
      // force reflow
      void el.offsetWidth;
      el.classList.add('sound-pulse');
  // cleanup after animation (short to avoid leaving timers in tests)
  const prev = (el as any).__pulseTid as number | undefined;
  if(prev) clearTimeout(prev);
  const tid = setTimeout(()=>{ try{ el.classList.remove('sound-pulse'); }catch(e){} }, 80) as unknown as number;
  (el as any).__pulseTid = tid;
      return true;
    }catch(e){return false}
  }
}
