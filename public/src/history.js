const historyKey = `history`

export function createHistory() {

  const history = {
    entries: [],
  }
  localStorage.setItem(historyKey, JSON.stringify(history))

  return history
  
}

export function loadHistory() {

  const history = JSON.parse(localStorage.getItem(historyKey))
  if (history !== null) {

    return history
    
  } else {
    return createHistory()
  }
  
}

export function saveHistory(newHistory) {
  
  localStorage.setItem(historyKey, JSON.stringify(newHistory))
  
}

export function fetchEntry(timestamp) {
  return JSON.parse(localStorage.getItem(timestamp))
}

export function fetchEntries(history) {

  // fetch all entries
  history.entries = history.entries.map(proxyEntry => {
    return JSON.parse(localStorage.getItem(proxyEntry.timestamp))
  })

  return history
  
}

export function addEntry(entry) {

  const history = loadHistory()
  const timestamp = new Date().toISOString()
  localStorage.setItem(timestamp, JSON.stringify(entry))

  history.entries.push({
    timestamp,
    url: entry.url,
  })
  saveHistory(history)
  
}