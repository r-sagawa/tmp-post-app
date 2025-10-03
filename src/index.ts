import app from "./routes/index.tsx";

Deno.serve(app.fetch);
