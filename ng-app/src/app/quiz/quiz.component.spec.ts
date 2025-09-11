import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { QuizComponent } from './quiz.component';
import { QuestionService } from '../question.service';
import { By } from '@angular/platform-browser';

describe('QuizComponent', ()=>{
  let comp: QuizComponent;
  let fixture: ComponentFixture<QuizComponent>;
  const stubQs = {
    load: ()=> of({ questions: [ { text: 'Q1', options: [ {text:'a', isCorrect:false}, {text:'b', isCorrect:true} ] } ], timePerQuestion: 2 })
  } as Partial<QuestionService> as QuestionService;

  beforeEach(async ()=>{
  await TestBed.configureTestingModule({ declarations:[QuizComponent], imports:[FormsModule], providers:[{ provide: QuestionService, useValue: stubQs }], schemas:[NO_ERRORS_SCHEMA] }).compileComponents();
    fixture = TestBed.createComponent(QuizComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should start and score correct answers', fakeAsync(()=>{
    comp.nameInput = 'Tester';
    comp.start();
  // loadQuestions is async via observable; advance enough time to run DOM timeouts and timer start
  tick(300); fixture.detectChanges();
    expect(comp.total).toBe(1);
  // choose correct option index 1
  comp.choose(1);
  // advance to let choose() timeouts fire
  tick(300); fixture.detectChanges();
  expect(comp.lastCorrect).toBeTrue();
  expect(comp.correct).toBe(1);
  comp.next();
  tick(200); fixture.detectChanges();
  expect(comp.finished).toBeTrue();
  // clear timers and destroy
  comp.stopTimer();
  fixture.destroy();
  }));

  it('should mark timeout as incorrect', fakeAsync(()=>{
    comp.nameInput = 'T2'; comp.start(); tick(); fixture.detectChanges();
  // advance past timePerQuestion to trigger timeout behavior (timePerQuestion is 2 in stub)
  tick(2500); fixture.detectChanges();
  // the component auto-calls choose(-1,true) on timeout; ensure feedback is shown
  expect(comp.showFeedback).toBeTrue();
  expect(comp.lastCorrect).toBeFalse();
  comp.stopTimer();
  fixture.destroy();
  }));
});
