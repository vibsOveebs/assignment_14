// Run with: node --test server/tests
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../app');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('GET /api/health returns {ok:true}', async () => {
  process.env.SKIP_DB = 'true';
  const app = createApp();
  const { server, port } = await listen(app);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { ok: true });
  } finally {
    server.close();
  }
});

test('unknown route returns 404 JSON', async () => {
  process.env.SKIP_DB = 'true';
  const app = createApp();
  const { server, port } = await listen(app);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.message, 'Route Not Found');
  } finally {
    server.close();
  }
});
