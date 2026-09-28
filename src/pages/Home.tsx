import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
}

function Home() {
  const navigate = useNavigate()

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [goldBalance, setGoldBalance] =
    useState(0)

  const [platinumBalance, setPlatinumBalance] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  /* =========================================================
     CARREGAMENTO
  ========================================================= */

  useEffect(() => {
    loadHome()
  }, [])

  async function loadHome() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    /*
      PERFIL
    */

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        nickname,
        avatar_url
      `)
      .eq(
        'id',
        user.id
      )
      .single()

    if (profileError) {
      console.error(
        'Erro ao carregar perfil:',
        profileError
      )
    } else {
      setProfile(
        profileData as Profile
      )
    }

    /*
      GOLD GLOBAL DA GUILDA
    */

    const {
      data: goldData,
      error: goldError,
    } = await supabase
      .from('gold_transactions')
      .select('amount')

    if (goldError) {
      console.error(
        'Erro ao carregar Gold:',
        goldError
      )
    } else {
      const totalGold =
        (goldData ?? []).reduce(
          (
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount
            ),
          0
        )

      setGoldBalance(
        totalGold
      )
    }

    /*
      PLATINUM DO USUÁRIO
    */

    const {
      data: platinumData,
      error: platinumError,
    } = await supabase
      .from(
        'platinum_transactions'
      )
      .select('amount')
      .eq(
        'user_id',
        user.id
      )

    if (platinumError) {
      console.error(
        'Erro ao carregar Platinum:',
        platinumError
      )
    } else {
      const totalPlatinum =
        (platinumData ?? []).reduce(
          (
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount
            ),
          0
        )

      setPlatinumBalance(
        totalPlatinum
      )
    }

    setLoading(false)
  }

  /* =========================================================
     SAIR
  ========================================================= */

  async function handleLogout() {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      console.error(
        'Erro ao sair:',
        error
      )

      return
    }

    navigate('/')
  }

  /* =========================================================
     FORMATAÇÃO
  ========================================================= */

  function formatValue(
    value: number
  ) {
    return Number(value)
      .toLocaleString(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )
  }

  /* =========================================================
     CARREGANDO
  ========================================================= */

  if (loading) {
    return (
      <div className="loading-screen">

        <div className="loading-rune">
          ✦
        </div>

        <span>
          Entrando na Guilda...
        </span>

      </div>
    )
  }

  /* =========================================================
     HOME
  ========================================================= */

  return (
    <main className="guild-page">

      {/* LUZES DE FUNDO */}

      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />

      <div className="guild-container">

        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <header className="guild-header">

          <div className="brand-area">

            <span className="brand-small">
              SISTEMA DA GUILDA
            </span>

            <h1>
              GUILDY
            </h1>

            <p>
              Organize. Complete. Evolua.
            </p>

          </div>

          <button
            className="rpg-small-button"
            onClick={
              handleLogout
            }
          >
            SAIR
          </button>

        </header>

        {/* =====================================================
            PERSONAGEM
        ===================================================== */}

        <section className="character-panel">

          <div className="character-avatar-area">

            <div className="character-avatar-ring">

              {profile?.avatar_url ? (

                <img
                  src={
                    profile.avatar_url
                  }
                  alt={
                    profile.name
                  }
                  className="character-avatar"
                />

              ) : (

                <div className="character-avatar-fallback">
                  👤
                </div>

              )}

            </div>

            <span className="online-indicator" />

          </div>

          <div className="character-info">

            <span className="character-label">
              MEMBRO DA GUILDA
            </span>

            <h2>
              {profile?.name ??
                'Aventureiro'}
            </h2>

            {profile?.nickname && (
              <strong
                style={{
                  color: '#73ddff',
                  fontSize: '13px',
                  marginBottom: '4px',
                }}
              >
                @{profile.nickname}
              </strong>
            )}

            <div className="rank-line">

              <span className="rank-icon">
                ✦
              </span>

              <span>
                Aventureiro
              </span>

            </div>

            <div className="character-status-bar">

              <div className="status-bar-background">

                <div className="status-bar-fill" />

              </div>

              <div className="status-bar-info">

                <span>
                  GUILDY
                </span>

                <span>
                  ATIVO
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            RECURSOS
        ===================================================== */}

        <section className="resource-section">

          {/* GOLD */}

          <article className="resource-card gold-card">

            <div className="resource-card-glow" />

            <div className="resource-icon gold-icon">
              ◉
            </div>

            <div className="resource-info">

              <span>
                GOLD DA GUILDA
              </span>

              <strong>
                {formatValue(
                  goldBalance
                )}
              </strong>

              <small>
                Tesouro coletivo
              </small>

            </div>

          </article>

          {/* PLATINUM */}

          <article className="resource-card platinum-card">

            <div className="resource-card-glow" />

            <div className="resource-icon platinum-icon">
              ◆
            </div>

            <div className="resource-info">

              <span>
                SEU PLATINUM
              </span>

              <strong>
                {formatValue(
                  platinumBalance
                )}
              </strong>

              <small>
                Recompensa pessoal
              </small>

            </div>

          </article>

        </section>

        {/* =====================================================
            MENU
        ===================================================== */}

        <section className="guild-menu">

          {/* MISSÕES */}

          <button
            className="rpg-menu-card"
            onClick={() =>
              navigate(
                '/missions'
              )
            }
          >

            <div className="rpg-menu-frame red-frame">

              <div className="rpg-menu-icon">
                ⚔
              </div>

              <div className="rpg-menu-content">

                <span>
                  QUADRO DA GUILDA
                </span>

                <strong>
                  MISSÕES
                </strong>

              </div>

              <div className="rpg-menu-arrow">
                ›
              </div>

            </div>

          </button>

          {/* IDEIAS */}

          <button
            className="rpg-menu-card"
            onClick={() =>
              navigate(
                '/ideas'
              )
            }
          >

            <div className="rpg-menu-frame purple-frame">

              <div className="rpg-menu-icon">
                ☁
              </div>

              <div className="rpg-menu-content">

                <span>
                  ARQUIVO MÁGICO
                </span>

                <strong>
                  IDEIAS
                </strong>

              </div>

              <div className="rpg-menu-arrow">
                ›
              </div>

            </div>

          </button>

          {/* CALCULADORA */}

          <button
            className="rpg-menu-card"
            onClick={() =>
              navigate(
                '/calculator'
              )
            }
          >

            <div className="rpg-menu-frame blue-frame">

              <div className="rpg-menu-icon">
                ✧
              </div>

              <div className="rpg-menu-content">

                <span>
                  ARTEFATO NUMÉRICO
                </span>

                <strong>
                  CALCULADORA
                </strong>

              </div>

              <div className="rpg-menu-arrow">
                ›
              </div>

            </div>

          </button>

          {/* PERFIL */}

          <button
            className="rpg-menu-card profile-menu-card"
            onClick={() =>
              navigate(
                '/profile'
              )
            }
          >

            <div className="rpg-menu-frame profile-frame">

              <div className="rpg-menu-icon">
                👤
              </div>

              <div className="rpg-menu-content">

                <span>
                  CONTA DA GUILDA
                </span>

                <strong>
                  PERFIL
                </strong>

              </div>

              <div className="rpg-menu-arrow">
                ›
              </div>

            </div>

          </button>

        </section>

        {/* =====================================================
            RODAPÉ
        ===================================================== */}

        <footer className="guild-footer">

          <span>
            ✦
          </span>

          GUILDY — SISTEMA DA GUILDA

          <span>
            ✦
          </span>

        </footer>

      </div>

    </main>
  )
}

export default Home