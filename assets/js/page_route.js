// assets/js/page_route.js
"use strict";

const CATEGORY_LABEL = {
  viewpoint: "Kilátó",
  pass: "Hágó",
  lake: "Tó",
  town: "Város",
  building: "Épület",
  restaurant: "Étterem",
  lodging: "Szállás",
  nature: "Természeti látványosság",
  history: "Történelmi látványosság",
  curiosity: "Érdekes pont"
};

const DEFAULT_RANK = 3;

function getRank(p){
  const r = Number(p.rank);
  return Number.isFinite(r) ? r : DEFAULT_RANK;
}

function uniq(arr){
  return Array.from(new Set(arr.filter(Boolean)));
}

function init(){
  const pois = (window.POIS || []).slice();
  const routes = (window.ROUTES || []).slice();

  const fRoute = document.getElementById("fRoute");
  const fCategory = document.getElementById("fCategory");
  const fMustSee = document.getElementById("fMustSee");
  const fInView = document.getElementById("fInView");
  const out = document.getElementById("routePoiList");

  // map
  const map = L.map("map", { zoomControl:true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // markers
  const markers = new Map();
  let gpxLayer = null;

  function clearMarkers(){
    for (const m of markers.values()) map.removeLayer(m);
    markers.clear();
  }

  function isInView(p){
    if (!fInView.checked) return true;
    const b = map.getBounds();
    return b.contains(L.latLng(p.lat, p.lon));
  }

  function applyFilters(){
    const cat = fCategory.value;
    return pois.filter(p => {
      if (cat && p.category !== cat) return false;
      if (fMustSee.checked && getRank(p) !== 5) return false;
      if (!isInView(p)) return false;
      return true;
    });
  }

  function renderPois(){
    const list = applyFilters();
    clearMarkers();

    for (const p of list){
      const m = L.marker([p.lat, p.lon]).addTo(map);
      m.bindPopup(`<b>${(p.seq ? (p.seq + '. ') : '')}${p.display_title}</b><br>${CATEGORY_LABEL[p.category] || p.category || ''}`);
      markers.set(p.id, m);
    }

    if (out){
      out.textContent = list.map(p => `${p.seq ? p.seq + '. ' : ''}${p.display_title}`).join("\n");
    }
  }

  function fillOptions(){
    // route
    fRoute.innerHTML = "";
    for (const r of routes){
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.title;
      fRoute.appendChild(opt);
    }

    // category
    const cats = uniq(pois.map(p => p.category));
    fCategory.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "összes kategória";
    fCategory.appendChild(opt0);
    for (const c of cats){
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = CATEGORY_LABEL[c] || c;
      fCategory.appendChild(opt);
    }
  }

  function loadRoute(){
    const id = fRoute.value;
    const r = routes.find(x => x.id === id);
    if (!r) return;

    if (gpxLayer){
      map.removeLayer(gpxLayer);
      gpxLayer = null;
    }

    // leaflet-gpx: L.GPX
    gpxLayer = new L.GPX(r.gpx, {
      async: true,
      polyline_options: { opacity: 0.85, weight: 4 }
    });

    gpxLayer.on("loaded", (e) => {
      try{
        map.fitBounds(e.target.getBounds(), { padding:[18,18] });
      }catch(_){
        // ignore
      }
      renderPois();
    });

    gpxLayer.addTo(map);
  }

  // events
  fRoute.addEventListener("change", loadRoute);
  fCategory.addEventListener("change", renderPois);
  fMustSee.addEventListener("change", renderPois);
  fInView.addEventListener("change", renderPois);
  map.on("moveend", () => { if (fInView.checked) renderPois(); });
  map.on("zoomend", () => { if (fInView.checked) renderPois(); });

  // map dock toggle
  const mapDock = document.getElementById("mapDock");
  const mapDockToggle = document.getElementById("mapDockToggle");
  if (mapDock && mapDockToggle){
    mapDock.classList.add("open");
    mapDockToggle.setAttribute("aria-expanded", "true");
    mapDockToggle.addEventListener("click", () => {
      const isOpen = mapDock.classList.toggle("open");
      mapDockToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      setTimeout(() => map.invalidateSize(), 60);
      setTimeout(() => map.invalidateSize(), 250);
    });
  }

  fillOptions();
  loadRoute();
}

document.addEventListener("DOMContentLoaded", init);
