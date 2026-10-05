'use strict';
// Keep the bundled release link usable when the API is unavailable.
(async () => {
  try {
    const response = await fetch('https://api.github.com/repos/SonnySipido/thaes-replay-explorer/releases/latest');
    if (!response.ok) return;
    const release = await response.json();
    const installer = (release.assets || []).find(asset => /Setup-x64\.exe$/.test(asset.name));
    if (!installer || !installer.browser_download_url.startsWith('https://github.com/SonnySipido/thaes-replay-explorer/releases/download/')) return;
    document.getElementById('download-link').href = installer.browser_download_url;
    document.getElementById('release-version').textContent = 'Version ' + release.tag_name.replace(/^v/, '');
  } catch { /* The static installer link remains available. */ }
})();
