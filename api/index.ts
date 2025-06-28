import { Hono } from 'hono'

// Definisikan tipe untuk Bindings agar Hono mengetahui properti `env` Anda
// Asumsikan `DB` adalah D1 Database Binding dan `ASSETS` untuk Cloudflare Pages/Workers
interface Env {
  DB: D1Database; // Ini telah diperbaiki dari IDDatabase menjadi D1Database
  ASSETS: { fetch: typeof fetch }; // Untuk fallback ke frontend
}

const app = new Hono<{ Bindings: Env }>()

// Contoh endpoint sederhana
app.get('/api', (c) => {
  return c.text('Hello from API!');
})

// --- USERS TABLE ENDPOINTS ---

// GET all users
app.get('/api/users', async (c) => {
  try {
    // Ambil semua data dari tabel users
    const { results } = await c.env.DB.prepare("SELECT * FROM users").all();
    return c.json(results);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
})

// GET a specific user by ID (added for frontend's fetchCurrentUser)
app.get('/api/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { results } = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).all();
    if (results.length > 0) {
      return c.json(results[0]); // Return the first user found
    } else {
      return c.json({ message: 'User not found' }, 404);
    }
  } catch (error) {
    console.error("Error fetching specific user:", error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
})


// POST a new user
// Ini akan sesuai dengan skema users (id, name, avatar)
app.post('/api/users', async (c) => {
  try {
    // Dapatkan 'id', 'name', dan 'avatar' dari body request JSON
    // Pastikan frontend mengirimkan ID jika ingin spesifik, atau gunakan crypto.randomUUID() di backend
    const { id, name, avatar } = await c.req.json();

    // Validasi input dasar
    if (!id || !name) { // ID kini wajib jika dikirim dari frontend
      return c.json({ message: 'ID and Name are required' }, 400);
    }

    // Bind data yang benar ke kolom 'id', 'name', 'avatar'
    await c.env.DB.prepare(`
      INSERT INTO users(id, name, avatar) VALUES (?, ?, ?)`
    ).bind(id, name, avatar || null).run(); // 'avatar || null' untuk menangani jika avatar tidak disediakan

    return c.json({ message: 'User created successfully' }, 201); // 201 Created
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
})

// PUT (Update) an existing user
// Ini akan sesuai dengan skema users (mengupdate name dan avatar)
app.put('/api/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    // Dapatkan 'name' dan 'avatar' dari body request JSON
    const { name, avatar } = await c.req.json();

    // Validasi input dasar
    if (!name) { // Nama wajib untuk update
      return c.json({ message: 'Name is required for update' }, 400);
    }

    // Update kolom 'name' dan 'avatar' di tabel users
    await c.env.DB.prepare(`
      UPDATE users SET name = ?, avatar = ? WHERE id = ?
    `).bind(name, avatar || null, id).run();

    return c.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
})

// DELETE a user
app.delete('/api/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    // Gunakan c.env.DB untuk konsistensi
    const { success } = await c.env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(id).run();

    if (success) {
      return c.json({ message: 'User deleted successfully' });
    } else {
      return c.json({ message: 'User not found or failed to delete' }, 404);
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
})

// --- CHATS TABLE ENDPOINTS ---

// GET all chats (with user info JOINED)
app.get('/api/chats', async (c) => {
  try {
    // Bergabung dengan tabel users untuk mendapatkan nama pengguna dan avatar
    const { results } = await c.env.DB.prepare(`
      SELECT c.id, c.message, c.user_id, u.name as user_name, u.avatar as user_avatar,
             c.timestamp -- Tambahkan timestamp jika Anda memilikinya di tabel chats
      FROM chats c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.timestamp ASC, c.id ASC -- Urutkan berdasarkan waktu atau ID
    `).all();
    return c.json(results);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return c.json({ error: 'Failed to fetch chats' }, 500);
  }
})

// POST a new chat message
// Ini akan sesuai dengan skema chats (id, user_id, message)
app.post('/api/chats', async (c) => {
  try {
    // Dapatkan 'user_id' dan 'message' dari body request JSON
    const { user_id, message } = await c.req.json();

    // Validasi input dasar
    if (!user_id || !message) {
      return c.json({ message: 'User ID and message are required' }, 400);
    }

    // Gunakan crypto.randomUUID() untuk ID unik dan tambahkan timestamp
    const newId = crypto.randomUUID();
    const timestamp = new Date().toISOString(); // Simpan timestamp dalam format ISO

    await c.env.DB.prepare(`
      INSERT INTO chats(id, user_id, message, timestamp) VALUES (?, ?, ?, ?)` // Tambah timestamp
    ).bind(newId, user_id, message, timestamp).run();

    // Mengubah kunci 'message' yang duplikat menjadi 'statusMessage'
    return c.json({ id: newId, user_id, message, timestamp, statusMessage: 'Message sent successfully' }, 201);
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
})

// PUT (Update) an existing chat message
// Ini akan sesuai dengan skema chats (mengupdate message)
app.put('/api/chats/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { message } = await c.req.json(); // Hanya izinkan update pesan

    if (!message) {
      return c.json({ message: 'Message content is required for update' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE chats SET message = ? WHERE id = ?
    `).bind(message, id).run();

    return c.json({ message: 'Chat message updated successfully' });
  } catch (error) {
    console.error("Error updating chat message:", error);
    return c.json({ error: 'Failed to update message' }, 500);
  }
})

// DELETE a chat message
app.delete('/api/chats/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { success } = await c.env.DB.prepare(`
      DELETE FROM chats WHERE id = ?
    `).bind(id).run();

    if (success) {
      return c.json({ message: 'Chat message deleted successfully' });
    } else {
      return c.json({ message: 'Chat message not found or failed to delete' }, 404);
    }
  } catch (error) {
    console.error("Error deleting chat message:", error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
})


// Untuk fallback ke frontend (digunakan dalam Cloudflare Pages/Workers)
app.get('*', async (c) => await c.env.ASSETS.fetch(c.req.raw))

export default app;
