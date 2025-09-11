import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SoundService } from '../sound.service';

@Component({
  selector: 'visualizer',
  template: `<canvas #cv class="viz-canvas"></canvas>`,
  styles: [`.viz-canvas{width:160px;height:36px;background:transparent}`]
})
export class VisualizerComponent implements OnInit, OnDestroy{
  @ViewChild('cv', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private raf = 0;
  private data!: Uint8Array;

  constructor(private sound: SoundService){}

  ngOnInit(){
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width = 320; const h = canvas.height = 72;
    this.data = new Uint8Array(64);
    const loop = ()=>{
      this.sound.getVisualizerData(this.data);
      ctx.clearRect(0,0,w,h);
      const barW = Math.max(2, Math.floor(w/this.data.length));
      for(let i=0;i<this.data.length;i++){
        const v = this.data[i] / 255;
        ctx.fillStyle = `rgba(${Math.round(10+200*v)},${Math.round(80+100*v)},${Math.round(255-120*v)},1)`;
        const bh = Math.max(2, Math.floor(v * h));
        ctx.fillRect(i*barW, h-bh, barW-1, bh);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  ngOnDestroy(){ cancelAnimationFrame(this.raf); }
}
