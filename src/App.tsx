import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'

import { supabase } from './lib/supabase'

import Home from './pages/Home'
import Missions from './pages/Missions'
import Ideas from './pages/Ideas'
import Calculator from './pages/Calculator'
import ProfileSetup from './pages/ProfileSetup'

function Login({
  session,
}: {
  session: Session | null
}) {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      navigate('/home')
    }
  }, [session, navigate])

  async function login() {
    if (!email || !password) {
      setMessage('Preencha e-mail e senha.')
      return
    }

    setLoading(true)
    setMessage('Entrando...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      setMessage('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    setMessage('')
    setLoading(false)

    navigate('/home')
  }

  if (session) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="login-page">
      <section className="login-box">
        <h1>GUILDY</h1>

        <p>Entre na Guilda</p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              login()
            }
          }}
        />

        <button
          onClick={login}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] =
    useState<Session | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [profileComplete, setProfileComplete] =
    useState<boolean | null>(null)

  useEffect(() => {
    async function carregarSessao() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)
      setLoading(false)
    }

    carregarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)

        if (!newSession) {
          setProfileComplete(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function verificarPerfil() {
      if (!session) {
        setProfileComplete(null)
        return
      }

      const { data, error } =
        await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single()

      if (error) {
        console.error(
          'Erro ao verificar perfil:',
          error
        )

        setProfileComplete(false)
        return
      }

      setProfileComplete(
        Boolean(data?.onboarding_completed)
      )
    }

    verificarPerfil()
  }, [session])

  if (loading) {
    return (
      <div className="loading">
        Carregando GUILDY...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={
            <Login session={session} />
          }
        />

        <Route
          path="/setup-profile"
          element={
            session ? (
              profileComplete === null ? (
                <div className="loading">
                  Verificando perfil...
                </div>
              ) : profileComplete ? (
                <Navigate
                  to="/home"
                  replace
                />
              ) : (
                <ProfileSetup
                  onCompleted={() =>
                    setProfileComplete(true)
                  }
                />
              )
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          }
        />

        <Route
          path="/home"
          element={
            session ? (
              profileComplete === null ? (
                <div className="loading">
                  Carregando perfil...
                </div>
              ) : profileComplete ? (
                <Home />
              ) : (
                <Navigate
                  to="/setup-profile"
                  replace
                />
              )
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          }
        />

        <Route
          path="/missions"
          element={
            session ? (
              profileComplete === null ? (
                <div className="loading">
                  Carregando perfil...
                </div>
              ) : profileComplete ? (
                <Missions />
              ) : (
                <Navigate
                  to="/setup-profile"
                  replace
                />
              )
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          }
        />

        <Route
          path="/ideas"
          element={
            session ? (
              profileComplete === null ? (
                <div className="loading">
                  Carregando perfil...
                </div>
              ) : profileComplete ? (
                <Ideas />
              ) : (
                <Navigate
                  to="/setup-profile"
                  replace
                />
              )
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          }
        />

        <Route
          path="/calculator"
          element={
            session ? (
              profileComplete === null ? (
                <div className="loading">
                  Carregando perfil...
                </div>
              ) : profileComplete ? (
                <Calculator />
              ) : (
                <Navigate
                  to="/setup-profile"
                  replace
                />
              )
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={session ? '/home' : '/'}
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App