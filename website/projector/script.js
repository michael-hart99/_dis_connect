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

function createPeerConn(SM, to) {
  let peerConn = new RTCPeerConnection();

  peerConn.onicecandidate = (e) => {
    if (!peerConn || !e || !e.candidate)
      return;
    var candidate = e.candidate;
    SM.sendSignal(to, "candidate", candidate);
    console.log("ICE sent");
  };

  return peerConn;
}

function openPeerConn() {
  let peerConn = createPeerConn(SM, "controller");
  console.log(peerConn);

  const video = document.querySelector('#vid');
  peerConn.ontrack = (e) => {
    console.log("stream received");
    video.srcObject = e.streams[0];
  }

  return peerConn;
}

function processOffer(json) {
  pc = openPeerConn();
  console.log(pc);

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

