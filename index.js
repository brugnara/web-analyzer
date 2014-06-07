var EE = require('events').EventEmitter;
var util = require('util');
var log = require('npmlog');
var extractor = require('auto-keywords');
var request = require('request');
var $ = require('cheerio');

var LOG_CTX = 'web-analyzer';

var Analyzer = function(options) {
  Analyzer.super_.call(this);
  this.options = options;
  this.queued = [];
  this.isDigesting = false;
  this.isTerminated = false;
  //
  this.init();
  this.loop();
  log.info(LOG_CTX, 'Waiting for queued elements...');
};

util.inherits(Analyzer, EE);
module.exports = Analyzer;

Analyzer.prototype.init = function() {
  // initialize listener to queue.
  this.on('queued', this.startDigester.bind(this));
  this.on('digested', this.digested.bind(this));
  this.on('end', this.terminate.bind(this));
};

Analyzer.prototype.terminate = function() {
  log.info(LOG_CTX,'Listener terminated...');
  this.isTerminated = true;
};

Analyzer.prototype.startDigester = function() {
  if (this.isDigesting) {
    return;
  }
  this.isDigesting = true;
  //
  this.digester();
};

Analyzer.prototype.digested = function() {
  this.isDigesting = false;
  log.info(LOG_CTX, 'Queue empty.. Waiting for new queued elements...');
};

// this will digest one item at a time.
Analyzer.prototype.digester = function() {
  var element = this.queued.shift();
  //
  if (!element) {
    // queue completely digested
    this.emit('digested');
    return;
  }
  // digest this 'element'
  this.digest(element, function(err) {
    if (err) {
      log.error(LOG_CTX, err);
    }
    this.digester();
  }.bind(this));
};

Analyzer.prototype.digest = function(element, cb) {
  log.info(LOG_CTX, 'Digesting %j...', element);
  //
  request(element.url, function(err, res, page) {
    //console.log(page);
    var $page = $.load(page);
    var $body = $page('body');
    log.info(LOG_CTX, extractor($body.text(), {limit: 500, completeReturns: true}));
    cb(err);
  })
};

Analyzer.prototype.getElementSkeleton = function(cb) {
  var skeleton = {
    url: '',
    details: {}
  };
  //
  if (cb) {
    cb(null, skeleton);
  } else {
    return skeleton;
  }
};

Analyzer.prototype.queue = function(elements, cb) {
  if (!elements) {
    throw new Error('Element is required!');
  }
  // queue!
  if (Array.isArray(elements)) {
    this.queued = this.queued.concat(elements);
  } else {
    if (typeof elements === 'string') {
      this.queued.push({
        url: elements
      });
    } else {
      this.queued.push(elements);
    }
  }
  // emit
  this.emit('queued');
  if (cb) {
    cb(null, this.queued);
  } else {
    return this;
  }
};

Analyzer.prototype.loop = function() {
  if (!this.isTerminated) {
    setTimeout(this.loop.bind(this), 100);
  }
};