const winston = require("winston");

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: "info", //เก็บ log info,warn,error

  transports: [
    //แสดง log ใน terminal
    new winston.transports.Console({
      format: consoleFormat,
    }),
    //เก็บ log เฉพาะ error ลงไฟล์
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: fileFormat,
    }),
    //เก็บ log ทุกระดับตั้งแต่ info ขึ้นไป
    new winston.transports.File({
      filename: "logs/auth.log",
      format: fileFormat,
    }),
  ],
});

module.exports = logger;
