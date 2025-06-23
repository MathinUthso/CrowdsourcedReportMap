const settings = {
  backendUrl: 'http://127.0.0.1:3000',
  googleMapsAPIKey: 'API_KEY_GOES_HERE',
  mapDefaultLocation: {
    lat: 48.5,
    lng: 30.0
  },
  mapCenterOnUsersLocationInBounds: {
    latmin: 40.0,
    lngmin: 15.0,
    latmax: 60.0,
    lngmax: 45.0
  },
  title: 'Crowdsourced GeoTracker',
  aboutText: `
    <div>
      <b>Crowdsourced GeoTracker</b> usage:
      <ul style="margin: 0.5rem 0">
        <li><b>Click anywere on the map</b> to report your sighting. You can <b>add a photo</b> too.</li>
        <li><b>Watch the map</b> to see <b>where the recent sightings</b> are.</li>
        <li>You can check where the sightings were in the past by using the controls on the right.</li>
      </ul>
      <div style="font-size: 0.9rem; margin-top: 1rem;">This is an open-source project. Anyone can get it <a href="https://github.com/certicky/crowdsourced-geotracker" target="_blank">from GitHub</a> and deploy their own copy in minutes.</div>
    </div>
    <div style="padding-top: 1rem; padding-left: 1rem;"><a href="https://github.com/certicky/crowdsourced-geotracker" target="_blank"><img src="res/github.png" title="View on GitHub" /></a></div>
  `
}
