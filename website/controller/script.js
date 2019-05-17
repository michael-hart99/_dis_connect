'use strict';

import ServerManager from "../ServerManager.js";

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

async function createConn() {
  pc = new RTCPeerConnection();
  const video = document.querySelector('#vid');
  const stream = await navigator.mediaDevices.getUserMedia(
                          {video: {facingMode: 'environment'}, audio: false});

  video.srcObject = stream;
  video.hidden = false;
  pc.addTrack(stream.getVideoTracks()[0], stream);

  pc.onicecandidate = (e) => {
    if (!pc || !e || !e.candidate)
      return;
    var candidate = e.candidate;
    SM.sendSignal("projector", "candidate", candidate);
    console.log("ICE sent");
  };

  sendOffers();
}

function sendOffers() {
  var sdpConstraints = { offerToReceiveAudio: false,  
	                 offerToReceiveVideo: true };
  pc.createOffer(sdpConstraints).then(sdp => {
    pc.setLocalDescription(sdp);
    SM.sendSignal("projector", "offer", sdp);
    console.log("offer sent to projector");
  });
}

function processCandidate(json) {
  try {
    pc.addIceCandidate(new RTCIceCandidate(json.data));
  } catch (e) {}
}

function processAnswer(json) {
  pc.setRemoteDescription(new RTCSessionDescription(json.data));
  console.log("processed answer");
};

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
  console.log('button pushed');
  SM.sendSignal("all", "can_stream");
}

document.querySelector('#run').addEventListener('click', createConn);
document.querySelector('#disconnect').addEventListener('click', processDisconnect);
document.querySelector('#begin_vid').addEventListener('click', beginVid);
document.querySelector('#reset_vid').addEventListener('click', resetVid);
document.querySelector('#blackout').addEventListener('click', blackout);
document.querySelector('#multi_stream').addEventListener('click', multiStream);

