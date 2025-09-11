import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuestionService } from './question.service';

describe('QuestionService', ()=>{
  let service: QuestionService;
  let httpMock: HttpTestingController;

  beforeEach(()=>{
  TestBed.configureTestingModule({ imports:[HttpClientTestingModule], providers:[QuestionService], schemas: [] as any });
    service = TestBed.inject(QuestionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(()=>{ httpMock.verify(); });

  it('should fetch questions and cache them', (done)=>{
    const fake = { questions: [{ text: 'q1', options: [] }], timePerQuestion: 10 };
    service.load().subscribe(res=>{
      expect(res).toEqual(fake);
      // second call should use cache and not trigger http
      service.load().subscribe(res2=>{ expect(res2).toEqual(fake); done(); });
    });
    const req = httpMock.expectOne('/assets/questions.json');
    expect(req.request.method).toBe('GET');
    req.flush(fake);
  });
});
