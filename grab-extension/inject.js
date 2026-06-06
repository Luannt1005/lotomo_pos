(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
    
    // Catch everything to find the correct endpoint
    if (url.includes('grab.com')) {
      response.clone().json().then(data => {
        window.postMessage({ type: 'GRAB_ORDER_SYNC', data: data, url: url }, '*');
      }).catch(e => {});
    }
    return response;
  };

  const originalXHR = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function(method, url) {
    this.addEventListener('load', function() {
      if (url.includes('grab.com')) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({ type: 'GRAB_ORDER_SYNC', data: data, url: url }, '*');
        } catch(e) {}
      }
    });
    originalXHR.apply(this, arguments);
  };
})();
