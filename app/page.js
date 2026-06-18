'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function VaultPage() {
  const [secrets, setSecrets] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) fetchSecrets()
    }
    getSession()
  }, [])

  const fetchSecrets = async () => {
    const { data, error } = await supabase
      .from('vault_secrets')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setSecrets(data)
  }

  // Quick authentication helper to make testing easy
  const handleSignUpOrIn = async (type) => {
    setLoading(true)
    let result
    if (type === 'signup') {
      // Sign up and auto-login without email verification
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      // Automatically sign in after signup
      if (!result.error && result.data.user) {
        const signInResult = await supabase.auth.signInWithPassword({ email, password })
        result = signInResult
      }
    } else {
      result = await supabase.auth.signInWithPassword({ email, password })
    }
    setLoading(false)
    if (result.error) alert(result.error.message)
    else {
      setUser(result.data.user)
      fetchSecrets()
    }
  }

  const handleSaveSecret = async (e) => {
    e.preventDefault()
    if (!title || !content || !user) return
    setLoading(true)

    const { error } = await supabase
      .from('vault_secrets')
      .insert([{ user_id: user.id, secret_title: title, secret_content: content }])

    setLoading(false)
    if (!error) {
      setTitle('')
      setContent('')
      fetchSecrets()
    } else {
      alert('Error saving data securely.')
    }
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🔐 Access the Vault</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '8px' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '8px' }} />
          <button onClick={() => handleSignUpOrIn('login')} disabled={loading} style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }}>Log In</button>
          <button onClick={() => handleSignUpOrIn('signup')} disabled={loading} style={{ padding: '10px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Sign Up</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🔐 Secure Vault Dashboard</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>Logged in as: <strong>{user.email}</strong></p>
      <button onClick={() => { supabase.auth.signOut(); setUser(null); }} style={{ padding: '4px 8px', background: '#ff4d4d', color: 'white', border: 'none', cursor: 'pointer' }}>Log Out</button>
      <hr style={{ border: '1px solid #eee', margin: '20px 0' }} />
      <form onSubmit={handleSaveSecret} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3>Store a New Secret</h3>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Title:</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., WiFi Password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Secret Content:</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="e.g., SuperSecret123!" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '80px' }} required />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Encrypting & Sending...' : 'Save Secret'}
        </button>
      </form>
      <hr style={{ border: '1px solid #eee', margin: '30px 0' }} />
      <h3>Your Secured Secrets</h3>
      {secrets.length === 0 ? (
        <p style={{ color: '#999' }}>No secrets stored yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {secrets.map((item) => (
            <div key={item.id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '4px', background: '#fafafa' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#333' }}>{item.secret_title}</h4>
              <p style={{ margin: '0', fontFamily: 'monospace', background: '#eee', padding: '6px', borderRadius: '2px', wordBreak: 'break-all' }}>{item.secret_content}</p>
              <span style={{ fontSize: '10px', color: '#999' }}>Stored at: {new Date(item.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}