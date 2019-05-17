'use strict';

import ServerManager from "../ServerManager.js";
import WebRTCTools   from "../WebRTCTools.js"

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

async function initConn() {
  const button = document.querySelector('#stream-button');
  const video = document.querySelector('#stream');
  button.hidden = true;

  pc = WebRTCTools.createPeerConn(SM, "stream_host");

  await WebRTCTools.startStream(pc, "stream");

  WebRTCTools.sendOffer(SM, pc, "stream_host");
}

function processCandidate(json) {
  WebRTCTools.receiveCandidate(pc, json);
}

function processAnswer(json) {
  WebRTCTools.receiveAnswer(pc, json);
}

///////////////////////////////

function processBlackout() {
  const preshow = document.querySelector('#preshow-vid');
  const button = document.querySelector('#stream-button');
  const stream = document.querySelector('#stream');
  
  preshow.hidden = true;
  preshow.pause();
  button.hidden = true;
  stream.hidden = true;

  SM.sendSignal("stream_host", "disconnect");
  
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

document.querySelector('#stream-button').addEventListener('click', initConn);

