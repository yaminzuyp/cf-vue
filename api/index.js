import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/chats', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM chats").all()
  return c.json(results)
})

app.post('/api/chats', async (c) => {
  const { user_id, message } = await c.req.json()
  await c.env.DB.prepare(`
    INSERT INTO chats(id, user_id, message) VALUES (?, ?, ?)`
  ).bind(crypto.randomUUID(), user_id, message).run()

  return c.json({message: 'ok'})
})

app.put('/api/chats/:id', async (c) => {
  const { id } = c.req.param()
  const { user_id, message } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE chats SET user_id = ?, message = ? WHERE id = ?
  `).bind(user_id, message, id).run()

  return c.json({message: 'ok'})
})

app.delete('/api/chats/:id', async (c) => {
  const { id } = c.req.param()
  await c.env.CHAT_DB.prepare(`
    DELETE FROM chats WHERE id = ?
  `).bind(id).run()

  return c.json({message: 'ok'})
})

// untuk fallback ke frontend
app.get('*', async (c) => await c.env.ASSETS.fetch(c.req.raw))

export default app
