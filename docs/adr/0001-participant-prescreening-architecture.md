# ADR-001: Participant Pre-Screening Application

**Status:** Proposed  
**Date:** 2026-10-07

## Context

Curebase needs a small administrative application to collect participant details and support an initial clinical-trial eligibility pre-screen. The first version must let an administrator create a participant record and review a filterable list, while keeping the UI and server structure ready to grow beyond a single page. This is an administrative workflow, not a participant-facing eligibility decision or a substitute for clinical review.

The initial record contains first name, last name, email, phone, height, and weight. BMI is derived from height and weight and must be calculated by the server. Records need a creation timestamp and a status that supports soft deletion later. The list must support cursor pagination, ordering, and inclusive minimum/maximum BMI filters.

## Decision

### Application structure

Build a full-stack web application with a mobile-first UI styled with Tailwind CSS and a Node.js API using Express. Keep the two main UI areas in separate, reusable view wrappers: a participant-entry view and a participant-list view. Compose both on one route for the initial release; either view can move to its own route without changing its form or table behavior.

The entry view uses two columns for fields when the viewport allows and a single column on narrow screens. Validate required fields before submission and place field errors beside their inputs. Show API validation and duplicate-record errors in the form before saving; retain entered values so the administrator can correct them. The list uses a horizontally scrollable table rather than compressing or wrapping columns. Place minimum and maximum BMI controls at the end of the table. Include an accessible light/dark theme toggle and maintain adequate contrast in both themes.

### API boundaries

Use three server layers, with HTTP concerns kept out of the business and persistence layers:

1. **Controllers** expose the Express endpoints, parse the request context, and translate service results into HTTP responses.
2. **Services** enforce application rules, calculate BMI, coordinate duplicate handling, and shape list behavior.
3. **Data access layer (DAL)** uses Prisma for database reads and writes; it does not own HTTP response logic.

The initial endpoints are:

| Method and path | Behavior |
| --- | --- |
| `POST /api/participants` | Validate and create a participant. Accept `firstName`, `lastName`, `email`, `phone`, `heightCm`, and `weightKg`. Ignore any client-supplied BMI or status. |
| `GET /api/participants` | Return active participants with `firstName`, `lastName`, `email`, `phone`, `heightCm`, `weightKg`, `bmi`, and `createdAt`. |

For GET, accept `limit`, `cursor`, `sort`, `direction`, `minBmi`, and `maxBmi` as query parameters. Use a bounded default page size. `minBmi` and `maxBmi` are inclusive, and reject a request where the minimum exceeds the maximum. Restrict sorting to an explicit allowlist (initially `createdAt` and `bmi`), default to newest first, and add `id` as a stable tie-breaker. Return a `nextCursor` when another page exists. The opaque cursor represents the sort value and tie-breaker needed for keyset pagination; it is not a page number.

### Validation and errors

Validate at both boundaries. The UI provides immediate required-field and format feedback before submit. The API independently validates the payload with Zod: names are non-empty strings, email is a valid email string, phone is a digits-only string, and height and weight are finite positive numbers. The API is authoritative; client validation is for usability, not trust. Normalize email to lowercase and trim surrounding whitespace before persistence. Preserve phone as a string so leading zeroes are not lost.

Calculate BMI in the service as `weightKg / (heightCm / 100)^2`, and persist a consistently rounded value to two decimal places. Return structured field-level validation errors for invalid input. Return HTTP `409 Conflict` with a field-specific error when normalized email or phone is already registered. The UI maps both error types to the form and does not clear values on failure. Other unexpected failures use a generic response and must not expose database details.

### Persistence

Use PostgreSQL with one application table, `clinical.participants`, managed through Prisma migrations. Map Prisma fields to snake_case database columns where appropriate. Each row has a generated ID, the six submitted values (with height and weight named to document their units), stored BMI, `createdAt`, and a status initially set to `ACTIVE`; reserve `DELETED` for future soft deletion. Listing excludes non-active rows.

Enforce uniqueness for normalized email and phone in the database as well as in application handling, so concurrent requests cannot create duplicates. For this initial decision, uniqueness applies to soft-deleted rows too; reuse/reactivation is a future policy decision. Add indexes for the list access patterns, including `(status, bmi, id)` for active BMI filtering/order and `(status, created_at, id)` for default chronological cursor traversal. Add unique indexes for email and phone. Prisma is the mapping and type-consistency layer; migrations remain the source of truth for deployed schema changes.

### Privacy and operational guardrails

Participant contact details are sensitive. Require the application to sit behind administrative authentication and authorization, use HTTPS, and avoid logging request bodies, contact details, or raw validation payloads. Store database credentials in the deployment secret manager. Authentication design and deployment topology are outside this ADR, but the API must not be exposed as an unauthenticated public data-collection endpoint.

## Consequences

This design keeps BMI consistent by calculating it once on the server, and the database constraints close the race between duplicate checks and concurrent submissions. The two UI wrappers and three API layers make the first release straightforward while allowing the list and entry flow to evolve independently. Cursor pagination gives stable traversal without offset growth, but cursors must be treated as opaque and clients should restart from the beginning after changing sort or filters.

The unit contract is a necessary assumption because the requested payload specified numbers but not units: this ADR defines height in centimeters and weight in kilograms. Confirm that contract before implementation or accepting real submissions. Authentication provider, maximum page size, and whether a deleted participant may later be reactivated remain deployment/product decisions.