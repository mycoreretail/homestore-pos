// HomeStore POS — site configuration (this file is public; never put vendor keys or processor secrets here)
window.HS_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCa6Ud1sXAUKtU2JUDGshhdEVMA7vxEoP8",
    authDomain: "homestore-pos.firebaseapp.com",
    projectId: "homestore-pos",
    storageBucket: "homestore-pos.firebasestorage.app",
    messagingSenderId: "506752189635",
    appId: "1:506752189635:web:c3c2235c604ca886bf4e76"
  },
  // Your relay service, once deployed (vendor APIs, live stock, card terminals). Leave "" until then.
  relayUrl: "",
  // Must match RELAY_TOKEN on the relay server
  relayToken: ""
};
