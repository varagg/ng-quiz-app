import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { QuestionService } from '../question.service';
import { SoundService } from '../sound.service';

@Component({
  selector: 'quiz',
  template: `
  <div class="quiz-root" role="region" aria-label="Quiz">
      <div *ngIf="!playerName" class="intro">
        <h2>Welcome, hooman!</h2>
        <p>Enter your name to start the challenge:</p>
        <label class="visually-hidden" for="playerNameInput">Your name</label>
        <input id="playerNameInput" [(ngModel)]="nameInput" (input)="onNameInput($event)" placeholder="Your name" aria-label="Your name" />
        <div style="position:relative;display:inline-block">
          <button #startBtn class="btn start-btn" (click)="start()" [disabled]="!nameInput" aria-disabled="{{!nameInput}}" (mousemove)="onStartHover($event, startBtn)" (mouseleave)="onStartLeave(startBtn)">Start</button>
          <div class="dodge-emoji" *ngIf="dodgeEmoji">{{ dodgeEmoji }}</div>
        </div>
        <div class="hint">
          <span *ngIf="!invalidAlphaNumeric">Only alphabetic characters A–Z allowed; try typing a number...</span>
          <span *ngIf="invalidAlphaNumeric" class="invalid">Alphanumeric names are not allowed — please remove numbers and try again.</span>
        </div>
      </div>

      <div *ngIf="playerName && !finished" class="play">
        <div *ngIf="isLoading" class="card">
          <div class="skeleton h-20" style="margin-bottom:12px"></div>
          <div class="skeleton h-40" style="margin-bottom:8px"></div>
          <div style="display:flex;gap:8px"><div class="skeleton h-14" style="flex:1"></div><div class="skeleton h-14" style="width:80px"></div></div>
        </div>
        <div *ngIf="loadError" class="card">
          <h3>Unable to load questions</h3>
          <p>{{ loadError }}</p>
          <div class="actions"><button class="btn" (click)="loadQuestions()">Retry</button></div>
        </div>
        <div class="header">
          <div>Player: <strong>{{ playerName }}</strong></div>
          <div>Score: <strong><span class="score-value" [class.pop]="showFeedback">{{ correct }}</span></strong> / {{ total }}</div>
          <div class="timer" aria-live="polite">Time: {{ timeLeft }}s</div>
        </div>

        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="((currentIndex)/(total||1))*100"><i [style.width.%]="((currentIndex)/(total||1))*100"></i></div>

  <div *ngIf="!isLoading && !loadError" class="card" role="group" aria-labelledby="qText">
          <h3 id="qText">{{ current?.text }}</h3>
          <ul class="opts" role="list" aria-labelledby="qText">
            <li #optItem *ngFor="let o of current?.options; let i = index" role="button" tabindex="0"
                (click)="choose(i)" (keydown)="onKey($event, i)"
                [attr.aria-pressed]="selected===i"
                [class.selected]="selected===i"
                [class.correct]="showFeedback && o.isCorrect"
                [class.wrong]="showFeedback && selected===i && !o.isCorrect"
                [attr.data-index]="i">
              <span class="opt-prefix">{{ ['A','B','C','D'][i] }}.</span>
              <span class="opt-text">{{ o.text }}</span>
            </li>
          </ul>

          <div class="feedback" *ngIf="showFeedback" aria-live="polite">
            <span *ngIf="lastCorrect" class="correct">Nice! 🎉</span>
            <span *ngIf="!lastCorrect" class="incorrect">Oops — Correct: <strong>{{ correctText }}</strong></span>
          </div>

          <div class="actions">
            <button class="btn ghost" (click)="skip()">Skip</button>
            <button class="btn" (click)="next()" [disabled]="!showFeedback" aria-disabled="{{!showFeedback}}">Next</button>
          </div>
        </div>
      </div>

  <result *ngIf="finished" [stats]="finalStats" (onReset)="reset()"></result>
    <!-- screen reader announcer -->
    <div class="visually-hidden" aria-live="polite">{{ announced }}</div>
    </div>
  `
})
export class QuizComponent implements OnInit{
  @Output() onFinish = new EventEmitter<any>();
  nameInput = '';
  nameRaw = '';
  canStart = false;
  onlyDigits = false;
  invalidAlphaNumeric = false;
  playerName = '';
  questions: any[] = [];
  isLoading = false;
  loadError = '';
  finalStats: any = null;
  current: any = null;
  currentIndex = 0;
  total = 0;
  selected = -1;
  showFeedback = false;
  lastCorrect = false;
  correctText = '';
  correct = 0;
  finished = false;
  percentage = 0;
  best: any = null;
  timePerQuestion = 20;
  timeLeft = 0;
  timerId: any = null;
  private _globalKeyListener: any = null;
  dodgeEmoji = '';
  private _dodgeEmojiTimeout: any = null;
  private _dodgeWrapper: HTMLElement | null = null;
  private _dodgeRestoreTimeout: any = null;
  private _originalParent: HTMLElement | null = null;
  private _originalNextSibling: Node | null = null;
  private _dodgeMouseMoveListener: any = null;
  // how long (ms) to auto-restore if user doesn't move cursor away; tuneable
  private _dodgeRestoreDelay = 1200;
  // how far from the wrapper the cursor must move before restoring
  private _dodgeLeaveBuffer = 28;
  // Track the latest announced message for aria-live
  announced = '';

  constructor(private qs: QuestionService, private sound: SoundService) {}

  ngOnInit(){
    // load stored player name if present; questions are loaded lazily on Start
    const stored = localStorage.getItem('quiz_playerName');
    if(stored) this.nameInput = stored;

    // attach global keyboard shortcuts
    this._globalKeyListener = this.handleGlobalKey.bind(this);
    window.addEventListener('keydown', this._globalKeyListener);
  }

  ngOnDestroy(): void {
    try{ if(this._globalKeyListener) window.removeEventListener('keydown', this._globalKeyListener); }catch(e){}
    this.stopTimer();
  }

  start(){
    this.playerName = this.nameInput.trim();
  localStorage.setItem('quiz_playerName', this.playerName);
  // load questions lazily and then start
  this.loadQuestions();
  }

  loadQuestions(){
    this.isLoading = true;
    this.loadError = '';
    this.qs.load().subscribe(data => {
      this.questions = data.questions || [];
      this.total = this.questions.length;
      this.timePerQuestion = data.timePerQuestion || this.timePerQuestion;
      this.isLoading = false;
      if(this.total>0){
        this.loadQuestion(0);
      } else {
        this.loadError = 'No questions found.';
      }
    }, err => {
      console.error(err);
      this.isLoading = false;
      this.loadError = 'Failed to load questions — check network or try again.';
    });
  }

  loadQuestion(i: number){
    if(i<0 || i>=this.total){
      this.finish();
      return;
    }
    this.currentIndex = i;
    this.current = this.questions[i];
    this.selected = -1;
    this.showFeedback = false;
    this.lastCorrect = false;
    this.correctText = '';
    this.startTimer();

    // small delay to allow DOM to render options, then focus the first option and animate card
    setTimeout(()=>{
      const root = document.querySelector('.quiz-root');
      const card = root && root.querySelector('.card') as HTMLElement | null;
      const first = root && root.querySelector('.opts li[tabindex]') as HTMLElement | null;
      if(card){ card.classList.remove('fade-in'); void card.offsetWidth; card.classList.add('fade-in'); }
      if(first){ first.focus(); }
      // announce question for screen readers
      this.announce(`Question ${this.currentIndex+1}: ${this.current?.text}`);
    }, 120);
  }

  startTimer(){
    this.timeLeft = this.timePerQuestion;
    this.resumeTimer();
  }

  // start interval without resetting remaining time (used for resume)
  resumeTimer(){
    if(this.timerId) return;
    this.timerId = setInterval(() => {
      this.timeLeft--;
      if(this.timeLeft<=0){
        clearInterval(this.timerId);
        this.timerId = null;
        this.choose(-1, true);
      }
    }, 1000);
  }

  stopTimer(){
  if(this.timerId) { clearInterval(this.timerId); this.timerId = null; }
  }

  choose(index: number, timeout=false){
    if(this.showFeedback) return;
    this.stopTimer();
    this.selected = index;
    const chosen = this.current.options[index] || null;
    this.lastCorrect = !!(chosen && chosen.isCorrect);
    this.showFeedback = true;
    this.correctText = (this.current.options.find(o=>o.isCorrect) || {}).text || '';
    // mark option objects with a temporary flag for template bindings (works if options are plain objects)
    try{
      if(this.current && this.current.options){
        this.current.options.forEach((o:any, idx:number)=>{
          o._selected = (idx===index);
          o._correct = !!o.isCorrect;
        });
      }
    }catch(e){}
  if(this.lastCorrect) { this.correct++; this.sound.chooseCorrect(); }
  else { this.sound.chooseWrong(); }

  // UI pulse: highlight score and card
  this.sound.pulseSelector('.score-value');
  setTimeout(()=> this.sound.pulseSelector('.card'), 40);
  // pulse progress bar briefly
  const root = document.querySelector('.quiz-root');
  const prog = root && root.querySelector('.progress') as HTMLElement | null;
  if(prog){ prog.classList.add('pulse'); setTimeout(()=>prog.classList.remove('pulse'), 420); }

    // announce feedback
    if(this.lastCorrect){
      this.announce('Correct');
    } else {
      this.announce('Incorrect. Correct answer: ' + this.correctText);
    }

    // focus the Next button for keyboard users after feedback
    setTimeout(()=>{
      const root = document.querySelector('.quiz-root');
      const nextBtn = root && root.querySelector('.actions .btn:not(.ghost)') as HTMLElement | null;
      if(nextBtn) nextBtn.focus();
    }, 80);
  }

  onKey(ev: KeyboardEvent, index: number){
    if(ev.key === 'Enter' || ev.key === ' '){
      ev.preventDefault();
      this.choose(index);
    }
  }

  next(){
    this.showFeedback = false;
  this.sound.next();
  const nextIdx = this.currentIndex + 1;
    if(nextIdx>=this.total){
  this.sound.pulseSelector('.card');
      this.finish();
    }else{
      this.loadQuestion(nextIdx);
    }
  }

  skip(){
    this.stopTimer();
    this.selected = -1;
    this.showFeedback = true;
    this.lastCorrect = false;
    this.correctText = (this.current.options.find(o=>o.isCorrect) || {}).text || '';
  this.sound.skip();
  this.sound.pulseSelector('.card');
  }

  finish(){
    this.stopTimer();
    this.finished = true;
    this.percentage = Math.round((this.correct / (this.total||1))*100);
    // persist best score per player
    try{
      const key = 'quiz_best_' + (this.playerName || 'guest');
      const prev = JSON.parse(localStorage.getItem(key) || 'null');
      const now = { correct: this.correct, total: this.total, percentage: this.percentage, time: Date.now() };
      if(!prev || now.percentage > prev.percentage){
        localStorage.setItem(key, JSON.stringify(now));
        this.best = now;
      } else {
        this.best = prev;
      }
    }catch(e){ console.warn('persist best failed', e); }

  const isNewBest = !!(this.best && this.best.percentage === this.percentage);
  this.finalStats = { name: this.playerName, correct: this.correct, total: this.total, percentage: this.percentage, best: this.best, newBest: isNewBest };
  this.onFinish.emit(this.finalStats);
  }

  // Simple aria-live announcer using a visually-hidden element
  announce(msg: string){
    try{
      this.announced = msg;
      // clear briefly to force screen readers to re-read
      setTimeout(()=>{ this.announced = msg; }, 100);
    }catch(e){/* noop */}
  }

  reset(){
    this.playerName = '';
    this.nameInput = '';
    this.questions = [];
    this.correct = 0;
    this.finished = false;
    this.percentage = 0;
  // clear cached state; user can start again which will lazy-load questions
  this.isLoading = false;
  this.loadError = '';
  }

  // only allow alphabet characters in name; if a non-alpha is entered, make the Start button evade the pointer
  onNameInput(ev: Event){
    const input = ev.target as HTMLInputElement;
    const raw = input.value || '';
    const cleaned = raw.replace(/[^a-zA-Z\s]/g, '');
    // show the raw value to the user (do not auto-delete alphanumeric input)
    this.nameRaw = raw;
    this.nameInput = raw;
    // determine validation state
    const hasLetters = /[a-zA-Z]/.test(raw);
    const hasDigits = /\d/.test(raw);
    if(hasDigits && !hasLetters){
      // only digits
      this.onlyDigits = true;
      this.invalidAlphaNumeric = false;
    } else if(hasDigits && hasLetters){
      // alphanumeric -> mark invalid but keep the value visible
      this.onlyDigits = false;
      this.invalidAlphaNumeric = true;
    } else {
      // valid alpha-only input; normalize to cleaned value
      this.onlyDigits = false;
      this.invalidAlphaNumeric = false;
      this.nameInput = cleaned.trim();
    }
    // enable Start only when we have alphabetic-only input
    this.canStart = !!(this.nameInput && !this.onlyDigits && !this.invalidAlphaNumeric);
  }

  onStartHover(ev: MouseEvent, btn: HTMLElement){
    try{
      const raw = (this.nameRaw || '').trim();
      // count digits in the visible name
      const digits = (raw.match(/\d/g) || []).length;
      if(digits>0){
        // if alphanumeric, mark invalid briefly (but still make the button evade)
        if(/[a-zA-Z]/.test(raw)){
          this.invalidAlphaNumeric = true;
          setTimeout(()=> this.invalidAlphaNumeric = false, 900);
        }

        // perform evasive jump for any input that contains digits
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const marginX = 40, marginY = 24;
        const rect = btn.getBoundingClientRect();
        const btnW = rect.width || btn.offsetWidth || 0;
        const btnH = rect.height || btn.offsetHeight || 0;
        const minLeft = marginX;
        const maxLeft = Math.max(minLeft, vw - marginX - btnW);
        const minTop = marginY;
        const maxTop = Math.max(minTop, vh - marginY - btnH);
        if(!(maxLeft <= minLeft && maxTop <= minTop)){
          const targetLeft = minLeft + Math.random() * (Math.max(0, maxLeft - minLeft));
          const targetTop = minTop + Math.random() * (Math.max(0, maxTop - minTop));
          const tx = Math.round(targetLeft - rect.left);
          const ty = Math.round(targetTop - rect.top);

          try{
            if(this._dodgeWrapper){ try{ this._dodgeWrapper.remove(); }catch(e){}; this._dodgeWrapper = null; }
            this._originalParent = btn.parentElement as HTMLElement | null;
            this._originalNextSibling = btn.nextSibling;
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.left = `${rect.left}px`;
            wrapper.style.top = `${rect.top}px`;
            wrapper.style.width = `${btnW}px`;
            wrapper.style.height = `${btnH}px`;
            wrapper.style.pointerEvents = 'none';
            wrapper.style.zIndex = '9999';
            btn.style.pointerEvents = 'auto';
            btn.style.position = 'relative';
            wrapper.appendChild(btn);
            document.body.appendChild(wrapper);
            this._dodgeWrapper = wrapper;

            btn.style.transition = 'transform 220ms cubic-bezier(.08,.9,.24,1)';
            btn.style.transform = `translate(${tx}px, ${ty}px)`;

            if(this._dodgeRestoreTimeout){ clearTimeout(this._dodgeRestoreTimeout); this._dodgeRestoreTimeout = null; }
            if(this._dodgeMouseMoveListener) { try{ window.removeEventListener('mousemove', this._dodgeMouseMoveListener); }catch(e){}; this._dodgeMouseMoveListener = null; }

            const wrapperEl = wrapper;
            this._dodgeMouseMoveListener = (m: MouseEvent) => {
              try{
                const x = m.clientX;
                const y = m.clientY;
                const r = wrapperEl.getBoundingClientRect();
                if(x < r.left - this._dodgeLeaveBuffer || x > r.right + this._dodgeLeaveBuffer || y < r.top - this._dodgeLeaveBuffer || y > r.bottom + this._dodgeLeaveBuffer){
                  try{ this._restoreDodgeWrapper(btn); }catch(e){}
                }
              }catch(e){}
            };
            window.addEventListener('mousemove', this._dodgeMouseMoveListener);
          }catch(e){}
        }
        const palette = ['😅','🤪','🏃‍♀️','💨','🚀'];
        const newEmoji = palette[Math.min(palette.length-1, digits-1)] || '😅';
        const wasEmpty = !this.dodgeEmoji;
        this.dodgeEmoji = newEmoji;
        if(this._dodgeEmojiTimeout) clearTimeout(this._dodgeEmojiTimeout);
        this._dodgeEmojiTimeout = setTimeout(()=>{ this.dodgeEmoji = ''; this._dodgeEmojiTimeout = null; }, 900);
        if(wasEmpty){ try{ this.sound.smallSuccess(); }catch(e){} }
      }
    }catch(e){}
  }

  onStartLeave(btn: HTMLElement){
    try{
      // clear any transform on the real button (if applied)
      try{ btn.style.transform = ''; }catch(e){}
      // trigger restore immediately (move button back)
      try{ if(this._dodgeWrapper) this._restoreDodgeWrapper(btn); }catch(e){}
    }catch(e){}
  }

  private _restoreDodgeWrapper(btn: HTMLElement){
    try{
      if(!this._dodgeWrapper) return;
      // remove transition/transform
      try{ btn.style.transition = ''; btn.style.transform = ''; }catch(e){}
      // move button back to original parent at the original sibling position
      if(this._originalParent){
        if(this._originalNextSibling && this._originalParent.contains(this._originalNextSibling)){
          this._originalParent.insertBefore(btn, this._originalNextSibling as Node);
        } else {
          this._originalParent.appendChild(btn);
        }
      }
      // remove wrapper from DOM
  try{ this._dodgeWrapper.remove(); }catch(e){}
  this._dodgeWrapper = null;
  if(this._dodgeRestoreTimeout){ clearTimeout(this._dodgeRestoreTimeout); this._dodgeRestoreTimeout = null; }
  if(this._dodgeMouseMoveListener){ try{ window.removeEventListener('mousemove', this._dodgeMouseMoveListener); }catch(e){}; this._dodgeMouseMoveListener = null; }
  this._originalParent = null; this._originalNextSibling = null;
    }catch(e){/* noop */}
  }

  // Global keyboard handler: 1-4 select options, Enter confirms/next, Space skips, Esc resets
  handleGlobalKey(ev: KeyboardEvent){
    // ignore if no player or finished
    if(!this.playerName || this.finished) return;
    // if input has focus (typing name), don't hijack keys
    const active = document.activeElement as HTMLElement | null;
    if(active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA')){
      return;
    }

    // number keys select options A-D
    if(ev.key >= '1' && ev.key <= '4'){
      const idx = parseInt(ev.key, 10) - 1;
      if(this.current && this.current.options && idx < this.current.options.length){
        ev.preventDefault();
        // if feedback already shown, allow selecting next question with number
        if(this.showFeedback){ this.next(); }
        else { this.choose(idx); }
      }
      return;
    }

    if(ev.key === 'Enter'){
      ev.preventDefault();
      if(!this.showFeedback){
        // if something selected, confirm it
        if(this.selected>=0) this.choose(this.selected);
      } else {
        this.next();
      }
      return;
    }

    if(ev.code === 'Space' || ev.key === ' '){
      ev.preventDefault();
      // skip current question
      if(!this.showFeedback) this.skip();
      return;
    }

    if(ev.key === 'Escape'){
      ev.preventDefault();
      // quick reset to intro
      this.reset();
      return;
    }
  }
}
