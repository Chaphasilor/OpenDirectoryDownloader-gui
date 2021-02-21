// import *any file or dependency (module)* that you want to bundle here

import API from './api';
import marked from 'marked'

// regular javascript goes below

let api

let urlForm = document.querySelector(`#url-form`)
let urlInput = document.querySelector(`#url`)
let statusField = document.querySelector(`#status`)
let timeField = document.querySelector(`#time`)
let output = document.querySelector(`#output`)
let clipboardButton = document.querySelector(`#clipboard-button`)

const clipboardButtonText = `Copy Stats Table to Clipboard`

urlForm.addEventListener(`submit`, performScan)

function performScan() {

  api.scanUrl(urlInput.value)
  
}

let timeIntervalId
let startTime

window.onload = function() {

  let host
  if (new URL(document.location).protocol === `https`) {
    host = location.origin.replace(/^https/, 'wss')
  } else {
    host = location.origin.replace(/^http/, 'ws')
  }
  api = new API(host)
  api.connectToServer().catch(err => {
    console.error(`Error while connecting to backend:`, err)
  })
  
  api.on(`scanUpdate`, handleScanUpdate)
  
}

function handleScanUpdate(response) {

  console.log(`response:`, response)
  statusField.innerText = response.status
  
  switch (response.status) {
    case `pending`:
      console.info(response.message)
      output.innerText = response.message
      break;

    case `running`:
      startTime = Date.now()
      timeIntervalId = setInterval(() => {
        timeField.innerText = formatTime(startTime)
      }, 1000)
      break
  
    default: // finished

      clearInterval(timeIntervalId)
      // output.innerText = JSON.stringify(response)

      try {

        output.innerHTML = marked(response.scanResult.reddit)
        output.getElementsByTagName(`table`)[0].id = `stats-table`
        output.classList.remove(`hidden`)

        clipboardButton.innerText = clipboardButtonText
        clipboardButton.classList.remove(`hidden`)
        clipboardButton.addEventListener(`click`, () => {
          navigator.clipboard.writeText(response.scanResult.reddit);
          clipboardButton.innerText = `Copied Successfully!`
          setTimeout(() => clipboardButton.innerText = clipboardButtonText, 2500  )
        })
          
      } catch (err) {
        console.error(`Failed to parse markdown!:`, err)
      }
      

      break;
  }
  
}

function reset() {

  //TODO reset timer, output fields and element visibility
  // maybe add more constants instead of predefined HTML?
  
}

function formatTime(startTime){
  let updatedTime = new Date().getTime();
  let difference =  updatedTime - startTime;
  let hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((difference % (1000 * 60)) / 1000);
  hours = (hours < 10) ? `0` + hours : hours;
  minutes = (minutes < 10) ? `0` + minutes : minutes;
  seconds = (seconds < 10) ? `0` + seconds : seconds;
  return `${hours}:${minutes}:${seconds}`;
}


// !! IMPORTANT: !!
// Webpack doesn't automatically assing global variables to the window context when importing the bundle
// Assign all variables, functions and classes, that you want to be accessible from html, to the window context

