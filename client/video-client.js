var XMLHttpRequestPromise = require('xhr-promise');

var jpegExtractor = require('./jpeg-extractor.js');
var WSStream = require('./wsstream.js');

var mimeCodec = null;

var xhrPromise = new XMLHttpRequestPromise();
xhrPromise.send({
    method: 'GET',
    url: '/getCodec'
  })
  .then(function(results) {
    if (results.status !== 200) {
      throw new Error('request failed');
    }
    mimeCodec = xhrPromise.getXHR().responseText;
    initializeVideo();
  })
  .catch(function(e) {
    console.error(e)
  });

var websocketVideoStream = new WSStream('ws://' + location.hostname);
websocketVideoStream.onclose = websocketVideoStream.onerror = function() {
  // Reload the page on server-side error (it should not be closed)
  setTimeout(function() {
    window.location.reload();
  }, 2000);
};

function initializeVideo() {
  if (!('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec))) {
    console.log('MediaElement does not support ' + mimeCodec + ' Video codec, falling back to jpeg decoding.');
    decodeAndPlayMjpeg();
  } else {
    console.log('MediaElement supports ' + mimeCodec + ' video codec.');
    decodeAndPlayMp4();
  }
}

function decodeAndPlayMjpeg() {
  var mjpegDecoder = new JPEGExtractorStream();
  var canvas = document.getElementById('cid');
  var ctxt = canvas.getContext('2d');
  mjpegDecoder.on('image', function(imgData) {
    var img = null;
    try {
      img = new Image;
    } catch (e) {
      //console.log
    }
    var w, h;
    var uInt8Array = imgData;
    var i = uInt8Array.length;
    var binaryString = [i];
    while (i--) {
      binaryString[i] = String.fromCharCode(uInt8Array[i]);
    }
    var data = binaryString.join('');
    var base64 = window.btoa(data);
    img.src = 'data:image/jpeg;base64,' + base64;
    img.onload = function() {
      w = img.width; h = img.height;
      ctxt.drawImage(img, 0, 0, w, h, 0, 0, ctxt.canvas.width, ctxt.canvas.height);
    };
    img.onerror = function(stuff) {
    };
  });

  websocketVideoStream.ondata = function(_d) {
    mjpegDecoder.write(_d);
  };
  websocketVideoStream.init();
}

function decodeAndPlayMp4() {
  var video = document.getElementById('vid');
  var canvas = document.getElementById('cid');
  var mediaSource = null;
  var sourceBuffer = null;
  var queue = [];

  mediaSource = new MediaSource();
  video.src = window.URL.createObjectURL(mediaSource);
  video.style.display = 'block';
  canvas.style.display = 'none';
  video.addEventListener('error', function(e) {
    console.log('Media error: ' + e.target.error.code);
  });
  video.addEventListener('stalled', function(e) {
    console.log('Media stalled');
  });
  /* bind mediaSource buffer to websocket stream data */
  mediaSource.addEventListener('sourceopen', function() {
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

    sourceBuffer.addEventListener('updateend', function() {
      if (queue.length) {
        sourceBuffer.appendBuffer(queue.shift());
      }
    }, false);

    sourceBuffer.addEventListener('remove', function() {
      console.error('source buffer remove');
    }, false);

    websocketVideoStream.ondata = function(_d) {
       //var d=new Uint8Array(_d);
       var d = _d;
       if (!sourceBuffer.updating && sourceBuffer.buffered.length > 0) {
         sourceBuffer.appendBuffer(d);// new Uint8Array(d);
       } else {
         if (!sourceBuffer.updating) sourceBuffer.appendBuffer(d);
         else queue.push(d);
       }
      if (video.paused) {
         video.play();
      }
    };
    websocketVideoStream.init();
  });
  mediaSource.addEventListener('sourceended', function(e) {
    mediaSource.removeSourceBuffer(sourceBuffer);
    websocketVideoStream.ondata = null;
  });
  mediaSource.addEventListener('sourceclose', function(e) {
      console.log('mediaSource sourceclose');
  });
  mediaSource.addEventListener('error', function(e) {
      console.log('mediaSource error');
  });
  mediaSource.addEventListener('abort', function(e) {
      console.log('mediaSource abort');
  });
}
