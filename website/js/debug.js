function logApiCall(endpoint, response) {
  console.log(`API call to ${endpoint}`, response);
  // Add to page debug panel
  document.getElementById('debug').innerHTML += 
    `<div>${new Date().toISOString()}: ${endpoint} - ${response.status}\</div>`;
}
