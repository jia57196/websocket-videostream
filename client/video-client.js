var XMLHttpRequestPromise = require('xhr-promise');

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
    console.error(e);
  });

function initializeVideo() {
  var video = document.getElementById('vid');
  var img = document.getElementById('iid');
  if (mimeCodec === 'video/x-msvideo') {
    console.log('Receiving MJPEG, decoding through <img>.');
    require('./decoders/mjpeg-decoder')();
  } else if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
    console.log('Browser supports ' + mimeCodec + ' video codec.');
    video.style.display = 'block';
    img.style.display = 'none';
    require('./decoders/video-decoder')(mimeCodec);
  } else {
    throw new Error(mimeCodec + ' not supported, aborting.');
  }
}

