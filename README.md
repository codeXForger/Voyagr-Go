# Voyagr-Go

A free, open-source trip cost planner. Pick where you are going and when, say who is coming, and get a clear
cost breakdown **per person** and for the **whole trip**. Works just as well for a family as for a group of friends.
Export the itinerary and costs as a PDF, and save or open trips as a file or on your own Google Drive.

There is **no database and no account**. Your trips live in your browser and in files you save.

## Features

- **Route and dates**: searchable From and To dropdowns (about 4,000 airports, plus states, countries and airport
  codes, so "california" or "chicago" both work) and From/To date pickers linked to days and nights.
- **Travelers**: number of people, rooms and extra beds.
- **Daily charges**: hotel room, extra bed, breakfast, lunch, dinner and cab, all charged per day or night, with a per-day
  and per-person-per-day summary.
- **Trip charges**: flights, plus places and activities from your itinerary.
- **Itinerary**: add places for each day and the activities at each place, one per row, and drag rows to reorder.
  Each place has an entry fee, each activity a price, both per person, for the number of people who take part
  (defaults: everyone, fee 0, activity price 500). They appear in the cost list automatically and are removed
  from it when you remove them from the itinerary.
- **Editable prices** everywhere, showing unit price, per person and total. Edited prices are kept when you refresh estimates.
- **"If N people go"**: totals for 1 to N travelers, with rooms and cabs adjusting to the group size.
- **Estimates**: approximate flight, stay, food and cab prices for popular destinations, offline. Optionally live
  flights and hotels from Amadeus.
- **PDF export** of the itinerary, costs and group-size table.
- **Save and open**: a JSON file on your device, or Google Drive (in a `Voyagr-Go` folder).

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/codeXForger/Voyagr-Go.git
cd Voyagr-Go
npm install
npm run dev
```

Open <http://localhost:3000>. That is all you need: price estimates, PDF export and saving to a file work
without any keys. Google Drive and live prices are optional (see below).

To run a production build: `npm run build && npm start`.

## Optional: Google Drive sync

Drive buttons appear only when you configure a Google OAuth client. Everything stays between the user's browser and their own
Drive. The app only requests the `drive.file` scope, so it can see just the files it creates or the user opens.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the
   **Google Drive API** and the **Google Picker API**.
2. Configure the OAuth consent screen. While it is in "Testing", add the Google accounts that will sign in as test users.
3. Create an **OAuth client ID** of type *Web application*. Add your site's origin (for example
   `http://localhost:3000`, and your deployed URL) under *Authorized JavaScript origins*.
4. Create an **API key** and restrict it to the Picker API and to your site's URLs (HTTP referrers).
   It is embedded in the page by design, so restricting it is what keeps it safe.
5. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<OAuth client ID>
   NEXT_PUBLIC_GOOGLE_API_KEY=<API key>
   NEXT_PUBLIC_GOOGLE_APP_ID=<your Cloud project number>
   ```

6. Restart `npm run dev`.

## Optional: live flight and hotel prices

Without keys the app uses built-in estimates. To also pull live flights and hotels, create a free account at
[Amadeus for Developers](https://developers.amadeus.com/), then add to `.env.local`:

```
AMADEUS_CLIENT_ID=<key>
AMADEUS_CLIENT_SECRET=<secret>
```

These are read only on the server (the `/api/prices` route) and never sent to the browser. The app uses Amadeus's **test**
environment, which has limited data, so treat results as rough. When Amadeus has no answer, estimates fill in.

## Good to know

- **Prices are approximate.** The built-in estimates cover about a dozen destinations (see `src/data/destinations.json`)
  and anywhere else gets generic figures. Always check and edit prices before you rely on them.
- **Unsaved work is lost on refresh.** There is no server storage, so save your trip to a file or Google Drive.
- Places and activities in costs are managed from the Itinerary tab. The lock icon on those rows means "edit it there".

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests (Vitest) |
| `npm run lint` | Type-check with `tsc` |
| `npm run build` | Production build |

Do not run `npm run build` while `npm run dev` is running; it can corrupt the dev cache. Delete `.next` if you do.

**Stack:** Next.js 15 (App Router) with TypeScript, Tailwind CSS v4, Zustand, Zod, `@react-pdf/renderer`, Vitest and
Testing Library. The frontend and backend live in one project, and there is no database.

**Design:** the code follows SOLID principles and common patterns (Strategy for pricing, Adapter for storage, Factory and
Composite for price providers, Facade for the price API). The domain logic in `src/domain` has no framework
dependencies. [`CLAUDE.md`](CLAUDE.md) is the detailed developer guide: architecture, domain rules, and how to add a
cost category, price provider, storage backend or export format.

```
src/domain/     pure logic: pricing, itinerary costs, dates, locations, schema
src/services/   price providers, storage (file, Google Drive), PDF export
src/store/      Zustand store
src/app/        UI components and the /api/prices route
src/data/       destination rates and place lists
scripts/        build-airports.mjs regenerates the airport list
```

## Contributing

Issues and pull requests are welcome. Please:

1. Fork the repo and create a branch.
2. Add or update tests for what you change (`npm test` must pass, along with `npm run lint` and `npm run build`).
3. Keep to the structure described in `CLAUDE.md`, and never commit secrets or `.env` files.
4. Open a pull request describing what changed and why.

## License and credits

[MIT](LICENSE). You are free to use, modify and share it.

- Airport data: [OurAirports](https://ourairports.com/data/) (public domain).
- Icons: [Lucide](https://lucide.dev/) (ISC).
- Fonts: Bricolage Grotesque and Plus Jakarta Sans (SIL Open Font License), loaded via `next/font`.
