const notFound = (req, res, next) => {
  const err = new Error("Route Not Found");
  err.status = 404;
  next(err);
};

// Express error-handling middleware (4 args)
// NOTE: Avoid executing arbitrary code or remote payloads here.
const errorHandler = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Keep response shape stable for API consumers
  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
