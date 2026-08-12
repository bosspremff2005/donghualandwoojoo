import { Hono } from 'hono'
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/auth'

type Bindings = { DB: D1Database, JWT_SECRET: string }
export const userRoutes = new Hono<{ Bindings: Bindings }>()

const JWT_SECRET_DEFAULT = 'donghua-secret-key-2024'

function getSecret(env: any): string {
  return env.JWT_SECRET || JWT_SECRET_DEFAULT
}

// ==================== REGISTER ====================
userRoutes.post('/register', async (c) => {
  const db = c.env.DB
  try {
    const { username, email, password } = await c.req.json()
    
    if (!username || !email || !password) return c.json({ error: 'All fields required' }, 400)
    if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
    if (username.length < 3) return c.json({ error: 'Username must be at least 3 characters' }, 400)
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return c.json({ error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)

    // Check registration enabled
    try {
      const regSetting = await db.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").first()
      if ((regSetting as any)?.value === '0') {
        return c.json({ error: 'Registration is currently disabled' }, 403)
      }
    } catch {} // ignore settings error
    
    const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
    if (existingEmail) return c.json({ error: 'Email already registered' }, 409)
    
    const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existingUsername) return c.json({ error: 'Username already taken' }, 409)
    
    const hash = await hashPassword(password)
    const result = await db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).bind(username, email.toLowerCase(), hash).run()
    
    const userId = result.meta.last_row_id
    const user = { id: userId, username, email: email.toLowerCase(), role: 'user', plan: 'free' }
    const token = await generateToken(user, getSecret(c.env))
    
    return c.json({ success: true, token, user })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== LOGIN ====================
userRoutes.post('/login', async (c) => {
  const db = c.env.DB
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
    
    const user = await db.prepare(
      'SELECT * FROM users WHERE email = ? OR username = ?'
    ).bind(email.toLowerCase(), email).first()
    
    if (!user) return c.json({ error: 'Invalid credentials' }, 401)
    if (!(user as any).is_active) return c.json({ error: 'Account suspended' }, 403)
    
    const valid = await verifyPassword(password, (user as any).password_hash)
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401)
    
    const userData = { 
      id: (user as any).id, 
      username: (user as any).username, 
      email: (user as any).email, 
      role: (user as any).role, 
      plan: (user as any).plan,
      avatar: (user as any).profile_image || (user as any).avatar,
    }
    const token = await generateToken(userData, getSecret(c.env))
    
    return c.json({ success: true, token, user: userData })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== GET CURRENT USER ====================
userRoutes.get('/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Not authenticated' }, 401)
  
  try {
    const token = auth.replace('Bearer ', '')
    const payload = await verifyToken(token, getSecret(c.env))
    
    const user = await c.env.DB.prepare(`
      SELECT id, username, email, role, plan, avatar, profile_image, cover_image, bio, created_at 
      FROM users WHERE id = ?
    `).bind(payload.id).first()
    if (!user) return c.json({ error: 'User not found' }, 404)
    
    return c.json(user)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// ==================== UPDATE PROFILE ====================
// PUT /api/users/profile
// Update username and bio (NOT password or images - those have separate endpoints)
userRoutes.put('/profile', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Not authenticated' }, 401)
  
  try {
    const token = auth.replace('Bearer ', '')
    const payload = await verifyToken(token, getSecret(c.env))
    const db = c.env.DB

    const body = await c.req.json()
    const { username, bio } = body

    if (username !== undefined) {
      if (username.length < 3) return c.json({ error: 'Username must be at least 3 characters' }, 400)
      if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return c.json({ error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' }, 400)
      }
      // Check uniqueness (excluding current user)
      const existing = await db.prepare(
        'SELECT id FROM users WHERE username = ? AND id != ?'
      ).bind(username, payload.id).first()
      if (existing) return c.json({ error: 'Username already taken' }, 409)
    }

    if (bio !== undefined && bio.length > 500) {
      return c.json({ error: 'Bio must be 500 characters or less' }, 400)
    }

    await db.prepare(
      'UPDATE users SET username = COALESCE(?, username), bio = COALESCE(?, bio), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(username || null, bio !== undefined ? bio : null, payload.id).run()

    // Fetch updated user
    const updated = await db.prepare(
      'SELECT id, username, email, role, plan, avatar, profile_image, cover_image, bio, created_at FROM users WHERE id = ?'
    ).bind(payload.id).first()

    // Generate new token with updated username
    const newToken = await generateToken({
      id: (updated as any).id,
      username: (updated as any).username,
      email: (updated as any).email,
      role: (updated as any).role,
      plan: (updated as any).plan,
      avatar: (updated as any).profile_image || (updated as any).avatar,
    }, getSecret(c.env))

    return c.json({ success: true, user: updated, token: newToken })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== CHANGE PASSWORD ====================
// POST /api/users/change-password
userRoutes.post('/change-password', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Not authenticated' }, 401)
  
  try {
    const token = auth.replace('Bearer ', '')
    const payload = await verifyToken(token, getSecret(c.env))
    const db = c.env.DB

    const { current_password, new_password } = await c.req.json()
    
    if (!current_password || !new_password) {
      return c.json({ error: 'Current password and new password are required' }, 400)
    }
    if (new_password.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400)
    }

    // Verify current password
    const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(payload.id).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    const valid = await verifyPassword(current_password, (user as any).password_hash)
    if (!valid) return c.json({ error: 'Current password is incorrect' }, 401)

    // Hash new password
    const newHash = await hashPassword(new_password)
    await db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newHash, payload.id).run()

    return c.json({ success: true, message: 'Password changed successfully' })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== WATCHLIST ====================
userRoutes.post('/watchlist', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Not authenticated' }, 401)
  
  try {
    const token = auth.replace('Bearer ', '')
    const payload = await verifyToken(token, getSecret(c.env))
    const { anime_id } = await c.req.json()
    
    const existing = await c.env.DB.prepare(
      'SELECT id FROM watchlist WHERE user_id = ? AND anime_id = ?'
    ).bind(payload.id, anime_id).first()
    
    if (existing) {
      await c.env.DB.prepare(
        'DELETE FROM watchlist WHERE user_id = ? AND anime_id = ?'
      ).bind(payload.id, anime_id).run()
      return c.json({ success: true, action: 'removed' })
    } else {
      await c.env.DB.prepare(
        'INSERT INTO watchlist (user_id, anime_id) VALUES (?, ?)'
      ).bind(payload.id, anime_id).run()
      return c.json({ success: true, action: 'added' })
    }
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// ==================== GET WATCHLIST ====================
userRoutes.get('/watchlist', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Not authenticated' }, 401)
  
  try {
    const token = auth.replace('Bearer ', '')
    const payload = await verifyToken(token, getSecret(c.env))
    
    const data = await c.env.DB.prepare(`
      SELECT a.id, a.title, a.slug, a.cover_image, a.status, a.type,
             a.rating, a.episode_count, w.created_at as added_at
      FROM watchlist w JOIN anime a ON w.anime_id = a.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).bind(payload.id).all()
    
    return c.json({ success: true, data: data.results })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// ==================== ADMIN: GET ALL USERS ====================
userRoutes.get('/', async (c) => {
  const db = c.env.DB
  try {
    const users = await db.prepare(
      'SELECT id, username, email, role, plan, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100'
    ).all()
    return c.json({ data: users.results })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== ADMIN: UPDATE USER ====================
userRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  try {
    const body = await c.req.json()
    const { role, plan, is_active } = body
    await db.prepare(
      'UPDATE users SET role = ?, plan = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(
      role || 'user', plan || 'free',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      parseInt(id)
    ).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== ADMIN: DELETE USER ====================
userRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  try {
    await db.prepare('DELETE FROM users WHERE id = ?').bind(parseInt(id)).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})
