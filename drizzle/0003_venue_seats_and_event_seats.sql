-- Step 1: Add venue_id to seats (nullable for backfill)
ALTER TABLE "seats" ADD COLUMN "venue_id" uuid REFERENCES "venues"("id");
--> statement-breakpoint
-- Step 2: Backfill venue_id from event's venue
UPDATE "seats" SET "venue_id" = (SELECT "venue_id" FROM "events" WHERE "events"."id" = "seats"."event_id") WHERE "seats"."event_id" IS NOT NULL;
--> statement-breakpoint
-- Step 3: Create event_seats for per-event availability
CREATE TABLE "event_seats" (
	"event_id" uuid NOT NULL REFERENCES "events"("id"),
	"seat_id" uuid NOT NULL REFERENCES "seats"("id"),
	"status" "seats_status" NOT NULL DEFAULT 'available',
	"reserved_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	PRIMARY KEY ("event_id", "seat_id")
);
--> statement-breakpoint
-- Step 4: Copy existing (event_id, seat_id, status, reserved_until) into event_seats
INSERT INTO "event_seats" ("event_id", "seat_id", "status", "reserved_until", "created_at", "updated_at")
SELECT "event_id", "id", COALESCE("status", 'available'::"seats_status"), "reserved_until", "created_at", "updated_at"
FROM "seats" WHERE "event_id" IS NOT NULL;
--> statement-breakpoint
-- Step 5: Drop event_id FK and columns from seats
ALTER TABLE "seats" DROP CONSTRAINT IF EXISTS "seats_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN IF EXISTS "event_id";
--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN IF EXISTS "reserved_until";
--> statement-breakpoint
-- Step 6: Remove seats that have no venue (orphaned from backfill)
DELETE FROM "seats" WHERE "venue_id" IS NULL;
--> statement-breakpoint
-- Step 7: venue_id not null
ALTER TABLE "seats" ALTER COLUMN "venue_id" SET NOT NULL;
