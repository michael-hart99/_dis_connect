'use strict';

import ServerManager from "../ServerManager.js";
import WebRTCTools   from "../WebRTCTools.js";

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("controller");

SM.addHandler("candidate", processCandidate);
SM.addHandler(   "answer", processAnswer);

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

async function startStream(peerConn, streamID) {
  const video = document.getElementById(streamID);
  const stream = await navigator.mediaDevices.getUserMedia(
                          {video: {
                             facingMode: 'environment',
                             frameRate: {ideal: 20, max: 30}
                           }, 
                           audio: false});

  video.srcObject = stream;
  video.hidden = false;
  peerConn.addTrack(stream.getVideoTracks()[0], stream);
}

async function initConn() {
  pc = createPeerConn(SM, "projector");

  await startStream(pc, "vid");

  WebRTCTools.sendOffer(SM, pc, "projector");
}

function processCandidate(json) {
  WebRTCTools.receiveCandidate(pc, json);
}

function processAnswer(json) {
  WebRTCTools.receiveAnswer(pc, json);
}

///////////////////////////////

function processDisconnect() {
  const video = document.getElementById('vid');
  video.hidden = true;
  video.srcObject.getTracks()[0].stop();
  SM.sendSignal("projector", 'disconnect');
}

function beginVid() {
  SM.sendSignal("all", 'begin_video');
}

function resetVid() {
  SM.sendSignal("all", 'reset_video');
}

function blackout() {
  SM.sendSignal("all", 'blackout');
}

function multiStream() {
  SM.sendSignal("all", "can_stream");
}

document.querySelector('#run').addEventListener('click', initConn);
document.querySelector('#disconnect').addEventListener('click', processDisconnect);
document.querySelector('#begin_vid').addEventListener('click', beginVid);
document.querySelector('#reset_vid').addEventListener('click', resetVid);
document.querySelector('#blackout').addEventListener('click', blackout);
document.querySelector('#multi_stream').addEventListener('click', multiStream);

