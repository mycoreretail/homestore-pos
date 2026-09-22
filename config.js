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
  // Optional: Google Maps key for address autocomplete as you type (Places API). Restrict the key to your site in Google Cloud.
  googleMapsKey: "AIzaSyClioVX0HlLRAMWZmBNkK-NYU-TL40Sw24",
  country: "us",
  // Your relay service (vendor APIs, live stock, card terminals, address lookup)
  relayUrl: "https://relay.homestorepos.com",
  // Must match RELAY_TOKEN on the relay server
  relayToken: "Mem6msXR9epJz3fHgFZmgvJnJPR_vFYBIcswmNipbsn3aIzW"
};
