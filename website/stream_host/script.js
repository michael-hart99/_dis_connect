'use strict';

import ServerManager from "../ServerManager.js";
import WebRTCTools   from "../WebRTCTools.js";

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

function createPeerConn(SM, to) {
  let peerConn = new RTCPeerConnection();

  peerConn.onicecandidate = (e) => {
    if (!peerConn || !e || !e.candidate)
      return;
    let candidate = e.candidate;
    SM.sendSignal(to, "candidate", candidate);
    console.log("ICE sent");
  };

  return peerConn;
}

/**
 * TODO
 */
function openPeerConn(from) {
  let peerConnection = createPeerConn(SM, from);
  pcs.set(from, peerConnection);
  
  console.log(peerConnection);
  let video = document.querySelector('#stream' + (from % 9 + 1));
  peerConnection.ontrack = (e) => {
    console.log("stream received");
    if (video.srcObject !== e.streams[0]) {
      video.srcObject = e.streams[0];
      streams.set(from, e.streams[0]);
      inUse[from % 9] = from;
    }
  }

  return peerConnection;
}

function processCandidate(json) {
  WebRTCTools.receiveCandidate(pcs.get(json.from), json);
}

/**
 * TODO
 */
function processOffer(json) {
  let peerConnection = openPeerConn(json.from);

  WebRTCTools.receiveOffer(SM, peerConnection, json);
}

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

