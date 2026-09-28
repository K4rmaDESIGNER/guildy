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
import Profile from './pages/Profile'

/* =========================================================
   TELA DE CARREGAMENTO
========================================================= */

function LoadingScreen() {
  return (
    <div className="loading">
      Carregando GUILDY...
    </div>
  )
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  async function handleLogin(
    event: React.FormEvent
  ) {
    event.preventDefault()

    setMessage('')

    if (
      !email.trim() ||
      !password.trim()
    ) {
      setMessage(
        'Preencha o e-mail e a senha.'
      )

      return
    }

    setLoading(true)

    const {
      data,
      error,
    } = await supabase.auth
      .signInWithPassword({
        email:
          email.trim(),

        password,
      })

    if (error) {
      console.error(
        'Erro no login:',
        error
      )

      setMessage(
        'E-mail ou senha incorretos.'
      )

      setLoading(false)
      return
    }

    if (
      data.session
    ) {
      navigate('/home')
    }

    setLoading(false)
  }

  return (
    <main className="login-page">

      <section className="login-box">

        <span className="login-small">
          SISTEMA DA GUILDA
        </span>

        <h1>
          GUILDY
        </h1>

        <p>
          Organize. Complete.
          Evolua.
        </p>

        <form
          onSubmit={
            handleLogin
          }
        >

          <input
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={email}
            onChange={(
              event
            ) =>
              setEmail(
                event.target.value
              )
            }
          />

          <input
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(
              event
            ) =>
              setPassword(
                event.target.value
              )
            }
          />

          <button
            type="submit"
            disabled={
              loading
            }
          >

            {loading
              ? 'ENTRANDO...'
              : 'ENTRAR NA GUILDA'}

          </button>

        </form>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </section>

    </main>
  )
}

/* =========================================================
   APP INTERNO
========================================================= */

function AppContent() {
  const [session, setSession] =
    useState<Session | null>(
      null
    )

  /*
    null = ainda verificando
    false = onboarding incompleto
    true = onboarding completo
  */

  const [
    profileComplete,
    setProfileComplete,
  ] =
    useState<
      boolean | null
    >(null)

  const [
    loadingSession,
    setLoadingSession,
  ] =
    useState(true)

  /* =======================================================
     SESSÃO SUPABASE
  ======================================================= */

  useEffect(() => {
    let mounted =
      true

    async function loadSession() {
      const {
        data,
      } =
        await supabase.auth
          .getSession()

      if (
        !mounted
      ) {
        return
      }

      setSession(
        data.session
      )

      setLoadingSession(
        false
      )
    }

    loadSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            newSession
          ) => {
            setSession(
              newSession
            )

            if (
              !newSession
            ) {
              setProfileComplete(
                null
              )
            }
          }
        )

    return () => {
      mounted =
        false

      subscription
        .unsubscribe()
    }
  }, [])

  /* =======================================================
     VERIFICAR ONBOARDING
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false

    async function checkProfile() {
      if (
        !session?.user
      ) {
        setProfileComplete(
          null
        )

        return
      }

      /*
        Enquanto consulta o perfil,
        deixamos como null para
        impedir redirecionamentos
        prematuros.
      */

      setProfileComplete(
        null
      )

      const {
        data,
        error,
      } =
        await supabase
          .from('profiles')
          .select(
            'onboarding_completed'
          )
          .eq(
            'id',
            session.user.id
          )
          .single()

      if (
        cancelled
      ) {
        return
      }

      if (error) {
        console.error(
          'Erro ao verificar perfil:',
          error
        )

        /*
          Em caso de erro/perfil
          incompleto, mandamos para
          configuração do perfil.
        */

        setProfileComplete(
          false
        )

        return
      }

      setProfileComplete(
        Boolean(
          data
            ?.onboarding_completed
        )
      )
    }

    checkProfile()

    return () => {
      cancelled =
        true
    }
  }, [
    session?.user.id,
  ])

  /* =======================================================
     CARREGAMENTO INICIAL
  ======================================================= */

  if (
    loadingSession
  ) {
    return (
      <LoadingScreen />
    )
  }

  /* =======================================================
     FUNÇÃO AUXILIAR PARA ROTAS PROTEGIDAS
  ======================================================= */

  function protectedPage(
    page: React.ReactNode
  ) {
    if (
      !session
    ) {
      return (
        <Navigate
          to="/"
          replace
        />
      )
    }

    if (
      profileComplete ===
      null
    ) {
      return (
        <LoadingScreen />
      )
    }

    if (
      !profileComplete
    ) {
      return (
        <Navigate
          to="/setup-profile"
          replace
        />
      )
    }

    return page
  }

  /* =======================================================
     ROTAS
  ======================================================= */

  return (
    <Routes>

      {/* ===============================================
          LOGIN / ENTRADA
      =============================================== */}

      <Route
        path="/"
        element={
          !session ? (

            <Login />

          ) : profileComplete ===
            null ? (

            <LoadingScreen />

          ) : profileComplete ? (

            <Navigate
              to="/home"
              replace
            />

          ) : (

            <Navigate
              to="/setup-profile"
              replace
            />

          )
        }
      />

      {/* ===============================================
          PRIMEIRO PERFIL
      =============================================== */}

      <Route
        path="/setup-profile"
        element={
          !session ? (

            <Navigate
              to="/"
              replace
            />

          ) : profileComplete ===
            null ? (

            <LoadingScreen />

          ) : profileComplete ? (

            <Navigate
              to="/home"
              replace
            />

          ) : (

            <ProfileSetup
              onCompleted={() => {
                setProfileComplete(
                  true
                )
              }}
            />

          )
        }
      />

      {/* ===============================================
          HOME
      =============================================== */}

      <Route
        path="/home"
        element={
          protectedPage(
            <Home />
          )
        }
      />

      {/* ===============================================
          MISSÕES
      =============================================== */}

      <Route
        path="/missions"
        element={
          protectedPage(
            <Missions />
          )
        }
      />

      {/* ===============================================
          IDEIAS
      =============================================== */}

      <Route
        path="/ideas"
        element={
          protectedPage(
            <Ideas />
          )
        }
      />

      {/* ===============================================
          CALCULADORA
      =============================================== */}

      <Route
        path="/calculator"
        element={
          protectedPage(
            <Calculator />
          )
        }
      />

      {/* ===============================================
          PERFIL
      =============================================== */}

      <Route
        path="/profile"
        element={
          protectedPage(
            <Profile />
          )
        }
      />

      {/* ===============================================
          QUALQUER OUTRO ENDEREÇO
      =============================================== */}

      <Route
        path="*"
        element={
          !session ? (

            <Navigate
              to="/"
              replace
            />

          ) : profileComplete ===
            null ? (

            <LoadingScreen />

          ) : profileComplete ? (

            <Navigate
              to="/home"
              replace
            />

          ) : (

            <Navigate
              to="/setup-profile"
              replace
            />

          )
        }
      />

    </Routes>
  )
}

/* =========================================================
   APP PRINCIPAL
========================================================= */

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App