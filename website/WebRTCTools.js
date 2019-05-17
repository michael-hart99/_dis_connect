class WebRTCTools {
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

