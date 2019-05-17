class WebRTCTools {
  static createPeerConn(SM, to) {
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

  static async startStream(peerConn, streamID) {
    const video = document.getElementById(streamID);
    const stream = await navigator.mediaDevices.getUserMedia(
                            {video: {
                               facingMode: 'environment',
                               frameRate: {ideal: 20, max: 30}
                             }, 
                             audio: false});

    video.srcObject = stream;
    video.hidden = false;
    peerConn.addTrack(stream.getVideoTracks()[0], stream);
  }

  static receiveCandidate(peerConn, json) {
    try {
      peerConn.addIceCandidate(new RTCIceCandidate(json.data));
    } catch (e) {}
  }

  static sendOffer(SM, peerConn, to) {
    const sdpConstraints = { offerToReceiveAudio: false,  
                             offerToReceiveVideo: true };
    peerConn.createOffer(sdpConstraints).then(sdp => {
      peerConn.setLocalDescription(sdp);
      SM.sendSignal(to, "offer", sdp);
      console.log("offer sent");
    });
  }

  static receiveOffer(SM, peerConn, json) {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    var sdpConstraints = {
      'mandatory': {
        'OfferToReceiveAudio': false,
        'OfferToReceiveVideo': true
      }
    };
    peerConn.createAnswer(sdpConstraints).then(sdp => {
      peerConn.setLocalDescription(sdp).then(() => {           
        SM.sendSignal(json.from, "answer", sdp);
        console.log("answer sent");
      })
    }, function(err) {
      console.log('error processing offer: ' + err)
    });
  }

  static receiveAnswer(peerConn, json) {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    console.log("processed answer");
  }
}

export default WebRTCTools;

