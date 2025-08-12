// server/middleware/logger.js
const fs = require("fs");
const path = require("path");
const { createLogger, transports, format } = require("winston");

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.File({ filename: path.join(logsDir, "audit.log") })],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({ format: format.simple() }));
}

logger.stream = {
  write: (message) => logger.info({ event: "http_request", msg: message.trim() }),
};

module.exports = logger;
