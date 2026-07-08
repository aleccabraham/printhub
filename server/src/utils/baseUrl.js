// Builds the base URL from the incoming request so links in emails point at
// whichever address the browser actually used to reach the server (localhost
// or a LAN IP) — no hardcoded host/IP config needed.
function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

module.exports = { getBaseUrl };
