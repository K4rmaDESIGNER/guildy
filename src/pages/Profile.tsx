import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type ProfileData = {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  created_at: string
}

type ProfileTab =
  | 'profile'
  | 'friends'
  | 'requests'

function Profile() {
  const navigate = useNavigate()

  const [profile, setProfile] =
    useState<ProfileData | null>(null)

  const [email, setEmail] =
    useState('')

  const [nickname, setNickname] =
    useState('')

  const [activeTab, setActiveTab] =
    useState<ProfileTab>('profile')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [platinumBalance, setPlatinumBalance] =
    useState(0)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    setEmail(
      user.email ?? ''
    )

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        nickname,
        avatar_url,
        created_at
      `)
      .eq(
        'id',
        user.id
      )
      .single()

    if (error) {
      console.error(
        'Erro ao carregar perfil:',
        error
      )

      setMessage(
        'Não foi possível carregar seu perfil.'
      )

      setLoading(false)
      return
    }

    const profileData =
      data as ProfileData

    setProfile(
      profileData
    )

    setNickname(
      profileData.nickname ?? ''
    )

    await loadPlatinum(
      user.id
    )

    setLoading(false)
  }

  async function loadPlatinum(
    userId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        'platinum_transactions'
      )
      .select('amount')
      .eq(
        'user_id',
        userId
      )

    if (error) {
      console.error(
        'Erro ao carregar Platinum:',
        error
      )

      return
    }

    const total =
      (data ?? []).reduce(
        (
          sum,
          transaction
        ) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      )

    setPlatinumBalance(
      total
    )
  }

  function normalizeNickname(
    value: string
  ) {
    return value
      .trim()
      .replace(/^@/, '')
      .toLowerCase()
  }

  function isValidNickname(
    value: string
  ) {
    return /^[a-zA-Z0-9._]{3,24}$/.test(
      value
    )
  }

  async function saveNickname() {
    setMessage('')
    setSuccessMessage('')

    const normalized =
      normalizeNickname(
        nickname
      )

    if (!normalized) {
      setMessage(
        'Escolha um nickname.'
      )
      return
    }

    if (
      !isValidNickname(
        normalized
      )
    ) {
      setMessage(
        'O nickname deve ter de 3 a 24 caracteres e usar apenas letras, números, ponto ou underline.'
      )
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage(
        'Usuário não autenticado.'
      )
      return
    }

    setSaving(true)

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .update({
        nickname:
          normalized,
      })
      .eq(
        'id',
        user.id
      )
      .select(`
        id,
        name,
        nickname,
        avatar_url,
        created_at
      `)
      .single()

    if (error) {
      console.error(
        'Erro ao salvar nickname:',
        error
      )

      if (
        error.code ===
        '23505'
      ) {
        setMessage(
          'Esse nickname já está sendo usado por outro membro.'
        )
      } else {
        setMessage(
          'Não foi possível salvar o nickname.'
        )
      }

      setSaving(false)
      return
    }

    const updated =
      data as ProfileData

    setProfile(
      updated
    )

    setNickname(
      updated.nickname ?? ''
    )

    setSaving(false)

    setSuccessMessage(
      'Nickname atualizado!'
    )
  }

  function formatDate(
    date: string
  ) {
    return new Date(date)
      .toLocaleDateString(
        'pt-BR',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }
      )
  }

  function formatPlatinum(
    value: number
  ) {
    return value
      .toLocaleString(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )
  }

  if (loading) {
    return (
      <main className="profile-page">

        <div className="profile-loading">
          Carregando membro da Guilda...
        </div>

      </main>
    )
  }

  if (!profile) {
    return (
      <main className="profile-page">

        <div className="profile-loading">
          Perfil não encontrado.
        </div>

      </main>
    )
  }

  return (
    <main className="profile-page">

      <div className="profile-container">

        {/* CABEÇALHO */}

        <header className="profile-header">

          <div>

            <button
              className="profile-back-button"
              onClick={() =>
                navigate('/home')
              }
            >
              ← VOLTAR
            </button>

            <span className="profile-kicker">
              CONTA DA GUILDA
            </span>

            <h1>
              👤 PERFIL
            </h1>

            <p>
              Sua identidade dentro
              do GUILDY.
            </p>

          </div>

        </header>

        {/* CARTÃO DO PERSONAGEM */}

        <section className="profile-hero">

          <div className="profile-avatar-frame">

            {profile.avatar_url ? (

              <img
                src={
                  profile.avatar_url
                }
                alt={
                  profile.name
                }
              />

            ) : (

              <div className="profile-avatar-fallback">
                👤
              </div>

            )}

          </div>

          <div className="profile-hero-info">

            <span>
              MEMBRO DA GUILDA
            </span>

            <h2>
              {profile.name}
            </h2>

            <strong>

              {profile.nickname
                ? `@${profile.nickname}`
                : 'Sem nickname'}

            </strong>

            <small>
              Aventureiro
            </small>

          </div>

          <div className="profile-platinum-card">

            <span>
              ◆
            </span>

            <div>

              <small>
                PLATINUM
              </small>

              <strong>
                {formatPlatinum(
                  platinumBalance
                )}
              </strong>

            </div>

          </div>

        </section>

        {/* ABAS */}

        <nav className="profile-tabs">

          <button
            className={
              activeTab ===
              'profile'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() =>
              setActiveTab(
                'profile'
              )
            }
          >
            👤 MEU PERFIL
          </button>

          <button
            className={
              activeTab ===
              'friends'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() =>
              setActiveTab(
                'friends'
              )
            }
          >
            👥 AMIGOS
          </button>

          <button
            className={
              activeTab ===
              'requests'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() =>
              setActiveTab(
                'requests'
              )
            }
          >
            ✉ SOLICITAÇÕES
          </button>

        </nav>

        {message && (
          <div className="profile-error-message">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="profile-success-message">
            ✓ {successMessage}
          </div>
        )}

        {/* ===============================
            MEU PERFIL
        =============================== */}

        {activeTab ===
          'profile' && (

          <section className="profile-panel">

            <div className="profile-section-title">

              <span>
                IDENTIDADE
              </span>

              <h2>
                Informações do membro
              </h2>

            </div>

            <div className="profile-info-grid">

              <div className="profile-info-field">

                <label>
                  Nome
                </label>

                <div>
                  {profile.name}
                </div>

              </div>

              <div className="profile-info-field">

                <label>
                  E-mail
                </label>

                <div>
                  {email}
                </div>

              </div>

              <div className="profile-info-field">

                <label>
                  Membro desde
                </label>

                <div>
                  {formatDate(
                    profile.created_at
                  )}
                </div>

              </div>

              <div className="profile-info-field nickname-field">

                <label>
                  Nickname
                </label>

                <div className="nickname-input-wrapper">

                  <span>
                    @
                  </span>

                  <input
                    type="text"
                    maxLength={24}
                    value={
                      nickname
                    }
                    placeholder="seunickname"
                    onChange={(
                      event
                    ) => {
                      setNickname(
                        event.target.value
                      )

                      setMessage('')
                      setSuccessMessage('')
                    }}
                  />

                </div>

                <small>
                  Letras, números,
                  ponto e underline.
                  De 3 a 24 caracteres.
                </small>

              </div>

            </div>

            <button
              className="save-profile-button"
              onClick={
                saveNickname
              }
              disabled={
                saving
              }
            >

              {saving
                ? 'SALVANDO...'
                : 'SALVAR PERFIL'}

            </button>

          </section>

        )}

        {/* ===============================
            AMIGOS
        =============================== */}

        {activeTab ===
          'friends' && (

          <section className="profile-panel social-placeholder">

            <div className="social-placeholder-icon">
              👥
            </div>

            <h2>
              Amigos da Guilda
            </h2>

            <p>
              Aqui aparecerão os
              membros que você adicionar.
            </p>

            <div className="social-next-feature">
              PRÓXIMA ETAPA:
              buscar por nickname
              ou e-mail
            </div>

          </section>

        )}

        {/* ===============================
            SOLICITAÇÕES
        =============================== */}

        {activeTab ===
          'requests' && (

          <section className="profile-panel social-placeholder">

            <div className="social-placeholder-icon">
              ✉
            </div>

            <h2>
              Solicitações
            </h2>

            <p>
              Convites de amizade
              aparecerão aqui.
            </p>

            <div className="social-next-feature">
              PRÓXIMA ETAPA:
              aceitar ou recusar
              amizades
            </div>

          </section>

        )}

      </div>

    </main>
  )
}

export default Profile