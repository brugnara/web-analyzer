var Analyzer = require('./');

var an = new Analyzer();

an.queue('http://repubblica.it');

/*setTimeout(function() {
  an.terminate();
}, 15000);*/

