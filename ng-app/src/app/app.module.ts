import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { QuizComponent } from './quiz/quiz.component';
import { ResultComponent } from './result/result.component';
import { QuestionService } from './question.service';
import { SoundService } from './sound.service';

@NgModule({
  declarations: [AppComponent, QuizComponent, ResultComponent],
  imports: [BrowserModule, FormsModule, HttpClientModule],
  providers: [QuestionService, SoundService],
  bootstrap: [AppComponent]
})
export class AppModule { }
