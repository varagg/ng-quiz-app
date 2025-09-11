import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class QuestionService {
  private cache: any = null;
  constructor(private http: HttpClient) {}

  // Lazy-load and cache the questions so repeated calls are cheap.
  load(): Observable<any>{
    if(this.cache){
      return of(this.cache);
    }

    // If the page embedded questions (helps file:// openings), use it.
    if((window as any).__questionsData){
      this.cache = (window as any).__questionsData;
      return of(this.cache);
    }

    // Try a few common locations in order:
    // 1) '/assets/questions.json' (served SPA)
    // 2) 'assets/questions.json' (relative dev path)
    // 3) 'src/assets/questions.json' (static project root layout)
    return this.http.get('/assets/questions.json').pipe(
      catchError(()=> this.http.get('assets/questions.json')),
      catchError(()=> this.http.get('src/assets/questions.json')),
      tap(data => { this.cache = data; })
    );
  }
}
