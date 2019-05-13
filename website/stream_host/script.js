'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const HOST = "www.thejobdance.com";
const PORT = 789;

const CONN = new WebSocket("wss://" + HOST + ":" + PORT, 'request-stream-host');

const my_id = "stream_host";

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
  var json = JSON.parse(e.data);
  
  console.log("received %s from %s", json.action, json.from);

  if (json.action === "candidate") {
    processIce(json.from, json.data);
  } else if (json.action === "offer") {
    processOffer(json.from, json.data)
  } else if (json.action === "disconnect") {
    disconnectStream(json.from);
  } else {
    console.log("unexpected action: " + json.action);
  }
}

//////////////
//  WebRTC  //
//////////////

var pcs = new Map();
var streams = new Map();

var inUse = [0,0,0,0,0,0,0,0,0]
var flickering = false;

function openPeerConn(from) {
  let peerConnection = new RTCPeerConnection();
  pcs.set(from, peerConnection);
  
  peerConnection.onicecandidate = (e) => {
    if (!peerConnection || !e || !e.candidate)
      return;
    let candidate = e.candidate;
    sendSignal(from, "candidate", candidate);
    console.log("ICE sent");
  };
  
  let video = document.querySelector('#stream' + (from % 9 + 1));
  peerConnection.ontrack = (e) => {
    console.log("stream received");
    if (video.srcObject !== e.streams[0]) {
      video.srcObject = e.streams[0];
      streams.set(from, e.streams[0]);
      inUse[from % 9] = from;
      console.log(inUse);
    }
  }
  
  if (!flickering) {
    flickering = true;
    flicker();
  }
}

function processIce(from, iceCandidate){
  let peerConnection = pcs.get(from);
  try {
    peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  } catch (e) {}
}

function processOffer(from, offer){
  openPeerConn(from);

  let peerConnection = pcs.get(from);

  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': false,
      'OfferToReceiveVideo': true
    }
  };
  peerConnection.createAnswer(sdpConstraints).then(sdp => {
    peerConnection.setLocalDescription(sdp).then(() => {           
      sendSignal(from, "answer", sdp);
      console.log("answer sent");
    })
  }, function(err) {
    console.log('error processing offer: ' + err)
  });
};

////////////////////////

async function flicker() {
  let chosen_id = Math.floor(Math.random() * streams.size + 1);
  let chosen_stream = Array.from(streams.keys())[chosen_id];
  let chosen_view = Math.floor(Math.random()*9 + 1);

  let video = document.querySelector('#stream' + (chosen_view % 9 + 1));
  video.srcObject = streams[chosen_stream];
  
  await sleep(Math.random() * 10000 + 5000);
  flicker();
  console.log("flickered");
}

function disconnectStream(from) {
  try {
    pcs.delete(from);
    streams.delete(from);
  } catch (e) {}
}

