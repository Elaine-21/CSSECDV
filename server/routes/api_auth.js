// server/routes/api_auth.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const LOG_DIR = path.join(process.cwd(), "logs");
const ALLOWED = new Set(["audit.log"]); // whitelist to avoid arbitrary file reads

function safeReadTail(filePath, maxBytes = 200_000) {
  const stats = fs.statSync(filePath);
  const start = Math.max(0, stats.size - maxBytes);
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(stats.size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  return buf.toString("utf8");
}

// GET /api/auth/log?file=audit.log  (admin-only; guarded in server.js)
router.get("/log", (req, res) => {
  const filename = (req.query.file || "audit.log").toString();
  if (!ALLOWED.has(filename)) return res.status(400).send("Unsupported log file.");

  const filePath = path.join(LOG_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Log not found.");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(safeReadTail(filePath));
});

module.exports = router;
