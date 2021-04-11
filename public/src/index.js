// import *any file or dependency (module)* that you want to bundle here

import API from './api';
import marked from 'marked'

// regular javascript goes below

let api

const urlForm = document.querySelector(`#url-form`)
const urlInput = document.querySelector(`#url`)
const advancedOptionInputs = {
  speedtest: document.querySelector(`#speedtest-checkbox`),
  fastScan: document.querySelector(`#fastScan-checkbox`),
  uploadUrlFile: document.querySelector(`#uploadUrlFile-checkbox`),
  exactSizes: document.querySelector(`#exactSizes-checkbox`),
  uploadScan: document.querySelector(`#uploadScan-checkbox`),
  auth: {
    username: document.querySelector(`#username-textfield`),
    password: document.querySelector(`#password-textfield`),
  }
}
const statusField = document.querySelector(`#status`)
const timeField = document.querySelector(`#time`)
const output = document.querySelector(`#output`)
const clipboardButton = document.querySelector(`#clipboard-button`)
const jsonButton = document.querySelector(`#json-button`)
let urlButton = document.querySelector(`#url-button`)

const notificationCard = document.querySelector(`#notification-card`)
const notificationCardButton = document.querySelector(`#notification-card-button`)
const notificationCardDismissButton = document.querySelector(`#notification-card-dismiss-button`)
const notificationCardOutput = document.querySelector(`#notification-card-output`)

const clipboardButtonText = `Copy Stats to Clipboard`

urlForm.addEventListener(`submit`, performScan)

async function performScan() {

  let advancedOptions = {
    speedtest: advancedOptionInputs.speedtest.checked,
    fastScan: advancedOptionInputs.fastScan.checked,
    uploadUrlFile: advancedOptionInputs.uploadUrlFile.checked,
    exactSizes: advancedOptionInputs.exactSizes.checked,
    uploadScan: advancedOptionInputs.uploadScan.checked,
  }

  advancedOptions.auth = {}
  
  if (advancedOptionInputs.auth.username.value !== ``) {
    advancedOptions.auth.username = advancedOptionInputs.auth.username.value
  }
  
  if (advancedOptionInputs.auth.password.value !== ``) {
    advancedOptions.auth.password = advancedOptionInputs.auth.password.value
  }
  
  await api.scanUrl(urlInput.value, advancedOptions)
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

      if (`Notification` in window && Notification.permission === `default`) { // not granted, not denied
        showNotificationCard();
      }
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

        if (!navigator.clipboard) {
          clipboardButton.disabled = true
          clipboardButton.title = `Copying to clipboard is not available!`
        } else {
          clipboardButton.addEventListener(`click`, () => {
            navigator.clipboard.writeText(response.scanResult.reddit);
            clipboardButton.innerText = `Copied Successfully!`
            setTimeout(() => clipboardButton.innerText = clipboardButtonText, 2500  )
          })
        }

      } catch (err) {
        console.error(`Failed to parse markdown!:`, err)
      }

      // show buttons
      jsonButton.classList.remove(`hidden`)
      jsonButton.addEventListener(`click`, () => {
        downloadUrl(response.scanResult.jsonFile, `OD-Scan_${new URL(response.scanResult.scannedUrl).host}_${new Date().toISOString().substring(0, 10)}.json`)
      })
      urlButton.classList.remove(`hidden`)
      urlButton.addEventListener(`click`, () => {
        downloadUrl(response.scanResult.urlFile, `OD-Scan_${new URL(response.scanResult.scannedUrl).host}_${new Date().toISOString().substring(0, 10)}.txt`)
      })
      
      // hide notification card
      notificationCard.classList.add(`hidden`) // adding the class multiple times is fine
      // show notification if page is in background
      if (Notification.permission === `granted` && document.visibilityState !== `visible`) {

        console.log(`Showing notification...`)
        let notification = new Notification(`Scan is done!`, {
          lang: `en-US`,
          body: `The scan of '${urlInput.value}' is finished, click to see the results!`,
          tag: urlInput.value, //TODO make the tag more unique or remember the scanned url somewhere
          renotify: true,
        })

        notification.addEventListener(`click`, () => {
          // not sure if I want to do something special here...
        })

        document.addEventListener(`visibilitychange`, function() {
          if (document.visibilityState === `visible`) {
            // The tab has become visible so clear the now-stale Notification.
            notification.close();
          }
        });
        
      }

      break;
  }
  
}

function handleScanError(err) {

  // hide notification card
  notificationCard.classList.add(`hidden`) // adding the class multiple times is fine
  
  clearInterval(timeIntervalId)

  statusField.innerText = `Error`
  output.innerText = `\
An error occurred while scanning the Open Directory!
Reason: ${err.reason}
${err.additionalPayload ? `Additional Info: ${err.additionalPayload}` : ``}
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

function showNotificationCard() {

  notificationCardOutput.textContent = ``
  notificationCard.classList.remove(`hidden`)

  notificationCardDismissButton.addEventListener(`click`, () => {
    notificationCard.classList.add(`hidden`)
  })
  
  notificationCardButton.addEventListener(`click`, async () => {

    const permission = await Notification.requestPermission()
    console.info(`Notification permission status:`, permission)

    if ([`granted`, `denied`].includes(permission)) {
      notificationCard.classList.add(`hidden`)
    } else {
      notificationCardOutput = `Sorry, something went wrong. Please try that again.`
    }
    
  })

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

setInterval(() => {
  fetch(`/keepalive`)
}, 1000*60*5)


// !! IMPORTANT: !!
// Webpack doesn't automatically assing global variables to the window context when importing the bundle
// Assign all variables, functions and classes, that you want to be accessible from html, to the window context

