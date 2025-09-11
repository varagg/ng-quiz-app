// Questions loader to embed JSON when file:// prevents XHR
(function(){
  // Attempt to attach window.__questionsData if running from file://
  // This helps avoid CORS/file XHR issues; we still keep a JSON asset for proper setups.
  window.__questionsData = null;
  try{
    // Inline fetch via synchronous XHR isn't allowed on file:// in some browsers; leave as null by default
  }catch(e){
    window.__questionsData = null;
  }
})();
