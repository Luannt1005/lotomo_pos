const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Store seen order IDs to avoid duplicate syncs
const seenOrders = new Set();

window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data || event.data.type !== 'GRAB_ORDER_SYNC') {
    return;
  }
  
  // Basic throttling/deduplication (Grab might poll the same data)
  // We will just send the raw data to localhost. The local POS app will figure out what to do.
  
  const targets = [
    'http://localhost:3000/api/sync/grab',
    'https://lotomopos.vercel.app/api/sync/grab'
  ];

  targets.forEach(target => {
    fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: event.data.url,
        payload: event.data.data
      })
    }).catch(err => console.error("Failed to sync grab order to " + target, err));
  });
});
