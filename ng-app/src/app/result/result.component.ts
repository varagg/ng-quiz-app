import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';
import { SoundService } from '../sound.service';

@Component({
  selector: 'result',
  template: `
    <div class="result-root">
      <div class="celebrate" *ngIf="stats?.newBest">
        <canvas #confettiCanvas class="confetti-canvas" width="600" height="120"></canvas>
        <svg class="confetti-svg" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
          <g class="confetti-pieces">
            <rect class="confetti-piece p1" x="100" y="20" width="8" height="14" fill="#06b6d4" />
            <rect class="confetti-piece p2" x="220" y="10" width="6" height="12" fill="#0b5cff" />
            <rect class="confetti-piece p3" x="320" y="8" width="7" height="13" fill="#10b981" />
            <rect class="confetti-piece p4" x="420" y="18" width="6" height="11" fill="#ef4444" />
            <rect class="confetti-piece p5" x="520" y="12" width="9" height="15" fill="#f59e0b" />
          </g>
        </svg>
        <div class="celebrate-text">New Personal Best! <span class="trophy">🏆</span></div>
      </div>
      <h2>Well played, {{ stats?.name || 'Player' }}!</h2>
      <p>You answered <strong>{{ stats?.correct }}</strong> out of <strong>{{ stats?.total }}</strong>.</p>
      <p>Score: <strong>{{ stats?.percentage }}%</strong></p>
      <p *ngIf="stats?.best">
        <ng-container *ngIf="stats?.newBest; else notBest">
          Best: <strong>{{ stats?.best.percentage }}%</strong> on {{ stats?.best.time | date:'short' }}
        </ng-container>
        <ng-template #notBest>
          <span class="muted">Not your best —</span>
          Best: <strong>{{ stats?.best.percentage }}%</strong> on {{ stats?.best.time | date:'short' }}.
          <br />Your score: <strong>{{ stats?.percentage }}%</strong>. Would you like to try again?
        </ng-template>
      </p>

      <div class="leaderboard" *ngIf="leaderboard?.length">
        <h4>Leaderboard</h4>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <small class="muted">Top players</small>
          <button class="btn" (click)="exportLeaderboard()">Export CSV</button>
        </div>
        <ul class="lb-list">
          <li *ngFor="let p of leaderboard; let idx = index" class="lb-item" [class.me]="p.name===stats?.name">
            <div class="lb-rank">{{ idx+1 }}</div>
            <div class="lb-name">{{ p.name }} <small *ngIf="p.time" class="muted">· {{ p.time | date:'short' }}</small></div>
            <div class="lb-score">{{ p.percentage }}%</div>
          </li>
        </ul>
      </div>

      <!-- Remote leaderboard viewer (when a remote API is configured) -->
      <div *ngIf="remoteAvailable" class="leaderboard remote" style="margin-top:14px">
        <h4>Remote Leaderboard</h4>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <small class="muted">All submissions (remote)</small>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn" (click)="loadRemoteLeaderboard(1)" [disabled]="remoteLoading">Refresh</button>
            <button class="btn ghost" (click)="toggleRemoteView()">{{ showRemote ? 'Hide' : 'Show' }}</button>
          </div>
        </div>

        <div *ngIf="remoteLoading" class="muted">Loading remote leaderboard…</div>

        <div *ngIf="showRemote">
          <ul class="lb-list">
            <li *ngFor="let p of pagedRemote" class="lb-item" [class.me]="p.name===stats?.name">
              <div class="lb-rank">{{ p.rank }}</div>
              <div class="lb-name">{{ p.name }} <small *ngIf="p.time" class="muted">· {{ p.time | date:'short' }}</small></div>
              <div class="lb-score">{{ p.percentage }}%</div>
            </li>
          </ul>

          <div class="pagination" style="display:flex;justify-content:center;gap:8px;margin-top:8px;align-items:center">
            <button class="btn ghost" (click)="prevRemote()" [disabled]="remotePage<=1">Prev</button>
            <span>Page {{remotePage}} / {{ remoteTotalPages || 1 }}</span>
            <button class="btn ghost" (click)="nextRemote()" [disabled]="remotePage>= (remoteTotalPages || 1)">Next</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" (click)="onReset.emit()">Try again</button>
        <button class="btn ghost" (click)="promptClearLeaderboard()" title="Remove all saved leaderboard entries">Clear leaderboard</button>
      </div>

      <div *ngIf="showUndo" class="undo-banner" role="status" aria-live="polite">
        Leaderboard cleared.
        <button class="btn ghost" (click)="undoClearLeaderboard()">Undo</button>
      </div>

      <!-- Accessible modal confirmation -->
      <div *ngIf="showConfirm" class="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <div class="confirm-modal" role="document">
          <h3 id="confirmTitle">Clear leaderboard?</h3>
          <p>Are you sure you want to permanently remove saved top scores? You will have <strong>{{undoWindowSeconds}}</strong> seconds to undo after confirming.</p>
          <div class="confirm-actions">
            <button class="btn ghost" (click)="showConfirm=false">Cancel</button>
            <button class="btn" (click)="confirmClearLeaderboard()">Yes, clear</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResultComponent implements OnInit, AfterViewInit{
  @Input() stats: any;
  @Output() onReset = new EventEmitter<void>();

  leaderboard: Array<{ name: string, percentage: number, time: number }> = [];
  showConfirm = false;
  showUndo = false;
  undoWindowSeconds = 8;
  private _removedBackup: { [k: string]: string } = {};
  private _undoTimeout: any = null;
  // remote leaderboard viewer
  remoteAvailable = false;
  remoteLoading = false;
  remoteAll: Array<any> = [];
  pagedRemote: Array<any> = [];
  remotePage = 1;
  remotePageSize = 8;
  remoteTotalPages = 1;
  showRemote = false;

  constructor(private sound: SoundService){}

  ngOnInit(){
    this.loadLeaderboard();
    // optionally submit to remote server for centralized leaderboard
    try{
      let remoteApi = localStorage.getItem('quiz_remote_api') || (window as any).__REMOTE_API || '';
      // If no explicit remote API is configured, default to the page origin so the SPA served by the server
      // will post back to the same host (useful when visitors open the public/ngrok URL).
      try{ if(!remoteApi && typeof location !== 'undefined' && location.origin) remoteApi = location.origin; }catch(e){}
      if(remoteApi && this.stats){
        const base = (remoteApi + '').replace(/\/$/, '');
        // fire-and-forget post
        fetch((base + '/api/submit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.stats.name, percentage: this.stats.percentage, correct: this.stats.correct, total: this.stats.total, via: 'remote' })
        }).catch(e=> console.warn('remote submit failed', e));
        // also refresh remote leaderboard list if desired
  fetch((base + '/api/leaderboard?remoteOnly=1')).then(r=>r.json()).then((data)=>{
          try{ if(Array.isArray(data)) this.leaderboard = data.slice(0,6); }catch(e){}
        }).catch(()=>{});
      }
    }catch(e){}

    // check remote availability without failing
    try{
  const remoteApiFlag = localStorage.getItem('quiz_remote_api') || (window as any).__REMOTE_API || '';
  // consider served origin as available too
  this.remoteAvailable = !!(remoteApiFlag || (typeof location !== 'undefined' && location.origin));
      if(this.remoteAvailable){
        // preload first page silently
        this.loadRemoteLeaderboard(1);
      }
    }catch(e){}
  }

  loadLeaderboard(){
    try{
      const list: any = [];
      for(const k in localStorage){
        if(k && k.indexOf && k.indexOf('quiz_best_')===0){
          try{
            const val = JSON.parse(localStorage.getItem(k) || 'null');
            if(val && typeof val.percentage === 'number'){
              const name = k.replace('quiz_best_','');
              list.push({ name, percentage: val.percentage, time: val.time });
            }
          }catch(e){}
        }
      }
      list.sort((a:any,b:any)=>b.percentage - a.percentage || a.time - b.time);
      this.leaderboard = list.slice(0,6);
    }catch(e){ console.warn('leaderboard read failed', e); }
  }

  exportLeaderboard(){
    try{
      const rows = [['rank','name','percentage','time']];
      this.leaderboard.forEach((p,idx)=>rows.push([String(idx+1), p.name, String(p.percentage), new Date(p.time).toISOString()]));
      const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'leaderboard.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }catch(e){ console.warn(e); }
  }

  // Play a simple canvas confetti animation when new best
  ngAfterViewInit(){
    try{
      if(this.stats){
        // small sound for finish
        if(this.stats.newBest) this.sound.success(); else this.sound.smallSuccess();
        // vibrate if supported
        try{ if(navigator && (navigator as any).vibrate) (navigator as any).vibrate(180); }catch(e){}

  if(this.stats && this.stats.newBest){
          const cvs: any = document.querySelector('.confetti-canvas');
          if(cvs){
            import('canvas-confetti').then(module => {
              const confetti = module.default || module;
              const myConfetti = confetti.create(cvs, { resize: true, useWorker: true });
              // richer multi-burst sequence
              myConfetti({ particleCount: 140, spread: 160, origin: { x: 0.5, y: 0.6 }, scalar: 1.1 });
              setTimeout(()=> myConfetti({ particleCount: 90, spread: 120, origin: { x: 0.2, y: 0.4 } }), 300);
              setTimeout(()=> myConfetti({ particleCount: 90, spread: 120, origin: { x: 0.8, y: 0.4 } }), 600);
            }).catch(err=>{ console.warn('confetti load failed', err); });
          }
          // pulse celebration text
          this.sound.pulseSelector('.celebrate-text');
          // trigger SVG confetti animation class briefly
          const svg = document.querySelector('.confetti-svg');
          if(svg){ svg.classList.add('animate'); setTimeout(()=> svg.classList.remove('animate'), 900); }
        }
      }
    }catch(e){}
  }

  promptClearLeaderboard(){
    this.showConfirm = true;
  }

  confirmClearLeaderboard(){
    try{
      // backup values so undo is possible
      this._removedBackup = {};
      const toRemove: string[] = [];
      for(const k in localStorage){
        if(k && k.indexOf && k.indexOf('quiz_best_')===0){
          const v = localStorage.getItem(k);
          if(v != null) this._removedBackup[k] = v;
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      this.leaderboard = [];
      this.showConfirm = false;
      this.showUndo = true;
      if(this._undoTimeout) clearTimeout(this._undoTimeout);
      this._undoTimeout = setTimeout(()=>{
        this._removedBackup = {};
        this.showUndo = false;
        this._undoTimeout = null;
      }, this.undoWindowSeconds * 1000);
    }catch(e){ console.warn('clear leaderboard failed', e); }
  }

  undoClearLeaderboard(){
    try{
      for(const k in this._removedBackup){
        try{ localStorage.setItem(k, this._removedBackup[k]); }catch(e){}
      }
      this._removedBackup = {};
      if(this._undoTimeout) { clearTimeout(this._undoTimeout); this._undoTimeout = null; }
      this.showUndo = false;
      this.loadLeaderboard();
    }catch(e){ console.warn('undo failed', e); }
  }

  // Remote leaderboard helpers
  async loadRemoteLeaderboard(page = 1){
    try{
      const remoteApi = localStorage.getItem('quiz_remote_api') || (window as any).__REMOTE_API || '';
      if(!remoteApi) { this.remoteAvailable = false; return; }
      this.remoteLoading = true;
      const base = remoteApi.replace(/\/$/, '');
      const resp = await fetch(base + '/api/leaderboard');
      const data = await resp.json();
      if(Array.isArray(data)){
        // annotate with rank and time
        this.remoteAll = data.map((p:any, idx:number)=>({ rank: idx+1, name: p.name, percentage: p.percentage, time: p.time }));
        this.remoteTotalPages = Math.max(1, Math.ceil(this.remoteAll.length / this.remotePageSize));
        this.remotePage = Math.min(Math.max(1, page), this.remoteTotalPages);
        const start = (this.remotePage - 1) * this.remotePageSize;
        this.pagedRemote = this.remoteAll.slice(start, start + this.remotePageSize);
      }
    }catch(e){ console.warn('remote load failed', e); }
    finally{ this.remoteLoading = false; }
  }

  nextRemote(){ if(this.remotePage < this.remoteTotalPages){ this.loadRemoteLeaderboard(this.remotePage+1); } }
  prevRemote(){ if(this.remotePage > 1){ this.loadRemoteLeaderboard(this.remotePage-1); } }
  toggleRemoteView(){ this.showRemote = !this.showRemote; if(this.showRemote && !this.remoteAll.length) this.loadRemoteLeaderboard(1); }

  // removed internal confetti; using canvas-confetti instead
}
