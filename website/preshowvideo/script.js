'use strict';

import ServerManager from "../ServerManager.js";

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("preshow");

SM.addHandler(  "candidate", processCandidate);
SM.addHandler(     "answer", processAnswer);
SM.addHandler( "initialize", processInitialize);
SM.addHandler(   "blackout", processBlackout);
SM.addHandler("begin_video", processBeginVideo);
SM.addHandler( "can_stream", processCanStream);

//////////////
//  WebRTC  //
//////////////

var pc;

function createConn() {
  const button = document.querySelector('#stream-button');
  const video = document.querySelector('#stream');
  button.hidden = true;

  openPC();
}

async function openPC() {
  pc = new RTCPeerConnection();
  const video = document.querySelector('#stream');
  const stream = await navigator.mediaDevices.getUserMedia(
                          {video: {
			     facingMode: "environment",
			     frameRate: {ideal: 20, max: 30}
			   },
		           audio: false});

  video.srcObject = stream;
  pc.addTrack(stream.getVideoTracks()[0], stream);
  video.hidden = false;

  pc.onicecandidate = (e) => {
    if (!pc || !e || !e.candidate)
      return;
    let candidate = e.candidate;
    SM.sendSignal("stream_host", "candidate", candidate);
    console.log("ICE sent");
  };

  video.hidden = false;

  sendOffer();
}

function sendOffer() {
  const sdpConstraints = { offerToReceiveAudio: false,  
	                 offerToReceiveVideo: true };
  pc.createOffer(sdpConstraints).then(sdp => {
    pc.setLocalDescription(sdp);
    SM.sendSignal("stream_host", "offer", sdp);
    console.log("offer sent");
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
  return true;
};

///////////////////////////////

function processBlackout() {
  const preshow = document.querySelector('#preshow-vid');
  const button = document.querySelector('#stream-button');
  const stream = document.querySelector('#stream');
  preshow.hidden = true;
  preshow.pause();
  button.hidden = true;
  stream.hidden = true;
  if (stream.srcObject !== null) {
    stream.srcObject.getVideoTracks()[0].stop();
  }
  stream.srcObject = undefined;
}

function processBeginVideo(json) {
  const preshow = document.querySelector('#preshow-vid');
  preshow.oncanplay = () => {
    preshow.oncanplay = undefined;
    preshow.play();
    preshow.currentTime = (Date.now() - json.data) / 1000.0;
    preshow.hidden = false;
  }
  preshow.load();
}

function processInitialize(json) {
  SM.setID(json.data.id);

  switch (json.data.state) {
    case "idle":
      break;
    case "begin_video":
      json.data = json.data.origin_time;
      processBeginVideo(json);
      break;
    case "blackout":
      processBlackout();
      break;
    case "can_stream":
      processCanStream();
      break;
    default:
      console.log("Unexpected initialize state: %s", json.data.state);
  }
}

function processCanStream() {
  processBlackout();

  const button = document.querySelector('#stream-button');
  button.hidden = false;
}

document.querySelector('#stream-button').addEventListener('click', createConn);

