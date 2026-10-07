import express, { type ErrorRequestHandler } from "express";
import { participantsRouter } from "./participants";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/participants", participantsRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: "Request body must be valid JSON." });
    return;
  }

  console.error("Request failed.", error instanceof Error ? error.message : "Unknown error");
  response.status(500).json({ error: "An unexpected error occurred. Please try again." });
};

app.use(errorHandler);
