import ServerManager from "./ServerManager";

type ServerMessage = {
  to: string | number,
  from: string | number,
  action: string,
  data: any
}

class WebRTCTools {
  /**
   * Creates and returns a new peer connection. Uses the given
   *     server connection to send candidate information to the
   *     specified recipient.
   * 
   * @param {ServerManager} The server that should be used to send info
   *     about new ICE candidates.
   * @param {String}        The ID of the peer that this connection is
   *     connecting to.
   *
   * @return {RTCPeerConnection} The newly prepared peer connection.
   */
  static createPeerConn(SM : ServerManager, to : string | number) {
    let peerConn = new RTCPeerConnection();

    peerConn.onicecandidate = (e) => {
      if (!peerConn || !e || !e.candidate)
        return;
      var candidate = e.candidate;
      SM.sendSignal(to, "candidate", candidate);
      console.log("ICE sent");
    };

    return peerConn;
  }

  /**
   * Attempts to get video from the user's camera and adds it to the
   *     given peer connection. Additionally places the video in the 
   *     local webpage using the specified element's ID.
   *
   * @param {RTCPeerConnection} peerConn The connection that this
   *     camera's video will be attached to.
   * @param {String}            videoID  The ID of the element that this
   *     camera's video will stream to.
   */
  static async startStream(peerConn : RTCPeerConnection, videoID : string) {
    const video = <HTMLVideoElement> document.getElementById(videoID);
    const stream = await navigator.mediaDevices.getUserMedia(
                            {video: {
                               facingMode: 'environment',
                             }, 
                             audio: false});
    
    if (video !== null) {
      video.srcObject = stream;
      video.hidden = false;
    } else {
      console.log("Could not access element with id %s", videoID);
    }
    peerConn.addTrack(stream.getVideoTracks()[0], stream);
  }

  /**
   * Applies received candidate information to the given connection.
   *
   * @param {RTCPeerConnection} peerConn The connection that this candidate
   *     should be added to.
   * @param {Object}            json     Information about the received
   *     signal including candidate information.
   */
  static receiveCandidate(peerConn : RTCPeerConnection, json : ServerMessage) {
    try {
      peerConn.addIceCandidate(new RTCIceCandidate(json.data));
    } catch (e) {}
  }

  /**
   * Creates an offer and sends it to the specified peer.
   * 
   * @param {ServerManager}     SM       The server to be used to send
   *     connection info through.
   * @param {RTCPeerConnection} peerConn The peer the offer will be sent to.
   * @param {String}            to       The ID of the other peer in the
   *     connection.
   */
  static sendOffer(SM : ServerManager, peerConn : RTCPeerConnection, to : string) {
    const sdpConstraints = { offerToReceiveAudio: false,  
                             offerToReceiveVideo: true };
    peerConn.createOffer(sdpConstraints).then(sdp => {
      peerConn.setLocalDescription(sdp);
      SM.sendSignal(to, "offer", sdp);
      console.log("offer sent");
    });
  }

  /**
   * Takes a given offer and creates an answer to be sent to the given peer.
   *
   * @param {ServerManager}     SM       The server to be used to send
   *     connection info through.
   * @param {RTCPeerConnection} peerConn The peer the offer will be sent to.
   * @param {Object}            json     Information about the received
   *     signal, including offer information.
   */
  static receiveOffer(SM : ServerManager, peerConn : RTCPeerConnection, json : ServerMessage) {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    const sdpConstraints = { offerToReceiveAudio: false,  
                             offerToReceiveVideo: true };
    peerConn.createAnswer(sdpConstraints).then(sdp => {
      peerConn.setLocalDescription(sdp).then(() => {           
        SM.sendSignal(json.from, "answer", sdp);
        console.log("answer sent");
      })
    }, function(err) {
      console.log('error processing offer: ' + err)
    });
  }

  /**
   * Takes an answer and completes the RTC connection.
   *
   * @param {RTCPeerConnection} peerConn The peer that is receiving the 
   *     answer.
   * @param {Object}            json     Information about the received
   *     signal, including answer information.
   */
  static receiveAnswer(peerConn : RTCPeerConnection, json : ServerMessage) {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    console.log("processed answer");
  }
}

export default WebRTCTools;

