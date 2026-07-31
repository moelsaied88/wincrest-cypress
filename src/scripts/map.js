(function () {
  'use strict';

  var node = document.getElementById('mapdata');
  var host = document.getElementById('leaflet');
  if (!node || !host || typeof L === 'undefined') return;

  var data;
  try {
    data = JSON.parse(node.textContent);
  } catch (e) {
    return;
  }

  var colors = {};
  data.acts.forEach(function (a) {
    colors[a.id] = a.color;
  });

  var map = L.map(host, { scrollWheelZoom: false, zoomControl: true });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  var bounds = [];

  data.places.forEach(function (p) {
    var marker = L.circleMarker(p.coords, {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: colors[p.act] || '#5f7050',
      fillOpacity: 1,
    }).addTo(map);

    var link = p.url
      ? '<a href="' + p.url + '" target="_blank" rel="noopener">' + p.name + '</a>'
      : p.name;
    marker.bindPopup(
      '<b>' + link + '</b>' + p.blurb + (p.distance ? '<em>' + p.distance + '</em>' : '')
    );
    marker.bindTooltip(p.name, { direction: 'top', offset: [0, -8] });
    bounds.push(p.coords);
  });

  if (data.home && data.home.coords) {
    var home = L.marker(data.home.coords, {
      icon: L.divIcon({
        className: 'home-pin',
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      zIndexOffset: 1000,
      title: data.home.label,
    }).addTo(map);
    home.bindPopup('<b>' + data.home.label + '</b>' + (data.home.note || ''));
    bounds.push(data.home.coords);
  }

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [42, 42] });
  } else {
    map.setView([29.95, -95.6], 11);
  }

  /* Scroll-wheel zoom stays off until the map is deliberately clicked, so the
     map never hijacks a scroll down the page on a trackpad. */
  map.on('click', function () {
    map.scrollWheelZoom.enable();
  });
  map.on('mouseout', function () {
    map.scrollWheelZoom.disable();
  });

  var legend = document.getElementById('map-legend');
  if (legend) {
    legend.innerHTML = data.acts
      .map(function (a) {
        return '<span><i style="background:' + a.color + '"></i>' + a.label + '</span>';
      })
      .join('') + '<span><i style="background:#2a2823"></i>The house</span>';
  }
})();
