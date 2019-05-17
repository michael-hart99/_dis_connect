'use strict';

import ServerManager from "../ServerManager.js";

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

function openPeerConn() {
  let peerConn = new RTCPeerConnection();

  peerConn.onicecandidate = (e) => {
    if (!peerConn || !e || !e.candidate)
      return;
    var candidate = e.candidate;
    SM.sendSignal('controller', "candidate", candidate);
    console.log("ICE sent");
  };

  const video = document.querySelector('#vid');
  peerConn.ontrack = (e) => {
    console.log("stream received");
    video.srcObject = e.streams[0];
  }

  return peerConn;
}

function processCandidate(json){
  try {
    pc.addIceCandidate(new RTCIceCandidate(json.data));
  } catch (e) {}
}

function processOffer(json){
  pc = openPeerConn();

  pc.setRemoteDescription(new RTCSessionDescription(json.data));
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': false,
      'OfferToReceiveVideo': true
    }
  };
  pc.createAnswer(sdpConstraints).then(sdp => {
    pc.setLocalDescription(sdp).then(() => {           
      SM.sendSignal('controller', "answer", sdp);
      console.log("answer sent");
    })
  }, function(err) {
    console.log('error processing offer: ' + err)
  });
};

function processDisconnect() {
  const video = document.querySelector('#vid');
  if (video.srcObject !== null) {
    video.srcObject.getTracks()[0].stop();
    video.srcObject = null;
  }
}

