import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "../routes.js";
import errorMiddleware from "../middlewares/error.middleware.js";
import notFoundMiddleware from "../middlewares/notFound.middleware.js";
import config from '../config/index.js';

const expressLoader = (app) => {
  // Trust proxy (for rate limiting behind reverse proxy)
  app.set("trust proxy", 1);

  // Parse JSON bodies
  app.use(express.json());

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS
  app.use(
    cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // API routes
  app.use("/api", routes);

  // 404 handler
  app.use(notFoundMiddleware);

  // Error handler
  app.use(errorMiddleware);
};

export default expressLoader;
