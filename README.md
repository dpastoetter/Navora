# Navora

A single-file travel planning tool that builds gorgeous, shareable itinerary pages. No frameworks, no build step — open [`index.html`](index.html) in any modern browser.

## Features

- **Multi-day trip builder** — Morning, afternoon, and evening time blocks per day
- **Rich activities** — Title, location, notes, category tags (food, culture, nature, transport, stay), optional links
- **Shareview** — Read-only public-style itinerary with hero image, vertical timeline, and category-colored icons
- **Trip cover** — Unsplash hero by destination, title, dates, tagline
- **Drag to reorder** activities within a time block (with mobile ↑/↓ fallback)
- **Dark / light mode** — Warm dark default with teal accent
- **Sample trips** — Tokyo, Iceland, and Lisbon starters on the home screen
- **Mobile-first** — Bottom tab bar on small screens (Days · Map · Share)

## Quick start

```bash
# Option 1: open the file directly
xdg-open index.html   # Linux
open index.html       # macOS

# Option 2: local static server
python3 -m http.server 8765
# → http://127.0.0.1:8765/index.html
```

## Routes

| Hash    | Screen    |
|---------|-----------|
| (empty) | Home      |
| `#plan` | Builder   |
| `#view` | Shareview |

Use **Copy share link** to copy the page URL with `#view`. Trip data lives in memory only (no `localStorage`), so shared links are best for same-session screenshots unless you add URL-encoded state later.

## Tech stack

- Pure HTML, CSS, and JavaScript in one file
- [Fraunces](https://fonts.google.com/specimen/Fraunces) (Google Fonts) for display type
- [Satoshi](https://www.fontshare.com/fonts/satoshi) (Fontshare) for UI
- [Lucide](https://lucide.dev/) icons via CDN
- [Unsplash Source](https://source.unsplash.com/) for destination hero images (with gradient fallback)

## Project structure

```
Navora/
├── index.html   # Entire app (styles + logic)
├── README.md
└── LICENSE
```

## License

MIT — see [LICENSE](LICENSE).
