const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const config = require('./config/config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
require('dotenv').config();

function createApp() {
  const app = express();

  const corsOptions = {
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  };

  app.use(morgan('dev'));
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads
  app.use(express.static(path.join(__dirname, 'uploads')));

  const users = require('./routes/users');
  const auth = require('./routes/auth');
  const common = require('./routes/common');
  const property = require('./routes/property');
  const email = require('./routes/email');

  app.get('/', (req, res) => {
    res.status(200).send('Success');
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use('/api/user', users);
  app.use('/api/auth', auth);
  app.use('/api/common', common);
  app.use('/api/property', property);
  app.use('/api/email', email);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function connectDb() {
  const mongoUri = process.env.MONGO_URI || config.localDB;
  if (process.env.SKIP_DB === 'true') return;

  try {
    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log('Mongo connected');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Mongo connection failed:', err.message);
  }
}

async function start() {
  await connectDb();

  const PORT = process.env.PORT || 5001;
  const app = createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { createApp, connectDb };
