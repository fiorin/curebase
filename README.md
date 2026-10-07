# Participant Pre-Screening :stethoscope:
### _A simple participant intake and BMI pre-screening application_

**by** [Fiorin](https://fior.in)

## .: Backend :.

The backend validates and stores participant contact and measurement information, then returns the saved participants with BMI calculated from height in inches and weight in pounds. BMI-filtered results are a display-only view in the frontend; the filter does not update or persist records.

The following technologies are used in the backend:

| What? | For what? |
| --- | --- |
| Node.js 22+ + TypeScript | API runtime and language. |
| Express 4 | HTTP API and route handling. |
| PostgreSQL 16 | Relational database. |
| Prisma 6 | ORM, schema, and migrations. |
| Zod 3 | Request validation. |
| Docker Compose | Local frontend, API, and PostgreSQL containers. |

### Execution requirements

- Docker Desktop with the Linux containers engine, or Docker Engine with Compose
- Node.js 22+ and npm (only needed to run services outside Docker)

### Preparing the environment

From the repository root, build and start all services:

```sh
docker compose up --build
```

The API applies database migrations on startup. Open the frontend at `http://localhost:5173`. The API is available at `http://localhost:3001`, and PostgreSQL is mapped to host port `5432`.

To stop the services, press `Ctrl+C`. To remove the containers and network, run `docker compose down`. To also remove the local database and its data, run `docker compose down -v`.

### Endpoints

| Method | Endpoint | For what? |
| --- | --- | --- |
| GET | `/api/participants` | List saved participants with server-calculated BMI, newest first. |
| POST | `/api/participants` | Validate and save a participant. |
| GET | `/health` | Check that the API is running. |

#### `POST /api/participants`

Request body:

```json
{
  "firstName": "Avery",
  "lastName": "Jordan",
  "email": "avery@example.com",
  "phone": "+1 (555) 234-5678",
  "heightInches": 66,
  "weightPounds": 150
}
```

Names must not be blank, email must be valid, phone must contain 7–15 digits (common formatting characters are accepted), and height and weight must be finite positive numbers. A successful request returns `201 Created`, including the saved record and BMI:

```json
{
  "id": "...",
  "firstName": "Avery",
  "lastName": "Jordan",
  "email": "avery@example.com",
  "phone": "+1 (555) 234-5678",
  "heightInches": 66,
  "weightPounds": 150,
  "createdAt": "...",
  "bmi": 24.96
}
```

Invalid fields return `400 Bad Request` with field-specific validation errors. BMI is calculated as `weightLb / heightIn² × 703` and rounded to two decimal places. It is derived from the stored measurements and is not stored in the database.

### Database and migrations

The Prisma schema and initial migration are in `server/prisma/`. The participants table stores names, normalized email, phone as text, height in inches, weight in pounds, and creation time.

Useful commands (run from `server/`):

```sh
npm run db:generate
npm run db:deploy
```

For a local schema change, create and commit a Prisma migration:

```sh
npx prisma migrate dev --name describe_schema_change
```

The Docker API container runs `db:deploy` on startup. Use `db:deploy` to apply committed migrations.

### Checks

Run from `server/`:

```sh
npm run typecheck
```

## .: Frontend :.

The frontend provides a participant-entry form, a table of all saved participants, and a separate table of participants within the selected BMI range.

| What? | For what? |
| --- | --- |
| React 19 + TypeScript | UI components and state. |
| Vite 6 | Development server and production build. |
| Tailwind CSS 3 | Responsive utility styling. |
| `fetch` | Calls the Express API through Vite's `/api` proxy. |

The BMI controls have inclusive minimum and maximum bounds. Blank bounds are optional; an invalid range is reported in the UI. Filtering is performed for display only and does not change saved records.

### Preparing the environment

To run the frontend outside Docker, start PostgreSQL first. You can start the Compose database from the repository root:

```sh
docker compose up -d db
```

In a PowerShell terminal, from `server/`, set the database connection and start the API:

```sh
$env:DATABASE_URL = "postgresql://clinical:clinical@localhost:5432/clinical?schema=public"
npm ci
npm run db:generate
npm run db:deploy
npm run dev
```

In a second terminal, from `client/`:

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Vite proxies `/api` requests to `http://localhost:3001` by default. To use a different API host, set `VITE_API_PROXY_TARGET` before starting Vite.

Build and type-check the frontend with:

```sh
npm run typecheck
npm run build
```

## Design notes

- The API validates all input independently of the browser and calculates BMI from the saved height and weight.
- Email is trimmed and lowercased before persistence. Phone numbers remain strings so leading zeroes and formatting are preserved.
- The all-participants table and BMI-filtered table are separate views. The filter is applied in the frontend and filtered results are never stored.
- The app is intended for local/interview use. Administrative authentication and authorization are follow-up work before exposing it beyond that environment.
- Pagination, sorting, soft deletion, and dark mode are outside the initial implementation scope.

---

#### Useful links

- [Node.js](https://nodejs.org/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)

**by** [Fiorin](https://fior.in)
