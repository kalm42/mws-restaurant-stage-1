/**
 * Register the service worker
 */
if (navigator.serviceWorker) {
    console.log('👷‍♂️ Starting Service Worker');

    navigator.serviceWorker.register('/sw.js')
        .then((worker) => {
            if (worker.installing) {
                console.log('⚙️ Service worker installing.', worker);
                return;
            } else if (worker.waiting) {
                console.log('⚙️ Service worker is waiting.', worker);
                return;
            } else if (worker.active) {
                console.log('⚙️ Service worker is active.', worker);
                return;
            }
            return;
        })
        .catch((err) => {
            console.log(`Service worker failed with ${err}.`);
        })
}

/**
 * Initalize IndexedDB
 */
const IDB_NAME = 'restaurant_reviews';
const IDB_VERSION = 1;
const db = idb.open(IDB_NAME, IDB_VERSION, (upgradeDB) => {
    upgradeDB.createObjectStore('rr');
})
