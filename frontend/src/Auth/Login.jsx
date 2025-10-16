import { supabase } from '../supabaseClient.js'
import { useState } from 'react'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) console.error(error)
    else console.log('Signed up:', data)
  }

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) console.error(error)
    else console.log('Signed in:', data)
  }

  const handleGoogleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) console.error(error)
  }

  return (
    <div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleSignUp}>Sign Up</button>
      <button onClick={handleSignIn}>Sign In</button>
      <button onClick={handleGoogleSignIn}>Sign In with Google</button>
    </div>
  )
}