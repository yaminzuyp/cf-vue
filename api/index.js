import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>

app.get('/api', (c) => {
  return c.text('hi');
})


app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM users").all()
  return c.json(results)
})

app.post('/api/users', async (c) => {
  const { user_id, message } = await c.req.json()
  await c.env.DB.prepare(`
    INSERT INTO users(id, user_id, message) VALUES (?, ?, ?)`
  ).bind(crypto.randomUUID(), user_id, message).run()

  return c.json({message: 'ok'})
})

app.put('/api/users/:id', async (c) => {
  const { id } = c.req.param()
  const { user_id, message } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE usersSET user_id = ?, message = ? WHERE id = ?
  `).bind(user_id, message, id).run()

  return c.json({message: 'ok'})
})

app.delete('/api/users/:id', async (c) => {
  const { id } = c.req.param()
  await c.env.CHAT_DB.prepare(`
    DELETE FROM users WHERE id = ?
  `).bind(id).run()

  return c.json({message: 'ok'})
})

// untuk fallback ke frontend
app.get('*', async (c) => await c.env.ASSETS.fetch(c.req.raw))

export default app

