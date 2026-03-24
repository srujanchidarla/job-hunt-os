import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import analyzeRoute from "./routes/analyze.js";

// Fix for ES modules on Windows — finds .env relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

// Debug — remove after confirming keys load
console.log(
  "ANTHROPIC key loaded:",
  process.env.ANTHROPIC_API_KEY ? "YES ✓" : "NO ✗",
);
console.log(
  "NOTION key loaded:",
  process.env.NOTION_API_KEY ? "YES ✓" : "NO ✗",
);
console.log(
  "NOTION DB ID loaded:",
  process.env.NOTION_DATABASE_ID ? "YES ✓" : "NO ✗",
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", analyzeRoute);

app.listen(PORT, () => {
  console.log(`JobHuntOS backend running on port ${PORT}`);
});
