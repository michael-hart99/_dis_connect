'use strict';

/**
 * TODO
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

// TODO
const HOST = "www.thejobdance.com";
// TODO
const PORT = 789;

// TODO
const CONN = new WebSocket("wss://" + HOST + ":" + PORT, 'request-stream-host');

// TODO
const my_id = "stream_host";

// TODO
CONN.onerror = 
  (err) => console.log('server\'s error: ' + err);

/**
 * TODO
 */
async function sendSignal(to, action, data) {
  let count = 0;
  while (CONN.readyState === 0 && count < 400) {
    await sleep(5);
    count++;
  }
  if (CONN.readyState === 1) {
    let json = {
      from: my_id,
      to: to,
      action: action,
      data: data
    };
    CONN.send(JSON.stringify(json));
  }
}

/**
 * TODO
 */
CONN.onmessage = function(e){
  var json = JSON.parse(e.data);
  
  console.log("received %s from %s", json.action, json.from);

  if (json.action === "candidate") {
    processCandidate(json.from, json.data);
  } else if (json.action === "offer") {
    processOffer(json.from, json.data)
  } else if (json.action === "disconnect") {
    disconnectStream(json.from);
  } else {
    console.log("unexpected action: " + json.action);
  }
}

//////////////
//  WebRTC  //
//////////////

// TODO
var pcs = new Map();
// TODO
var streams = new Map();

// TODO
var inUse = [-1, -1, -1,
             -1, -1, -1,
             -1, -1, -1];
// TODO
var flickering = false;

/**
 * TODO
 */
function openPeerConn(from) {
  let peerConnection = new RTCPeerConnection();
  pcs.set(from, peerConnection);
  
  peerConnection.onicecandidate = (e) => {
    if (!peerConnection || !e || !e.candidate)
      return;
    let candidate = e.candidate;
    sendSignal(from, "candidate", candidate);
    console.log("ICE sent");
  };
  
  let video = document.querySelector('#stream' + (from % 9 + 1));
  peerConnection.ontrack = (e) => {
    console.log("stream received");
    if (video.srcObject !== e.streams[0]) {
      video.srcObject = e.streams[0];
      streams.set(from, e.streams[0]);
      inUse[from % 9] = from;
    }
  }
  
  if (!flickering) {
    flickering = true;
    flicker();
  }
}

/**
 * TODO
 */
function processCandidate(from, iceCandidate){
  let peerConnection = pcs.get(from);
  try {
    peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  } catch (e) {}
}

/**
 * TODO
 */
function processOffer(from, offer){
  openPeerConn(from);

  let peerConnection = pcs.get(from);

  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': false,
      'OfferToReceiveVideo': true
    }
  };
  peerConnection.createAnswer(sdpConstraints).then(sdp => {
    peerConnection.setLocalDescription(sdp).then(() => {           
      sendSignal(from, "answer", sdp);
      console.log("answer sent");
    })
  }, function(err) {
    console.log('error processing offer: ' + err)
  });
};

////////////////////////
//  MANAGING STREAMS  //
////////////////////////

// The minimum delay between flickers (in seconds)
const MIN_FLICKER_DELAY = 5;
// The maximum delay between flickers (in seconds)
const MAX_FLICKER_DELAY = 15;

/**
 * TODO
 */
async function flicker() {
  if (streams.size > 9) {
    let stream_keys = Array.from(streams.keys());

    let chosen_key = Math.floor(Math.random() * streams.size);
    let chosen_stream = stream_keys[chosen_key];
    let chosen_video = Math.floor(Math.random() * 9);

    if (inUse.includes(chosen_stream)) {
      console.log(chosen_stream);
      let notInUse = stream_keys.filter(x => !inUse.includes(x));
      console.log(notInUse);

      let chosen_unused_key = Math.floor(Math.random() * notInUse.length);
      let chosen_unused_stream = notInUse[chosen_unused_key];
      console.log(chosen_unused_stream);

      for (let i = 0; i < inUse.length; ++i) {
        if (inUse[i] === chosen_stream) {
          inUse[i] = chosen_unused_stream;
          let video = document.querySelector('#stream' + (i + 1));
          video.srcObject = streams.get(chosen_unused_stream);
        }
      }
    }

    inUse[chosen_video] = chosen_stream;
    let video = document.querySelector('#stream' + (chosen_video + 1));
    video.srcObject = streams.get(chosen_stream);
  
    console.log("flickered");
  }
  await sleep(Math.random() * ((MAX_FLICKER_DELAY - MIN_FLICKER_DELAY) * 1000)
              + (MIN_FLICKER_DELAY * 1000));
  flicker();
}

/**
 * TODO
 */
function disconnectStream(from) {
  try {
    pcs.delete(from);
    streams.delete(from);
    for (let i = 0; i < inUse.length; ++i) {
      if (inUse[i] === from) {
        inUse[i] = -1;
        let video = document.querySelector('#stream' + (i + 1));
        video.srcObject = undefined;
      }
    }
  } catch (e) {}
}

