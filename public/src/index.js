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

  let host = location.origin.replace(/^http/, 'ws')
  api = new API(host)
  api.connectToServer().catch(err => {
    console.error(`Error while connecting to backend:`, err)
  })
  window.api = api
  
}


// !! IMPORTANT: !!
// Webpack doesn't automatically assing global variables to the window context when importing the bundle
// Assign all variables, functions and classes, that you want to be accessible from html, to the window context

