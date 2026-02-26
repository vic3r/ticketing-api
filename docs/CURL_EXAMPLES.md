# cURL examples (API on localhost:3001)

Replace `http://localhost:3001` if your API runs elsewhere. After login, set `TOKEN` and use it for protected routes.

**Alternative:** Use the request collection in `api/`: **`api/ticketing-api.http`** (VS Code REST Client or Thunder Client, like .NET .http files) or **`api/ticketing-api.postman.json`** (import into Postman). See `api/README.md`.

**Setup:** Run `npm run migrate`, then `npm run seed:admin` (set `ADMIN_EMAIL`, `ADMIN_PASSWORD`). Create a venue with `npm run seed:venue`, then `SEED_VENUE_ID=<id> npm run seed:seats`. Only admins can create events; creating an event with a `venueId` auto-populates event_seats from that venue’s seats.

---

## Health

```bash
curl -s http://localhost:3001/health | jq
# {"status":"ok"}
```

---

## Auth

### Register

```bash
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}' | jq
# 201: { "token": "...", "user": { "id", "email", "name" } }
```

### Login (save token for later)

```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq -r '.token')
echo "Token: $TOKEN"
```

### Login and pretty-print full response

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq
# 200: { "token": "...", "user": { "id", "email", "name" } }
```

---

## Events

### List published events (no auth)

```bash
curl -s http://localhost:3001/events | jq
```

### Get event by id (no auth)

```bash
curl -s http://localhost:3001/events/EVENT_ID | jq
# Replace EVENT_ID with a real id from GET /events
```

### Create event (admin only)

Only users with role `admin` can create events. Seed an admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD` then `npm run seed:admin`; log in with that account to get a token.

```bash
# Use TOKEN from admin login
curl -s -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Summer Concert",
    "venueId": "venue-1",
    "organizerId": "org-1",
    "description": "Outdoor show",
    "imageUrl": null,
    "startDate": "2025-08-01T18:00:00.000Z",
    "endDate": "2025-08-01T22:00:00.000Z"
  }' | jq
# 201: event object
```

---

## Venues (admin only)

Only users with role `admin` can create venues. Use the same admin token as for creating events.

```bash
# Create a venue (organizerId optional)
curl -s -X POST http://localhost:3001/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Main Hall",
    "address": "123 Main St",
    "city": "City",
    "state": "State",
    "zip": "12345",
    "country": "Country",
    "description": "Main venue"
  }' | jq
# 201: venue object (id, organizerId, name, address, city, state, zip, country, description, createdAt, updatedAt)
```

---

## Reservations (requires auth)

Seats belong to **venues**; each **event** at a venue gets its own availability rows (`event_seats`). Reserve with **eventId** (the event) and **seatIds** (venue seat UUIDs that exist in that event).

```bash
# Reserve seats for an event (use real event ID and seat IDs from the event’s venue)
curl -s -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventId":"<EVENT_UUID>","seatIds":["550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002"]}' | jq
# 200: { "seats": [...] }
# 400: "eventId is required" or "Each seat ID must be a valid UUID"
# 409: seats not available
```

---

## Orders

### Checkout (no auth; body must match your data)

```bash
# userId = user id from login/register; eventId and seatIds from your DB
curl -s -X POST http://localhost:3001/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "eventId": "EVENT_ID",
    "seatIds": ["seat-1"],
    "tierId": "tier-1",
    "email": "alice@example.com"
  }' | jq
# 200: { "orderId", "clientSecret" } or 404 if seats not found
```

### Webhook (Stripe signature required for success)

```bash
# Without valid Stripe signature you typically get 401
curl -s -X POST http://localhost:3001/orders/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"event"}' | jq
```

---

## One-liner flow (register → login → list events)

```bash
# 1) Register
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"pass123","name":"Bob"}' | jq

# 2) Login and set token
export TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"pass123"}' | jq -r '.token')

# 3) List events
curl -s http://localhost:3001/events | jq

# 4) Create event (if your DB has venue/organizer)
curl -s -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","venueId":"v1","organizerId":"o1","description":null,"imageUrl":null,"startDate":"2025-12-01T20:00:00.000Z","endDate":"2025-12-01T23:00:00.000Z"}' | jq
```

---

_Optional: install `jq` for pretty-printed JSON (`brew install jq` on macOS). Omit `| jq` to see raw response._
