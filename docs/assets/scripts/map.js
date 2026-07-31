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

  var allBounds = [];
  var closeBounds = [];

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
    allBounds.push(p.coords);
    if (p.act !== 'weekend') closeBounds.push(p.coords);
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
    allBounds.push(data.home.coords);
    closeBounds.push(data.home.coords);
  }

  /* Kemah and Space Center are 50+ miles out. Fitting everything at once
     collapses the whole local cluster into an unreadable blob, so open on the
     places you would actually visit on a weekday and offer a control to
     zoom out to the rest. */
  function fitClose() {
    if (closeBounds.length) map.fitBounds(closeBounds, { padding: [42, 42] });
    else map.setView([29.95, -95.6], 11);
  }
  fitClose();

  if (allBounds.length > closeBounds.length) {
    var Toggle = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var wrap = L.DomUtil.create('div', 'leaflet-bar map-toggle');
        var button = L.DomUtil.create('a', '', wrap);
        button.href = '#';
        button.textContent = 'Show weekend trips';
        button.setAttribute('role', 'button');
        var expanded = false;
        L.DomEvent.on(button, 'click', function (e) {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          expanded = !expanded;
          button.textContent = expanded ? 'Back to nearby' : 'Show weekend trips';
          if (expanded) map.fitBounds(allBounds, { padding: [42, 42] });
          else fitClose();
        });
        L.DomEvent.disableClickPropagation(wrap);
        return wrap;
      },
    });
    map.addControl(new Toggle());
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
