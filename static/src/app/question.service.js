(function(angular){
  'use strict';

  angular.module('quizApp').service('QuestionService', ['$http', '$q', function($http, $q){
    var svc = this;
    svc.data = null;

    svc.load = function(){
      var deferred = $q.defer();

      // If page provided embedded data, use it (helps file:// openings)
      if(window.__questionsData){
        svc.data = window.__questionsData;
        deferred.resolve(svc.data);
        return deferred.promise;
      }

      // Fallback to fetching the JSON asset
      $http.get('src/assets/questions.json').then(function(res){
        svc.data = res.data;
        deferred.resolve(svc.data);
      }).catch(function(err){
        deferred.reject(err);
      });

      return deferred.promise;
    };

    return svc;
  }]);
})(window.angular);
