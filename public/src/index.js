// import *any file or dependency (module)* that you want to bundle here

import API from './api';

// regular javascript goes below

let api

let scanButton = document.querySelector(`#scan-button`)
let urlInput = document.querySelector(`#url`)

scanButton.addEventListener(`click`, performScan)

function performScan() {

  api.scanUrl(urlInput.value)
  
}

window.onload = function() {

  api = new API(`ws://127.0.0.1`)
  api.connectToServer()
  
}

// !! IMPORTANT: !!
// Webpack doesn't automatically assing global variables to the window context when importing the bundle
// Assign all variables, functions and classes, that you want to be accessible from html, to the window context

