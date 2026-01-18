// assets/data/pois.js
// Egységes adatforrás: minden lista, térkép, szűrő és kiválasztás ebből épül.
// Alapelv: ha egy POI-nál nincs rank megadva, a rendszer automatikusan 3-at kezel.

window.POIS = [
  {
    id: "20260118_164501",
    seq: 1,
    canonical_name: "tornai_var_turniansky_hrad",
    display_title: "Tornai vár (Turniansky hrad)",
    country: "SK",
    region: "sk_general",
    region_label: "Szlovákia (általános)",
    category: "history",
    // rank szándékosan nincs megadva a demóhoz
    lat: 48.610500,
    lon: 20.875700,
    short: "Középkori várrom a Gömör Tornai karszt kopár mészkőhegyén, végvári múlttal és nagy panorámával.",
    details_href: "POI_01_tornai_var_turniansky_hrad.html",
    img: "images/poi_01_tornai_var_turniansky_hrad.jpg"
  },
  {
    id: "20260118_164502",
    seq: 2,
    canonical_name: "firenze_tortenelmi_kozpont_duomo",
    display_title: "Firenze, történelmi központ (Duomo környéke)",
    country: "IT",
    region: "toscana",
    region_label: "Toszkána",
    category: "town",
    rank: 5,
    lat: 43.769600,
    lon: 11.255800,
    short: "Sűrűn rétegzett belváros a dóm környezetében, ahol a reneszánsz nem fogalom, hanem utcakép.",
    details_href: "POI_02_firenze_tortenelmi_kozpont_duomo_kornyeke.html",
    img: "images/poi_01_firenze_tortenelmi_kozpont_duomo_kornyeke.jpg"
  }
];
