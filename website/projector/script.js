'use strict';

import ServerManager from "../ServerManager.js";
import WebRTCTools   from "../WebRTCTools.js";

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

var pc;

function initConn() {
  let peerConn = WebRTCTools.createPeerConn(SM, "controller");

  const video = document.querySelector('#vid');
  peerConn.ontrack = (e) => {
    console.log("stream received");
    video.srcObject = e.streams[0];
  }

  return peerConn;
}

function processOffer(json) {
  pc = initConn();

  WebRTCTools.receiveOffer(SM, pc, json)
}

function processCandidate(json) {
  WebRTCTools.receiveCandidate(pc, json);
}

////////////////////////

function processDisconnect() {
  const video = document.querySelector('#vid');
  if (video.srcObject !== null) {
    video.srcObject.getTracks()[0].stop();
    video.srcObject = null;
  }
}

