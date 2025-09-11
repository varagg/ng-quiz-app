(function(angular){
  'use strict';

  angular.module('quizApp').component('quiz', {
    templateUrl: 'src/app/quiz/quiz.template.html',
    controllerAs: 'vm',
    controller: ['QuestionService', '$interval', function(QuestionService, $interval){
      var vm = this;
      vm.questions = [];
      vm.currentIndex = 0;
      vm.total = 0;
      vm.currentQuestion = {};
      vm.selectedIndex = -1;
      vm.showFeedback = false;
      vm.lastAnswerCorrect = false;
      vm.correctAnswerText = '';
      vm.finished = false;
      vm.stats = { total:0, correct:0, percentage:0 };
      vm.timePerQuestion = 20;
      vm.timeLeft = 0;
      var timerPromise = null;

      function startTimer(){
        vm.timeLeft = vm.timePerQuestion;
        if(timerPromise) $interval.cancel(timerPromise);
        timerPromise = $interval(function(){
          vm.timeLeft--;
          if(vm.timeLeft<=0){
            vm.select(-1, true); // time up
          }
        }, 1000);
      }

      function stopTimer(){
        if(timerPromise){
          $interval.cancel(timerPromise);
          timerPromise = null;
        }
      }

      vm.$onInit = function(){
        QuestionService.load().then(function(data){
          vm.questions = angular.copy(data.questions || []);
          vm.total = vm.questions.length;
          vm.stats.total = vm.total;
          vm.timePerQuestion = data.timePerQuestion || vm.timePerQuestion;
          vm.loadQuestion(0);
        }).catch(function(err){
          console.error('Failed loading questions', err);
        });
      };

      vm.loadQuestion = function(idx){
        if(idx<0 || idx>=vm.questions.length){
          vm.finish();
          return;
        }
        vm.currentIndex = idx;
        vm.currentQuestion = vm.questions[idx];
        vm.selectedIndex = -1;
        vm.showFeedback = false;
        vm.lastAnswerCorrect = false;
        vm.correctAnswerText = '';
        vm.finished = false;
        startTimer();
      };

      vm.select = function(index, timeout){
        // index === -1 means no selection (timeout/skip)
        if(vm.showFeedback) return;
        stopTimer();
        vm.selectedIndex = index;
        var chosen = vm.currentQuestion.options[index];
        vm.lastAnswerCorrect = chosen && chosen.isCorrect;
        vm.showFeedback = true;
        vm.correctAnswerText = (vm.currentQuestion.options.find(function(o){return o.isCorrect;}) || {}).text || '';
        if(vm.lastAnswerCorrect) vm.stats.correct++;
      };

      vm.next = function(){
        vm.showFeedback = false;
        var nextIdx = vm.currentIndex + 1;
        if(nextIdx>=vm.total){
          vm.finish();
        }else{
          vm.loadQuestion(nextIdx);
        }
      };

      vm.skip = function(){
        stopTimer();
        vm.selectedIndex = -1;
        vm.showFeedback = true;
        vm.lastAnswerCorrect = false;
        vm.correctAnswerText = (vm.currentQuestion.options.find(function(o){return o.isCorrect;}) || {}).text || '';
      };

      vm.finish = function(){
        stopTimer();
        vm.finished = true;
        vm.stats.percentage = Math.round((vm.stats.correct / (vm.stats.total||1)) * 100);
      };

      vm.reset = function(){
        vm.stats = { total: vm.total, correct:0, percentage:0 };
        vm.loadQuestion(0);
      };

    }]
  });
})(window.angular);
