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

async function initConn() {
  pc = WebRTCTools.createPeerConn(SM, "projector");

  await WebRTCTools.startStream(pc, "vid");

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

