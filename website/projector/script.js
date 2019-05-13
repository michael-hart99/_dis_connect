'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const HOST = "www.thejobdance.com";
const PORT = 789;

const CONN = new WebSocket("wss://" + HOST + ":" + PORT, 'request-projector');

const my_id = "projector";

CONN.onerror = 
  (err) => console.log('server\'s error: ' + err);

async function sendSignal(to, action, data) {
  let count = 0;
  while (CONN.readyState === 0 && count < 400) {
    await sleep(5);
    count++;
  }
  if (CONN.readyState === 1) {
    let json = {
      from: my_id,
      to: to,
      action: action,
      data: data
    };
    CONN.send(JSON.stringify(json));
  }
}

CONN.onmessage = function(e){
  console.log(e.data);
  var json = JSON.parse(e.data);

  if(json.action === "candidate"){
    processIce(json.from, json.data);
  } else if(json.action === "offer") {
    processOffer(json.from, json.data)
  } else if(json.action === "disconnect") {
    disconnectStream();
  } else {
    console.log("unexpected action: " + json.action);
  }
}

//////////////
//  WebRTC  //
//////////////

var peerConnection = new RTCPeerConnection();

function openPeerConn() {
  peerConnection.onicecandidate = (e) => {
    if (!peerConnection || !e || !e.candidate)
      return;
    var candidate = e.candidate;
    sendSignal('jo_stream', "candidate", candidate);
    console.log("ICE sent");
  };

  const video = document.querySelector('#vid');
  peerConnection.ontrack = (e) => {
    console.log("stream received");
    if (video.srcObject !== e.streams[0]) {
      video.srcObject = e.streams[0];
    }
  }
  video.hidden = false;
}

function processIce(from, iceCandidate){
  try {
    peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  } catch (e) {}
}

function processOffer(stream_id, offer){
  openPeerConn(0);
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': false,
      'OfferToReceiveVideo': true
    }
  };
  peerConnection.createAnswer(sdpConstraints).then(sdp => {
    peerConnection.setLocalDescription(sdp).then(() => {           
      sendSignal('jo_stream', "answer", sdp);
      console.log("answer sent");
    })
  }, function(err) {
    console.log('error processing offer: ' + err)
  });
};

function disconnectStream() {
  const video = document.querySelector('#vid');
  video.srcObject.getTracks()[0].stop();
  video.hidden = true;
}

