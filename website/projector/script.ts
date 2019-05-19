'use strict';

import { ServerManager, ServerMessage } from '../ServerManager.ts';
import WebRTCTools from '../WebRTCTools.ts';

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("projector");

SM.addHandler( "candidate", processCandidate);
SM.addHandler(     "offer", processOffer);
SM.addHandler("disconnect", processDisconnect);

//////////////
//  WebRTC  //
//////////////

var pc: RTCPeerConnection;

function initConn(): RTCPeerConnection {
  let peerConn = WebRTCTools.createPeerConn(SM, "controller");

  const video = document.querySelector('#vid');
  if (video instanceof HTMLVideoElement) {
    console.log(peerConn);
    peerConn.ontrack = (e: RTCTrackEvent) => {
      console.log("stream received");
      video.srcObject = e.streams[0];
    }
  }

  return peerConn;
}

function processOffer(json: ServerMessage): void {
  pc = initConn();

  WebRTCTools.receiveOffer(SM, pc, json)
}

function processCandidate(json: ServerMessage): void {
  WebRTCTools.receiveCandidate(pc, json);
}

////////////////////////

function processDisconnect(): void {
  const video = document.querySelector('#vid');
  if (video instanceof HTMLVideoElement &&
      video.srcObject instanceof MediaStream) {
    video.srcObject.getTracks()[0].stop();
    video.srcObject = null;
  }
}
