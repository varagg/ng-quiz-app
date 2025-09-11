import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { SoundService } from './sound.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app" [class.dark]="isDark">
      <header class="app-header">
        <div class="brand">
          <h1>Quiz Management Application</h1>
        </div>
        <div class="theme-toggle">
          <span class="icon cloud" aria-hidden="true">☁️</span>
          <label class="switch" aria-label="Toggle dark theme">
            <input type="checkbox" [checked]="isDark" (change)="toggle($event.target.checked)" [attr.aria-checked]="isDark" />
            <span class="slider" role="switch" aria-hidden="true"></span>
          </label>
          <span class="icon moon" aria-hidden="true">🌙</span>
          <button class="mute-btn" aria-label="Toggle sound" (click)="toggleMute()" [attr.aria-pressed]="sound.isMuted()">
            <span *ngIf="sound.isMuted()">🔇</span>
            <span *ngIf="!sound.isMuted()">🔊</span>
          </button>
          <button class="mute-btn" aria-label="Open settings" (click)="showSettings = !showSettings">⚙️</button>
        </div>
      </header>

      <div *ngIf="showSettings" class="settings-panel" role="region" aria-label="Settings">
        <div style="max-width:720px;margin:8px auto;padding:10px;background:var(--card);border-radius:8px;box-shadow:0 8px 20px rgba(2,6,23,0.06)">
          <label style="display:block;font-weight:700;margin-bottom:6px">Remote API URL (optional)</label>
          <input type="text" [value]="remoteApi" (input)="remoteApi = $any($event.target).value" placeholder="https://abcd.ngrok.io" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(11,92,255,0.06)" />
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn ghost" (click)="clearRemoteApi()">Clear remote</button>
            <button class="btn" (click)="saveRemoteApi()">Save</button>
          </div>
        </div>
      </div>

      <main>
        <quiz (onFinish)="onFinish($event)"></quiz>
      </main>
  <div class="visually-hidden" aria-live="polite">{{ '' }}</div>

      <footer class="site-footer" role="contentinfo" aria-label="Site footer">
        <div class="footer-inner">
          <span class="footer-logo" aria-hidden="true">
            <img src="https://angular.io/assets/images/logos/angular/angular.svg" alt="Angular" width="20" height="20">
          </span>
          <small class="footer-text">Built with Angular — open via CLI (ng serve) for dev.</small>
          <span class="footer-rights">All rights reserved ® Orryn</span>
          <span class="footer-icon" aria-hidden="true">
            <img src="assets/cloud-moon.svg" alt="cloud and moon" width="22" height="22">
          </span>
        </div>
      </footer>
    </div>
  `,
  styles: [``]
})
export class AppComponent implements AfterViewInit, OnDestroy{
  // Persist theme choice in localStorage
  isDark = (localStorage.getItem('quiz_isDark') === 'true');
  showSettings = false;
  remoteApi = (localStorage.getItem('quiz_remote_api') || '');
  constructor(public sound: SoundService){
    try{ if(this.isDark) document.documentElement.classList.add('dark'); }catch(e){}
  }

  ngAfterViewInit(): void {
    try{ document.documentElement.classList.add('loaded'); }catch(e){}
    // make footer semi-transparent on scroll
    try{
      const footer = document.querySelector('.site-footer') as HTMLElement | null;
      if(footer){
        const onScroll = () => {
          try{
            const y = window.scrollY || window.pageYOffset || 0;
            if(y>40) footer.classList.add('scrolled'); else footer.classList.remove('scrolled');
          }catch(e){}
        };
        onScroll();
        window.addEventListener('scroll', onScroll);
        // store so we can remove on destroy
        (this as any)._footerScrollListener = onScroll;
      }
    }catch(e){}
  }
  ngOnDestroy(): void {
    try{ const fn = (this as any)._footerScrollListener; if(fn) window.removeEventListener('scroll', fn); }catch(e){}
  }
  toggle(val: boolean){
    this.isDark = !!val;
    try{ localStorage.setItem('quiz_isDark', String(this.isDark)); }catch(e){}
    try{ document.documentElement.classList.toggle('dark', this.isDark); }catch(e){}
  }

  toggleMute(){ this.sound.toggleMute(); }
  onFinish(event: any){
    // optionally show a toast or persist results
  }

  // keep ngDoCheck for backward compatibility but no-op
  ngDoCheck(){ }

  saveRemoteApi(){
    try{ localStorage.setItem('quiz_remote_api', this.remoteApi || ''); (window as any).__REMOTE_API = this.remoteApi || ''; }
    catch(e){}
    this.showSettings = false;
  }
  clearRemoteApi(){
    try{ localStorage.removeItem('quiz_remote_api'); (window as any).__REMOTE_API = ''; this.remoteApi = ''; }
    catch(e){}
    this.showSettings = false;
  }
}
