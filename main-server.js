var cluster = require('cluster');
var express = require('express');
var http = require('http');
var websocket = require('./');
var logger = require('./logger');
var videoServer = require('./video-server.js');


if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', function(worker, code, signal) {
    cluster.fork();
  });
}

if (cluster.isWorker) {
  startWorker();
}

function startWorker() {
  // XXX move me to config file
  var config = {
    videoCodec: 'mjpeg', // can be one of 'mp4', 'mjpeg'
    port: 80
  }

  var app = express();

  app.use(express.static(__dirname + '/www/'));
  app.get('/getCodec', function (req, res) {
    switch (config.videoCodec) {
      case 'mp4':
        res.send('video/mp4; codecs="avc1.42E01F"');
        break;
      case 'mjpeg':
        res.send('video/x-msvideo');
        break;
      default:
        res.status(500).send('Error in configuration: video codec ' + videoCodec + ' not supported.');
        break;

    }
  })

  httpServer = http.Server(app);

  httpServer.listen(config.port, function() {
    logger.info('listening on *:' + config.port);
  });

  videoServer.start(
    {
      server: httpServer,
      videoCodec: config.videoCodec
    },
    function(err) {
      console.error(err);
    }
  );
}
