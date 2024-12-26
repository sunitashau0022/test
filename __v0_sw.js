const DB_NAME = '__v0'
const DB_VERSION = 1
const COMPILED_CACHE_NAME = '/__v0_compiled'

let compiled = null

// Initialize the cache from indexedDB
const db = indexedDB.open(DB_NAME, DB_VERSION)
db.onupgradeneeded = event => {
    const db = event.target.result
    db.createObjectStore('data')
}
db.onsuccess = event => {
    const db = event.target.result
    const tx = db.transaction('data', 'readonly')
    const store = tx.objectStore('data')
    const request = store.get(COMPILED_CACHE_NAME)
    request.onsuccess = event => {
        compiled = event.target.result
    }
}

self.addEventListener('install', () => {
    return self.skipWaiting()
})

self.addEventListener('activate', () => {
    return self.clients.claim()
})
self.addEventListener(fetch, event => {
    fetchHandler(event)
})
self.onfetch = event => {
    fetchHandler(event)
}

let port2 = null
self.addEventListener('message', event => {
    if (!event.data) return
    if (event.data.type === 'v0_init') {
        // Update the compiled data
        compiled = event.data.compiled
        port2 = event.ports[0]

        // Save the compiled data to indexedDB
        const db = indexedDB.open(DB_NAME, DB_VERSION)
        db.onupgradeneeded = event => {
            const db = event.target.result
            db.createObjectStore('data')
        }
        db.onsuccess = event => {
            const db = event.target.result
            const tx = db.transaction('data', 'readwrite')
            const store = tx.objectStore('data')
            store.put(compiled, COMPILED_CACHE_NAME)
        }
    }
})

const currentOrigin = self.location.origin

function fetchHandler(event) {
    if (!compiled) return

    const url = new URL(event.request.url)
    if (url.origin !== currentOrigin) return

    return handleStaticFile(event, url)
}

function handleStaticFile(event, url) {
    const resourcePath = compiled.staticFiles[url.pathname] ?
        url.pathname :
        compiled.staticFiles[url.pathname + '.html'] ?
        url.pathname + '.html' :
        null
    if (resourcePath) {
        const response = new Response(compiled.staticFiles[resourcePath], {
            headers: {
                'Content-Type': getMimeType(resourcePath)
            },
        })
        return event.respondWith(response)
    }
}

// Only text-based files for now
function getMimeType(path) {
    path = path.toLowerCase()
    if (path.endsWith('.html')) return 'text/html'
    if (path.endsWith('.js')) return 'text/javascript'
    if (path.endsWith('.css')) return 'text/css'
    if (path.endsWith('.json')) return 'application/json'
    if (path.endsWith('.svg')) return 'image/svg+xml'
    if (path.endsWith('.xml')) return 'application/xml'
    if (path.endsWith('.txt')) return 'text/plain'
    if (path.endsWith('.md')) return 'text/markdown'
    if (path.endsWith('.csv')) return 'text/csv'
    return 'text/plain'
}