// server/middleware/logger.js
const fs = require("fs");
const path = require("path");
const { createLogger, transports, format } = require("winston");
require("winston-daily-rotate-file");

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const audit = new transports.DailyRotateFile({
  filename: path.join(logsDir, "audit-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxFiles: "14d",
});

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [audit],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({ format: format.simple() }));
}

// morgan stream support
logger.stream = {
  write: (message) => logger.info({ evt: "http_request", msg: message.trim() }),
};

module.exports = logger;
