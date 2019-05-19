'use strict';

import { ServerManager, ServerMessage } from '../ServerManager.ts';
import WebRTCTools from '../WebRTCTools.ts';

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

interface StreamConn {
  peerConn: RTCPeerConnection;
  stream: MediaStream;
};

// TODO
var conns: Map<number, StreamConn> = new Map();

// TODO
var inUse = [-1, -1, -1,
             -1, -1, -1,
             -1, -1, -1];

/**
 * TODO
 */
function initConn(from: string): RTCPeerConnection {
  let peerConn = WebRTCTools.createPeerConn(SM, from);
  
  let video = document.querySelector('#stream' + (Number(from) % 9 + 1)) as HTMLVideoElement;
  peerConn.ontrack = (e: RTCTrackEvent) => {
    console.log("stream received");
    video.srcObject = e.streams[0];
    conns.set(Number(from), {peerConn: peerConn, stream: e.streams[0]});
    inUse[Number(from) % 9] = Number(from);
  }

  return peerConn;
}

function processCandidate(json: ServerMessage): void {
  let conn = conns.get(Number(json.from));
  if (conn) {
    WebRTCTools.receiveCandidate(conn.peerConn, json);
  }
}

/**
 * TODO
 */
function processOffer(json: ServerMessage): void {
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
async function flicker(): Promise<void> {
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
          let video = document.querySelector('#stream' + (i + 1)) as HTMLVideoElement;
          let stream = conns.get(chosen_unused_stream);
          if (stream) {
            video.srcObject = stream.stream;
          }
        }
      }
    }

    inUse[chosen_video] = chosen_stream;
    let video = document.querySelector('#stream' + (chosen_video + 1)) as HTMLVideoElement;
    let stream = conns.get(chosen_stream);
    if (stream) {
      video.srcObject = stream.stream;
    }

    console.log("flickered");
  }
  await ServerManager.sleep(Math.random() * ((MAX_FLICKER_DELAY - MIN_FLICKER_DELAY) * 1000)
              + (MIN_FLICKER_DELAY * 1000));
  flicker();
}

/**
 * TODO
 */
function processDisconnect(json: ServerMessage) {
  try {
    conns.delete(Number(json.from));
    for (let i = 0; i < inUse.length; ++i) {
      if (inUse[i] === Number(json.from)) {
        inUse[i] = -1;
        let video = document.querySelector('#stream' + (i + 1)) as HTMLVideoElement;
        video.srcObject = null;
      }
    }
  } catch (e) {}
}

flicker();
