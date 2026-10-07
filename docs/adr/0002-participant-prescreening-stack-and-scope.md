# ADR-002: Participant Pre-Screening Stack and Initial Scope

**Status:** Accepted  
**Date:** 2026-10-07  
**Supersedes:** [ADR-001: Participant Pre-Screening Application](0001-participant-prescreening-architecture.md)

## Context

The initial application is a time-boxed administrative workflow for entering participant contact and measurement information, reviewing saved participants, and displaying participants whose BMI falls within an optional range. It is a simplified pre-screening aid, not an eligibility decision or a substitute for clinical review.

The interview requirements define BMI using height in inches and weight in pounds: `BMI = weightLb / heightIn^2 * 703`. The first release should stay small enough to implement and explain within the 90-minute exercise. Authentication, pagination, sorting controls, soft deletion, and theme switching are not needed for that release.

## Decision

### Application structure and stack

- Build the frontend with React, TypeScript, Vite, and Tailwind CSS.
- Build a Node.js/Express API in TypeScript.
- Use PostgreSQL for relational persistence, with Prisma for schema mapping and migrations.
- Use Docker and Docker Compose to run the frontend, API, and PostgreSQL as separate containers for local development.
- Keep the initial UI on one page, with a participant-entry form, an all-participants table, and a separate BMI-filtered-results table.

The form collects first name, last name, email, phone, height in inches, and weight in pounds. Keep measurement units visible in the labels. The all-participants table shows saved participants and their BMI. The minimum/maximum BMI controls drive only the separate filtered-results table; changing filters does not create, update, or persist participant records. Bounds are inclusive. Blank bounds are treated as unbounded, and a minimum greater than the maximum is rejected with a clear validation message.

### API and BMI behavior

Expose the following endpoints:

| Method and path | Behavior |
| --- | --- |
| `POST /api/participants` | Validate and create a participant. Accept `firstName`, `lastName`, `email`, `phone`, `heightInches`, and `weightPounds`. Ignore any client-supplied BMI. |
| `GET /api/participants` | Return saved participants with their submitted fields, server-calculated `bmi`, and `createdAt`, ordered newest first. |

Calculate BMI in the API using `weightPounds / (heightInches * heightInches) * 703`, and return it rounded to two decimal places. Do not persist BMI: it is derived from the saved measurements. The client uses the returned BMI to render the filtered-results table locally. The filtered list exists only in UI state and is not sent to or stored by the database.

Keep the API implementation proportionate to the exercise: Express routes handle HTTP input/output, shared validation and BMI functions hold reusable application logic, and Prisma handles database access. Avoid introducing pagination, sorting, cursor handling, or soft-delete behavior in this release.

### Validation and error handling

Validate in the form for usability and independently in the API as the authoritative boundary. Use Zod or equivalent schema validation on the API.

- Trim first and last names and reject values that are empty after trimming. Do not restrict names to letters only.
- Trim and lowercase email before persistence; validate it as an email address and reject values longer than 254 characters.
- Keep phone as a string to preserve leading zeroes. Accept common international formatting characters (an optional leading `+`, digits, spaces, parentheses, periods, and hyphens); require 7–15 digits after removing formatting characters. Do not require digits-only input.
- Require height and weight to be finite positive numbers. Allow decimals; do not impose arbitrary clinical ranges in this exercise.
- For BMI filter bounds, accept blank values as absent, require any supplied value to be finite and non-negative, and reject a minimum greater than a maximum.

Return `201 Created` on successful creation and `400 Bad Request` with field-level errors for invalid input. The UI displays API errors beside the relevant fields or filter controls, preserves entered values after a failed submission, and clears the form only after a successful save. Return a generic `500 Internal Server Error` for unexpected failures without exposing database details. Do not log request bodies or participant contact details.

### Persistence

Use PostgreSQL with a single `participants` table managed by Prisma migrations. Store a generated ID, first name, last name, normalized email, phone as text, height in inches, weight in pounds, and creation timestamp. Use database types appropriate for fractional height and weight. Do not store the derived BMI, filtered results, or a status field in the initial schema.

### Follow-up work

Add administrative authentication and authorization before exposing the application beyond the local/interview environment. Deployment hardening and production secret management should be addressed with that work. These are follow-ups, not requirements of the initial implementation.

## Consequences

This stack matches the requested React/Vite, Express, TypeScript, PostgreSQL, and Docker environment without adding Next.js. Explicit imperial units keep the BMI formula consistent from form entry through API calculation. Keeping BMI derived avoids storing redundant data, while the separate filtered-results table makes the display-only nature of the filter clear.

The initial implementation intentionally favors a small, understandable workflow over pagination, sorting, soft deletion, authentication, or theming. Loading the participant list for client-side display filtering is appropriate for this exercise; a larger production dataset may require server-side filtering and pagination as a separate decision.
