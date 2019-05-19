'use strict';

import ServerManager from "../ServerManager.js";
import WebRTCTools   from "../WebRTCTools.js";

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("streamHost");

SM.addHandler( "candidate", processCandidate);
SM.addHandler(     "offer", processOffer);
SM.addHandler("disconnect", processDisconnect);

//////////////
//  WebRTC  //
//////////////

// TODO
var conns = new Map();

// TODO
var inUse = [-1, -1, -1,
             -1, -1, -1,
             -1, -1, -1];

/**
 * TODO
 */
function initConn(from) {
  let conn = {};
  conn.peerConn = WebRTCTools.createPeerConn(SM, from);
  conns.set(from, conn);
  
  let video = document.querySelector('#stream' + (from % 9 + 1));
  conn.peerConn.ontrack = (e) => {
    console.log("stream received");
    video.srcObject = e.streams[0];
    conn.stream = e.streams[0];
    inUse[from % 9] = from;
  }

  return conn.peerConn;
}

function processCandidate(json) {
  WebRTCTools.receiveCandidate(conns.get(json.from).peerConn, json);
}

/**
 * TODO
 */
function processOffer(json) {
  let peerConn = initConn(json.from);

  WebRTCTools.receiveOffer(SM, peerConn, json);
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
  if (conns.size > 9) {
    let stream_keys = Array.from(conns.keys());

    let chosen_key = Math.floor(Math.random() * conns.size);
    let chosen_stream = stream_keys[chosen_key];
    let chosen_video = Math.floor(Math.random() * 9);

    if (inUse.includes(chosen_stream)) {
      let notInUse = stream_keys.filter(x => !inUse.includes(x));

      let chosen_unused_key = Math.floor(Math.random() * notInUse.length);
      let chosen_unused_stream = notInUse[chosen_unused_key];

      for (let i = 0; i < inUse.length; ++i) {
        if (inUse[i] === chosen_stream) {
          inUse[i] = chosen_unused_stream;
          let video = document.querySelector('#stream' + (i + 1));
          video.srcObject = conns.get(chosen_unused_stream).stream;
        }
      }
    }

    inUse[chosen_video] = chosen_stream;
    let video = document.querySelector('#stream' + (chosen_video + 1));
    video.srcObject = conns.get(chosen_stream).stream;
  
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
    conns.delete(json.from);
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

