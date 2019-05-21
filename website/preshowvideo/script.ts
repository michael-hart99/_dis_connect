'use strict';

import { ServerMessage, StateInfo } from '../../server/ServerInfo';
import { ServerManager } from '../ServerManager';
import { WebRTCTools } from '../WebRTCTools';

// The server connection that will send/receive messages
const SM = new ServerManager('preshow');

// The RTC connection with the streamHost
var pc: RTCPeerConnection;

/**
 * Initializes a PeerConnection and opens the camera's video stream.
 */
async function initConn(): Promise<void> {
  const button = document.querySelector('#stream-button') as HTMLDivElement;
  button.hidden = true;

  pc = WebRTCTools.createPeerConn(SM, 'streamHost');

  await WebRTCTools.startStream(pc, 'stream');

  WebRTCTools.sendOffer(SM, pc, 'streamHost');
}

/**
 * Updates the RTC connection with the given ICE candidate information.
 *
 * @param {ServerMessage} json A message with ICE candidate information.
 */
function processCandidate(json: ServerMessage): void {
  WebRTCTools.receiveCandidate(pc, json);
}

/**
 * Updates the RTC connection with the given answer details.
 *
 * @param {ServerMessage} json A message with peer session description information.
 */
function processAnswer(json: ServerMessage): void {
  WebRTCTools.receiveAnswer(pc, json);
}

/**
 * Hides all buttons and stop all videos.
 */
function processBlackout(): void {
  const preshow = document.querySelector('#preshow-vid') as HTMLVideoElement;
  const button = document.querySelector('#stream-button') as HTMLDivElement;
  const stream = document.querySelector('#stream') as HTMLVideoElement;

  preshow.hidden = true;
  button.hidden = true;
  stream.hidden = true;
  preshow.pause();

  // Signal the streamHost that this connection is being dropped
  SM.sendSignal('streamHost', 'disconnect', null);

  if (stream.srcObject instanceof MediaStream) {
    stream.srcObject.getVideoTracks()[0].stop();
  }
  stream.srcObject = null;
}

/**
 * Start playing the embedded video at the time indicated in the message.
 *
 * @param {ServerMessage} json A message containing the current video time.
 */
function processBeginVideo(json: ServerMessage): void {
  const preshow = document.querySelector('#preshow-vid') as HTMLVideoElement;
  const button = document.querySelector('#stream-button') as HTMLDivElement;
  const stream = document.querySelector('#stream') as HTMLVideoElement;

  button.hidden = true;
  stream.hidden = true;

  // Signal the streamHost that this connection is being dropped
  SM.sendSignal('streamHost', 'disconnect', null);

  if (stream.srcObject instanceof MediaStream) {
    stream.srcObject.getVideoTracks()[0].stop();
  }
  stream.srcObject = null;

  // If too many videos are open on one machine, the video will stall and stop.
  if (preshow.readyState >= 2) {
    // Enough data is loaded
    preshow.play();
    preshow.currentTime =
      ((Date.now() - Number(json.data)) / 1000.0) % preshow.duration;
    preshow.hidden = false;
  } else {
    preshow.oncanplaythrough = (): void => {
      preshow.oncanplaythrough = null;
      preshow.play();
      preshow.currentTime =
        ((Date.now() - Number(json.data)) / 1000.0) % preshow.duration;
      preshow.hidden = false;
    };
  }
}

/**
 * Stop and hide videos, revealing the stream button.
 */
function processCanStream(): void {
  processBlackout();

  const button = document.querySelector('#stream-button') as HTMLDivElement;
  button.hidden = false;
}

/**
 * Sets the state of the webpage (intended to be one of the first messages
 *     received). The state describes what buttons/videos are visible.
 *
 * @param {ServerMessage} json A message containing state information.
 */
function processSetState(json: ServerMessage): void {
  let data = json.data as StateInfo;

  switch (data.state) {
    case 'idle':
      break;
    case 'beginVideo':
      if (data.originTime !== null) {
        json.data = data.originTime;
        processBeginVideo(json);
      }
      break;
    case 'blackout':
      break;
    case 'canStream':
      const preshow = document.querySelector(
        '#preshow-vid'
      ) as HTMLVideoElement;
      const button = document.querySelector('#stream-button') as HTMLDivElement;
      const stream = document.querySelector('#stream') as HTMLVideoElement;

      preshow.hidden = true;
      button.hidden = false;
      stream.hidden = true;
      break;
    default:
      console.log('Unexpected initialize state: %s', data.state);
      break;
  }
}

////////////////////////

// Add action handlers to run when messages are received
SM.addHandler('candidate', processCandidate);
SM.addHandler('answer', processAnswer);
SM.addHandler('setState', processSetState);
SM.addHandler('blackout', processBlackout);
SM.addHandler('beginVideo', processBeginVideo);
SM.addHandler('canStream', processCanStream);

// Add event to the HTML button
(document.querySelector('#stream-button') as HTMLDivElement).addEventListener(
  'click',
  initConn
);
