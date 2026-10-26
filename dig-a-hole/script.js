// ============================================================
// DIG A HOLE IN EARTH - script.js
//
// This file makes the globe work. It does four jobs:
//   1. Draw a 3D globe of the Earth.
//   2. When you click, drop a red pin where you start digging.
//   3. Work out the exact opposite side of the Earth
//      (scientists call this the "antipode").
//   4. Spin the globe there, drop a green pin, and tell you
//      if you came out on land or splashed into the ocean!
// ============================================================


// ------------------------------------------------------------
// SETTINGS YOU CAN CHANGE
// ------------------------------------------------------------
const START_PIN_COLOR = '#e63946';  // red pin where you dig
const END_PIN_COLOR = '#2a9d8f';    // green pin where you come out
const SPIN_TIME = 4000;             // how long the spin takes (1000 = 1 second)


// ------------------------------------------------------------
// GRAB THE HTML ELEMENTS WE NEED TO UPDATE
// ------------------------------------------------------------
const message = document.getElementById('message');
const results = document.getElementById('results');
const startCoords = document.getElementById('start-coords');
const endCoords = document.getElementById('end-coords');


// ------------------------------------------------------------
// 1. MAKE THE GLOBE
// The map pictures (called "tiles") come free from OpenFreeMap.
// ------------------------------------------------------------
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [78, 20],  // start looking at India [longitude, latitude]
  zoom: 1.5
});

// Once the map style has loaded, turn the flat map into a round globe
map.on('style.load', function () {
  map.setProjection({ type: 'globe' });

  // Hide all the border lines between countries and states
  for (const layer of map.getStyle().layers) {
    if (layer['source-layer'] === 'boundary') {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  }
});


// ------------------------------------------------------------
// THE PINS: we keep track of them so we can remove old ones
// ------------------------------------------------------------
let startPin = null;
let endPin = null;
let isDigging = false;  // true while the globe is spinning


// ------------------------------------------------------------
// 2. WHEN YOU CLICK THE GLOBE, START DIGGING
// ------------------------------------------------------------
map.on('click', function (event) {
  // Don't start a new hole while we are still digging the last one
  if (isDigging) {
    return;
  }
  isDigging = true;

  const lng = event.lngLat.lng;
  const lat = event.lngLat.lat;

  // Take away the pins from the last dig
  if (startPin) startPin.remove();
  if (endPin) endPin.remove();

  // Drop a red pin where you clicked
  startPin = new maplibregl.Marker({ color: START_PIN_COLOR })
    .setLngLat([lng, lat])
    .addTo(map);

  startCoords.textContent = formatPlace(lng, lat);
  endCoords.textContent = '...';
  results.classList.remove('hidden');
  message.textContent = 'Digging... dig... dig... dig...';

  // Wait one second so you can see the red pin, then spin!
  setTimeout(function () {
    spinToOtherSide(lng, lat);
  }, 1000);
});


// ------------------------------------------------------------
// 3. FIND THE OPPOSITE SIDE OF THE EARTH
// To go straight through the middle of the Earth:
//   - Latitude flips: north becomes south (20 becomes -20)
//   - Longitude moves halfway around the world (add 180 degrees)
// ------------------------------------------------------------
function findOtherSide(lng, lat) {
  const otherLat = -lat;
  let otherLng = lng + 180;

  // Longitude must stay between -180 and 180
  if (otherLng > 180) {
    otherLng = otherLng - 360;
  }

  return [otherLng, otherLat];
}


// ------------------------------------------------------------
// 4. SPIN THE GLOBE AND DROP THE GREEN PIN
// ------------------------------------------------------------
function spinToOtherSide(lng, lat) {
  const otherSide = findOtherSide(lng, lat);

  // Fly the camera around the globe to the other side
  map.flyTo({
    center: otherSide,
    zoom: 2.5,
    duration: SPIN_TIME
  });

  // When the camera stops moving, drop the green pin
  map.once('moveend', function () {
    endPin = new maplibregl.Marker({ color: END_PIN_COLOR })
      .setLngLat(otherSide)
      .addTo(map);

    endCoords.textContent = formatPlace(otherSide[0], otherSide[1]);

    // We can only check for water after the map pictures have loaded.
    // map.loaded() tells us if they are ready. If not, wait for 'idle'.
    if (map.loaded()) {
      showLandOrWater(otherSide);
    } else {
      map.once('idle', function () {
        showLandOrWater(otherSide);
      });
    }
  });
}


// ------------------------------------------------------------
// TELL YOU IF YOU LANDED ON LAND OR IN WATER
// ------------------------------------------------------------
function showLandOrWater(lngLat) {
  if (isInWater(lngLat)) {
    message.textContent = 'SPLASH! You came out in the water!';
  } else {
    message.textContent = 'POP! You came out on land!';
  }
  isDigging = false;
}


// ------------------------------------------------------------
// HELPER: is this spot in the ocean (or a lake)?
// We look at what the map drew at that spot. If any of it
// comes from the "water" layer, the answer is yes.
// ------------------------------------------------------------
function isInWater(lngLat) {
  const point = map.project(lngLat);
  const features = map.queryRenderedFeatures(point);

  for (const feature of features) {
    if (feature.sourceLayer === 'water') {
      return true;
    }
  }
  return false;
}


// ------------------------------------------------------------
// HELPER: turn numbers into friendly text like "20.5 N, 78.9 E"
// ------------------------------------------------------------
function formatPlace(lng, lat) {
  const northSouth = lat >= 0 ? 'N' : 'S';
  const eastWest = lng >= 0 ? 'E' : 'W';
  return Math.abs(lat).toFixed(1) + ' ' + northSouth + ', ' +
         Math.abs(lng).toFixed(1) + ' ' + eastWest;
}
