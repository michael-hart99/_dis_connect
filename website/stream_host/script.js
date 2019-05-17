'use strict';

import ServerManager from "../ServerManager.js";

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("stream_host");

SM.addHandler( "candidate", processCandidate);
SM.addHandler(     "offer", processOffer);
SM.addHandler("disconnect", processDisconnect);

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
    SM.sendSignal(from, "candidate", candidate);
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
}

/**
 * TODO
 */
function processCandidate(json) {
  let peerConnection = pcs.get(json.from);
  try {
    peerConnection.addIceCandidate(new RTCIceCandidate(json.data));
  } catch (e) {}
}

/**
 * TODO
 */
function processOffer(json) {
  openPeerConn(json.from);

  let peerConnection = pcs.get(json.from);

  peerConnection.setRemoteDescription(new RTCSessionDescription(json.data));
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': false,
      'OfferToReceiveVideo': true
    }
  };
  peerConnection.createAnswer(sdpConstraints).then(sdp => {
    peerConnection.setLocalDescription(sdp).then(() => {           
      SM.sendSignal(json.from, "answer", sdp);
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
  await ServerManager.sleep(Math.random() * ((MAX_FLICKER_DELAY - MIN_FLICKER_DELAY) * 1000)
              + (MIN_FLICKER_DELAY * 1000));
  flicker();
}

/**
 * TODO
 */
function processDisconnect(json) {
  try {
    pcs.delete(json.from);
    streams.delete(json.from);
    for (let i = 0; i < inUse.length; ++i) {
      if (inUse[i] === json.from) {
        inUse[i] = -1;
        let video = document.querySelector('#stream' + (i + 1));
        video.srcObject = undefined;
      }
    }
  } catch (e) {}
}

flicker();

