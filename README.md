# Navora

A travel planning tool that builds gorgeous, shareable itinerary pages. Built with Vite — deploy to GitHub Pages or run locally.

**[Try Navora live](https://dpastoetter.github.io/Navora/)**

## Screenshots

### Home

Plan a trip, pick a destination, or start from a sample itinerary.

![Navora home screen — hero, destination search, and sample trips](docs/screenshots/home.png)

### Builder

Edit days with morning / afternoon / evening blocks, photos, maps, templates, and packing lists.

![Navora builder — Tokyo sample trip with activity cards and sidebar](docs/screenshots/builder.png)

### Shareview

Shareable read-only itinerary with hero image, weather, route map, and photo timeline.

![Navora Shareview — Tokyo trip timeline and trip header](docs/screenshots/shareview.png)

### Mobile

![Navora home on mobile](docs/screenshots/home-mobile.png)

To regenerate screenshots after UI changes:

```bash
npm run build && npm run preview
# in another terminal:
npm run screenshots
```

## Features

- **Multi-day trip builder** — Morning, afternoon, and evening blocks
- **Shareable URLs** — Compressed trip in `#view?d=…` (LZ-String)
- **Shareview** — Hero, timeline, route map, weather strip, mood themes
- **Story card PNG** — Social-ready export
- **ICS calendar export** — Timed activities → `.ics`
- **Print stylesheet** — Clean itinerary printout
- **Day templates & smart insights** — Templates + warnings with quick-fix actions
- **Interactive map** — Geocoded pins + route polyline (Leaflet / OSM)
- **Open-Meteo weather** — Forecast strip when days have dates
- **Packing list** — Auto-suggestions from activity categories
- **Trip tools** — JSON import/export, duplicate, undo, localStorage draft
- **Live sync** — PeerJS room codes for co-editing
- **Embed mode** — `#view?d=…&embed=1` for minimal chrome
- **City & sight photos** — Curated Wikimedia images for sample trips; auto/Wikipedia lookup for custom stops

## Development

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # output in dist/
npm run preview  # preview production build
npm test         # Playwright E2E + unit checks (builds & serves preview)
```

Open without npm: serve `dist/` after build, or see [`index.legacy.html`](index.legacy.html) (original single-file version).

## Routes

| Hash | Screen |
|------|--------|
| (empty) | Home |
| `#plan` | Builder |
| `#view` | Shareview |

## Keyboard shortcuts (builder)

| Key | Action |
|-----|--------|
| `n` | New activity (morning) |
| `1`–`9` | Switch day |
| `/` | Focus destination (home) |
| `Ctrl/Cmd+Z` | Undo |

## Project structure

```
Navora/
├── index.html          # Vite entry
├── src/
│   ├── main.js
│   ├── styles/main.css
│   └── …modules
├── public/
├── dist/               # GitHub Pages artifact
├── index.legacy.html   # Original monolith
└── package.json
```

## Deploy (GitHub Pages)

Push to `main` — the included workflow builds `dist/` and deploys to Pages. Set Pages source to **GitHub Actions**.

Site URL: `https://dpastoetter.github.io/Navora/`

## License

MIT — see [LICENSE](LICENSE).
