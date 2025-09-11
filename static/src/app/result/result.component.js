(function(angular){
  'use strict';

  angular.module('quizApp').component('result',{
    templateUrl: 'src/app/result/result.template.html',
    bindings: {
      stats: '<',
      onReset: '&'
    },
    controller: function(){
      // simple presentational component
    }
  });
})(window.angular);
