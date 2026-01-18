// assets/js/page_poi.js
"use strict";

// Kategória kódok és megjelenített címkék
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

const DEFAULT_RANK = 3; // közepes
const MAX_SEL = 15;
const STORAGE_SEL = "kirandulas:selected";

function getRank(p){
  const r = Number(p.rank);
  return Number.isFinite(r) ? r : DEFAULT_RANK;
}

function fmtRankLabel(rank){
  if (rank === 5) return "MUST SEE";
  if (rank === 4) return "nagyon ajánlott";
  if (rank === 3) return "jó";
  if (rank === 2) return "ha útba esik";
  return "csak gyűjtőknek";
}

function uniq(arr){
  return Array.from(new Set(arr.filter(Boolean)));
}

function el(tag, attrs, children){
  const e = document.createElement(tag);
  if (attrs){
    for (const [k,v] of Object.entries(attrs)){
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("data-")) e.setAttribute(k, v);
      else if (k === "for") e.htmlFor = v;
      else e.setAttribute(k, v);
    }
  }
  if (children){
    for (const c of children){
      if (c == null) continue;
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
  }
  return e;
}

function loadSelected(){
  try{
    const raw = localStorage.getItem(STORAGE_SEL);
    const a = JSON.parse(raw || "[]");
    if (Array.isArray(a)) return a;
  }catch(e){}
  return [];
}

function saveSelected(ids){
  localStorage.setItem(STORAGE_SEL, JSON.stringify(ids));
}

function toggleSelected(id){
  const ids = loadSelected();
  const i = ids.indexOf(id);
  if (i >= 0){
    ids.splice(i,1);
    saveSelected(ids);
    return ids;
  }
  if (ids.length >= MAX_SEL) return ids;
  ids.push(id);
  saveSelected(ids);
  return ids;
}

function buildGmapsRouteLink(pois, originLatLon){
  if (!pois || pois.length === 0) return "";

  // Google Maps Directions API: destination + waypoints (pipe elválasztó)
  // max méretek: a gyakorlatban 10-20 ponttal jól működik, itt 15 a limit
  const coords = pois.map(p => `${p.lat},${p.lon}`);
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(0, -1).join("|");

  let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  url += "&travelmode=driving";

  if (originLatLon) url += `&origin=${encodeURIComponent(originLatLon)}`;
  return url;
}

function makeBluePoiIcon(){
  const svg = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="11" fill="rgba(45,127,249,0.85)" stroke="rgba(255,255,255,0.85)" stroke-width="2"/>
      <circle cx="14" cy="14" r="3" fill="rgba(255,255,255,0.95)"/>
    </svg>`;
  return L.divIcon({
    className: "poi-numbered-icon",
    html: svg,
    iconSize: [28,28],
    iconAnchor: [14,14]
  });
}

function makeSelectedIcon(n){
  const svg = `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="12" fill="rgba(59,209,111,0.90)" stroke="rgba(255,255,255,0.90)" stroke-width="2"/>
      <text x="15" y="19" text-anchor="middle" font-size="13" font-weight="800" fill="#0b1a0f" font-family="Arial">${String(n)}</text>
    </svg>`;
  return L.divIcon({
    className: "poi-numbered-icon",
    html: svg,
    iconSize: [30,30],
    iconAnchor: [15,15]
  });
}

function init(){
  const pois = (window.POIS || []).map(p => ({...p}));

  // UI elemek
  const selCounter = document.getElementById("selCounter");
  const btnClearSelected = document.getElementById("btnClearSelected");
  const btnNaviSelected = document.getElementById("btnNaviSelected");
  const btnNearest = document.getElementById("btnNearest");

  const fCountry = document.getElementById("fCountry");
  const fRegion = document.getElementById("fRegion");
  const fCategory = document.getElementById("fCategory");
  const fMustSee = document.getElementById("fMustSee");
  const fInView = document.getElementById("fInView");

  const poiList = document.getElementById("poiList");

  // Map
  const map = L.map("map", { zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const blueIcon = makeBluePoiIcon();
  const markerById = new Map();

  function rebuildMarkers(visiblePois){
    // eltávolítás
    for (const [id, m] of markerById){
      map.removeLayer(m);
    }
    markerById.clear();

    const sel = loadSelected();

    for (const p of visiblePois){
      const rank = getRank(p);
      const cat = CATEGORY_LABEL[p.category] || p.category || "";
      const title = `${p.seq ? p.seq + ". " : ""}${p.display_title}`;

      const selIndex = sel.indexOf(p.id);
      const icon = selIndex >= 0 ? makeSelectedIcon(selIndex + 1) : blueIcon;

      const m = L.marker([p.lat, p.lon], { icon }).addTo(map);
      m.bindPopup(`<strong>${title}</strong><br>${cat}${cat ? " • " : ""}${fmtRankLabel(rank)}`);
      markerById.set(p.id, m);
    }
  }

  function fitToAll(){
    if (!pois.length){
      map.setView([47.0, 19.0], 6);
      return;
    }
    const b = L.latLngBounds(pois.map(p => [p.lat, p.lon]));
    map.fitBounds(b.pad(0.2));
  }

  // Filter opciók
  function fillOptions(){
    const countries = uniq(pois.map(p => (p.country || "").toUpperCase())).sort();
    fCountry.innerHTML = "";
    fCountry.appendChild(el("option", { value: "" }, ["ország: mind"]));
    for (const c of countries){
      fCountry.appendChild(el("option", { value: c }, [c]));
    }

    fCategory.innerHTML = "";
    fCategory.appendChild(el("option", { value: "" }, ["kategória: mind"]));
    const cats = uniq(pois.map(p => p.category)).sort();
    for (const k of cats){
      const lbl = CATEGORY_LABEL[k] || k;
      fCategory.appendChild(el("option", { value: k }, [lbl]));
    }

    rebuildRegionOptions();
  }

  function rebuildRegionOptions(){
    const c = (fCountry.value || "").toUpperCase();
    const filtered = c ? pois.filter(p => (p.country || "").toUpperCase() === c) : pois;

    const regionPairs = uniq(filtered.map(p => `${p.region || ""}||${p.region_label || ""}`))
      .map(s => {
        const [region, label] = s.split("||");
        return { region, label };
      })
      .filter(x => x.region);

    regionPairs.sort((a,b) => (a.label || a.region).localeCompare(b.label || b.region, "hu"));

    fRegion.innerHTML = "";
    fRegion.appendChild(el("option", { value: "" }, ["régió: mind"]));
    for (const r of regionPairs){
      fRegion.appendChild(el("option", { value: r.region }, [r.label || r.region]));
    }
  }

  function passesFilters(p){
    const c = (fCountry.value || "").toUpperCase();
    if (c && (p.country || "").toUpperCase() !== c) return false;

    const r = (fRegion.value || "");
    if (r && (p.region || "") !== r) return false;

    const cat = (fCategory.value || "");
    if (cat && (p.category || "") !== cat) return false;

    if (fMustSee.checked && getRank(p) !== 5) return false;

    if (fInView.checked){
      const b = map.getBounds();
      if (!b.contains([p.lat, p.lon])) return false;
    }

    return true;
  }

  function updateSelCounter(){
    const sel = loadSelected();
    selCounter.textContent = `Kijelöltek: ${sel.length}/${MAX_SEL}`;
  }

  function render(){
    const visible = pois.filter(passesFilters);

    // lista
    poiList.innerHTML = "";

    const sel = loadSelected();

    for (const p of visible){
      const title = `${p.seq ? p.seq + ". " : ""}${p.display_title}`;
      const rank = getRank(p);
      const catLabel = CATEGORY_LABEL[p.category] || p.category || "";

      const isSel = sel.includes(p.id);

      const stateEl = el("div", { class: "small", id: `st_${p.id}` }, ["mérés: várakozás"]);
      const distEl = el("div", { class: "small", id: `ds_${p.id}` }, ["távolság: —"]);
      const deltaEl = el("div", { class: "small", id: `dl_${p.id}` }, [""]);

      const btnMeasure = el("button", { class: "btn btn-measure", type: "button" }, ["📏 Mérés"]);
      btnMeasure.addEventListener("click", async () => {
        stateEl.textContent = "mérés: fut";
        deltaEl.textContent = "";
        try{
          const res = await measureToPoi("kirandulas", { id: p.id, lat: p.lat, lon: p.lon });
          stateEl.textContent = "mérés: kész";
          distEl.textContent = `távolság: ${fmtMeters(res.dist)}`;
          deltaEl.textContent = `${res.ind.text}`;
          deltaEl.className = "small " + (res.ind.cls === "ok" ? "ind-ok" : (res.ind.cls === "bad" ? "ind-bad" : "ind-warn"));
        }catch(e){
          stateEl.textContent = "mérés: hiba";
          distEl.textContent = "távolság: —";
          deltaEl.textContent = "helymeghatározás nem elérhető";
          deltaEl.className = "small ind-warn";
          const gpsNotice = document.getElementById("gpsNotice");
          if (gpsNotice) gpsNotice.style.display = "block";
        }
      });

      const btnSelect = el("button", { class: "btn", type: "button" }, [isSel ? "✅ Kijelölve" : "➕ Kijelölés"]);
      btnSelect.addEventListener("click", () => {
        const after = toggleSelected(p.id);
        if (after.length >= MAX_SEL && !after.includes(p.id)){
          // nem tudtuk hozzáadni
          alert(`A kijelölés limitje ${MAX_SEL} pont.`);
        }
        updateSelCounter();
        render();
      });

      const btnGoMap = el("button", { class: "btn btn-blue", type: "button" }, ["🧭 Navigáció"]);
      btnGoMap.addEventListener("click", () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`, "_blank", "noopener");
      });

      const btnDetails = el("a", { class: "btn btn-accent", href: p.details_href }, ["Részletek"]);

      const meta = el("div", { class: "small" }, [`${catLabel}${catLabel ? " • " : ""}${fmtRankLabel(rank)}${rank === 5 ? " • MUST SEE" : ""}`]);

      const card = el("div", { class: "poi" }, [
        el("div", { class: "poi-head" }, [
          el("div", {}, [
            el("div", { class: "poi-title" }, [title]),
            el("div", { class: "coords" }, [`${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`]),
            meta
          ]),
          el("div", { class: "btnrow" }, [btnSelect])
        ]),

        stateEl,
        distEl,
        deltaEl,

        el("div", { class: "p" }, [p.short || ""]),

        el("div", { class: "poibtns" }, [btnDetails, btnGoMap, btnMeasure])
      ]);

      // katt a kártyára: térképre ugrik
      card.addEventListener("dblclick", () => {
        const m = markerById.get(p.id);
        if (m){
          map.setView(m.getLatLng(), Math.max(map.getZoom(), 12));
          m.openPopup();
          ensureMapOpen();
        }
      });

      poiList.appendChild(card);
    }

    // térkép
    rebuildMarkers(visible);

    updateSelCounter();
  }

  async function naviSelected(){
    const selIds = loadSelected();
    const selPois = selIds
      .map(id => pois.find(p => p.id === id))
      .filter(Boolean);

    if (selPois.length === 0){
      alert("Nincs kijelölt pont.");
      return;
    }

    // próbáljuk current location origin-t
    let origin = "";
    try{
      const pos = await getPos();
      origin = `${pos.coords.latitude},${pos.coords.longitude}`;
    }catch(e){
      origin = "";
    }

    const url = buildGmapsRouteLink(selPois, origin || "");
    if (!url){
      alert("Nem sikerült útvonal linket készíteni.");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  function clearSelected(){
    saveSelected([]);
    updateSelCounter();
    render();
  }

  function ensureMapOpen(){
    const dock = document.getElementById("mapDock");
    if (dock && !dock.classList.contains("open")){
      dock.classList.add("open");
      const t = document.getElementById("mapDockToggle");
      if (t) t.setAttribute("aria-expanded", "true");
      setTimeout(() => map.invalidateSize(), 60);
      setTimeout(() => map.invalidateSize(), 250);
    }
  }

  async function nearest(){
    try{
      const visible = pois.filter(passesFilters);
      if (!visible.length){
        alert("Nincs pont a szűrés után.");
        return;
      }
      const res = await measureNearest("kirandulas", visible.map(p => ({ id: p.id, lat: p.lat, lon: p.lon })));
      const best = visible.find(p => p.id === res.poi.id);
      if (!best) return;

      ensureMapOpen();
      const m = markerById.get(best.id);
      if (m){
        map.setView(m.getLatLng(), Math.max(map.getZoom(), 12));
        m.openPopup();
      }
      // lista eleje
      window.scrollTo({ top: 0, behavior: "smooth" });
    }catch(e){
      const gpsNotice = document.getElementById("gpsNotice");
      if (gpsNotice) gpsNotice.style.display = "block";
      alert("Helymeghatározás nem elérhető.");
    }
  }

  // események
  fCountry.addEventListener("change", () => { rebuildRegionOptions(); render(); });
  fRegion.addEventListener("change", render);
  fCategory.addEventListener("change", render);
  fMustSee.addEventListener("change", render);
  fInView.addEventListener("change", render);

  map.on("moveend", () => { if (fInView.checked) render(); });
  map.on("zoomend", () => { if (fInView.checked) render(); });

  btnNaviSelected.addEventListener("click", naviSelected);
  btnClearSelected.addEventListener("click", clearSelected);
  btnNearest.addEventListener("click", nearest);

  // map dock toggle
  const mapDock = document.getElementById("mapDock");
  const mapDockToggle = document.getElementById("mapDockToggle");
  if (mapDock && mapDockToggle){
    mapDockToggle.addEventListener("click", () => {
      const isOpen = mapDock.classList.toggle("open");
      mapDockToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      setTimeout(() => map.invalidateSize(), 60);
      setTimeout(() => map.invalidateSize(), 250);
    });
  }

  // init
  fillOptions();
  fitToAll();
  render();
}

document.addEventListener("DOMContentLoaded", init);
