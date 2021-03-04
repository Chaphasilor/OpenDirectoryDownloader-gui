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
let jsonButton = document.querySelector(`#json-button`)
let urlButton = document.querySelector(`#url-button`)

const clipboardButtonText = `Copy Stats to Clipboard`

urlForm.addEventListener(`submit`, performScan)

async function performScan() {

  await api.scanUrl(urlInput.value)
  clearInterval(timeIntervalId)
  
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
  api.on(`scanError`, handleScanError)
  
}

function handleScanUpdate(response) {

  console.log(`response:`, response)
  statusField.innerText = capitalize(response.status)
  
  switch (response.status) {
    case `pending`:
      console.info(response.message)
      output.innerText = response.message
      break;

    case `running`:
      console.log(`Date.now():`, Date.now())
      startTime = Date.now()
      timeIntervalId = setInterval(() => {
        timeField.innerText = formatTime(startTime)
      }, 1000)
      break
  
    default: // finished

      console.log(`timeIntervalId:`, timeIntervalId)
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

      jsonButton.classList.remove(`hidden`)
      jsonButton.addEventListener(`click`, () => {
        downloadUrl(response.scanResult.jsonFile, `OD-Scan_${new URL(response.scanResult.scannedUrl).host}_${new Date().toISOString().substring(0, 10)}.json`)
      })
      urlButton.classList.remove(`hidden`)
      urlButton.addEventListener(`click`, () => {
        downloadUrl(response.scanResult.urlFile, `OD-Scan_${new URL(response.scanResult.scannedUrl).host}_${new Date().toISOString().substring(0, 10)}.txt`)
      })
      

      break;
  }
  
}

function handleScanError(err) {

  
  clearInterval(timeIntervalId)

  statusField.innerText = `Error`
  output.innerText = `\
An error occurred while scanning the Open Directory!
Reason: ${err.reason}
Additional Info:
${err.additionalPayload}
  `
  output.classList.remove(`hidden`)
  
}

function reset() {

  //TODO reset timer, output fields and element visibility
  // maybe add more constants instead of predefined HTML?
  
}

function downloadUrl(url, filename) {

  let link = document.createElement(`a`)
  link.setAttribute(`href`, url)
  link.setAttribute(`download`, filename)
  link.click()
  
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

function capitalize(input) {
  return input.split(` `).map(x => x[0].toUpperCase() + x.split(``).splice(1).join(``)).join(``)
}


// !! IMPORTANT: !!
// Webpack doesn't automatically assing global variables to the window context when importing the bundle
// Assign all variables, functions and classes, that you want to be accessible from html, to the window context

