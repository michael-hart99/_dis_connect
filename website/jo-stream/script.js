'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const HOST = "www.thejobdance.com";
const PORT = 789;

const CONN = new WebSocket("wss://" + HOST + ":" + PORT, 'request-jo-stream');

CONN.onerror = 
  (err) => console.log('server\'s error: ' + err);

async function sendSignal(to, action, data) {
  let count = 0;
  while (CONN.readyState === 0 && count < 400) {
    await sleep(5);
    count++;
  }
  if (CONN.readyState === 1) {
    CONN.send(JSON.stringify({
      from: 'jo_stream',
      to: to,
      action: action,
      data: data
    }));
  }
}

CONN.onmessage = function(e){ 
  var json = JSON.parse(e.data);
  
  if (json.action === "candidate"){
    processIce(json.from, json.data);
  } else if(json.action === "answer"){
    processAnswer(json.from, json.data);
  } else {
    console.log("unexpected action: " + json.action);
  }
}

//////////////
//  WebRTC  //
//////////////

var pc;
var stream_pc;

async function createConn() {
  pc = new RTCPeerConnection();
  stream_pc = new RTCPeerConnection();
  const video = document.querySelector('#vid');
  const stream = await navigator.mediaDevices.getUserMedia(
                          {video: {facingMode: 'environment'}, audio: false});

  video.srcObject = stream;
  video.hidden = false;
  pc.addTrack(stream.getVideoTracks()[0], stream);
  stream_pc.addTrack(stream.getVideoTracks()[0], stream);

  pc.onicecandidate = (e) => {
    if (!pc || !e || !e.candidate)
      return;
    var candidate = e.candidate;
    sendSignal("projector", "candidate", candidate);
    console.log("ICE sent");
  };

  sendOffers();
}

function sendOffers() {
  var sdpConstraints = { offerToReceiveAudio: false,  
	                 offerToReceiveVideo: true };
  pc.createOffer(sdpConstraints).then(sdp => {
    pc.setLocalDescription(sdp);
    sendSignal("projector", "offer", sdp);
    console.log("offer sent to projector");
  });
}

function processIce(from, iceCandidate) {
  try {
    if (from === "projector") {
      pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
    } else if (from === "stream_host") {
      stream_pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
    }
  } catch (e) {}
}

function processAnswer(from, answer) {
  if (from === "projector") {
    pc.setRemoteDescription(new RTCSessionDescription(answer));
  } else if (from === "stream_host") {
    stream_pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
  console.log("processed answer");
  return true;
};

///////////////////////////////

function disconnectStream() {
  const video = document.getElementById('vid');
  video.hidden = true;
  video.srcObject.getTracks()[0].stop();
  sendSignal("projector", 'disconnect');
}

function beginVid() {
  sendSignal("all", 'begin_video');
}

function resetVid() {
  sendSignal("all", 'reset_video');
}

function blackout() {
  sendSignal("all", 'blackout');
}

function multiStream() {
  console.log('button pushed');
  sendSignal("all", "can_stream");
}

document.querySelector('#run').addEventListener('click', createConn);
document.querySelector('#disconnect').addEventListener('click', disconnectStream);
document.querySelector('#begin_vid').addEventListener('click', beginVid);
document.querySelector('#reset_vid').addEventListener('click', resetVid);
document.querySelector('#blackout').addEventListener('click', blackout);
document.querySelector('#multi_stream').addEventListener('click', multiStream);

