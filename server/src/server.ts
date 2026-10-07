import { app } from "./app";
import { prisma } from "./prisma";

const port = Number(process.env.PORT ?? 3001);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Participant API listening on port ${port}.`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
