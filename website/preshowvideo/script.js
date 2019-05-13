'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const HOST = "www.thejobdance.com";
const PORT = 789;

const CONN = new WebSocket("wss://" + HOST + ":" + PORT, 'request-preshow');

var my_id;

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
      from: my_id,
      to: to,
      action: action,
      data: data
    }));
  }
}

CONN.onmessage = function(e){ 
  var json = JSON.parse(e.data);
	console.log(e.data);
  
  if (json.action === "candidate"){
    processIce(json.data);
  } else if(json.action === "answer"){
    processAnswer(json.data);
  } else if(json.action === "initialize"){
    my_id = json.data.id;
    switch (json.data.state) {
      case "idle":
        break;
      case "pre-show":
        processBeginVideo(json.data.origin_time);
        break;
      case "blackout":
        processBlackout();
        break;
      case "can_stream":
        processBlackout();
        processCanStream();
        break;
      default:
        console.log("Unexpected state: %s", json.data.state);
    }
  } else if(json.action === "blackout"){
    processBlackout();
  } else if(json.action === "begin_video"){
    processBeginVideo(json.data);
  } else if (json.action === "can_stream") {
    processBlackout();
    processCanStream();
  } else {
    console.log("unexpected action: " + json.action);
  }
}

//////////////
//  WebRTC  //
//////////////

var pc;

function createConn() {
  const button = document.querySelector('#stream-button');
  const video = document.querySelector('#stream');
  button.hidden = true;

	console.log("adf");

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
    var candidate = e.candidate;
    sendSignal("stream_host", "candidate", candidate);
    console.log("ICE sent");
  };

  video.hidden = false;

  sendOffer();
}

function sendOffer() {
  var sdpConstraints = { offerToReceiveAudio: false,  
	                 offerToReceiveVideo: true };
  pc.createOffer(sdpConstraints).then(sdp => {
    pc.setLocalDescription(sdp);
    sendSignal("stream_host", "offer", sdp);
    console.log("offer sent");
  });
}

function processIce(iceCandidate) {
  try {
    pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
  } catch (e) {}
}

function processAnswer(answer) {
  pc.setRemoteDescription(new RTCSessionDescription(answer));
  console.log("processed answer");
  return true;
};

///////////////////////////////

function processBlackout() {
  const preshow = document.querySelector('#preshow-vid');
  const button = document.querySelector('#stream-button');
  button.hidden = true;
  preshow.hidden = true;
  preshow.pause();
}

function processBeginVideo(origin_time) {
  const preshow = document.querySelector('#preshow-vid');
  preshow.oncanplay = () => {
    preshow.oncanplay = undefined;
    preshow.play();
    preshow.currentTime = (Date.now() - origin_time) / 1000.0;
    preshow.hidden = false;
  }
  preshow.load();
}

function processCanStream() {
  const button = document.querySelector('#stream-button');

  button.hidden = false;
}

document.querySelector('#stream-button').addEventListener('click', createConn);

