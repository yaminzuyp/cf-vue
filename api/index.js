import { Hono } from 'hono';

const app = new Hono();

app.get('/api', (c) => {
  return c.text('hello');
})

app.get('/api/users', async (c) => {
  let { results } = await c.env.DB.prepare("SELECT * FROM users").all()
  return c.json(results)
})

// fallback ke frontend
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
