# API request collection

Use these files to call the Ticketing API without writing curl by hand.

## Option 1: .http file (VS Code / Cursor)

**Like .NET’s .http files.** Works with:

- **REST Client** (extension ID: `humao.rest-client`) – click “Send Request” above a `###` block.
- **Thunder Client** – open the `.http` file or import requests.

1. Open `ticketing-api.http`.
2. Set `@baseUrl` if the API is not on `http://localhost:3001`.
3. After logging in (Auth → Login), copy the `token` from the response into `@token`.
4. Use “Send Request” (REST Client) or the equivalent in Thunder Client on any block.

## Option 2: Postman

1. In Postman: **Import** → **File** → choose `ticketing-api.postman.json`.
2. Open the collection → **Variables**: set `baseUrl` (e.g. `http://localhost:3001`) and, after login, `token` (your JWT).
3. Run any request in the folders (Health, Auth, Events, Venues, Reservations, Orders).

Admin-only endpoints (events create, venues create, add seats) need a JWT for a user with role `admin` (e.g. from `npm run seed:admin` and then login).

**Reservation flow:** Create venue → **Add seats to venue** (POST `/venues/:venueId/seats`) → Create event → **Get event seats** (GET `/events/:eventId/seats`) → POST `/reservations` with `eventId` and `seatIds` from the seats list. Reservations return 409 if the event has no seats or the requested seats are not available.
