import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  name: string
  avatar_url: string | null
}

function Home() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [gold, setGold] = useState(0)
  const [platinum, setPlatinum] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarHome()
  }, [])

  async function carregarHome() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single()

    if (profileError) {
      console.error('Erro ao carregar perfil:', profileError)
    }

    if (profileData) {
      setProfile(profileData)
    }

    const { data: goldData, error: goldError } =
      await supabase
        .from('gold_transactions')
        .select('amount')

    if (goldError) {
      console.error('Erro ao carregar Gold:', goldError)
    }

    const totalGold =
      goldData?.reduce(
        (total, item) => total + Number(item.amount),
        0
      ) ?? 0

    setGold(totalGold)

    const {
      data: platinumData,
      error: platinumError,
    } = await supabase
      .from('platinum_transactions')
      .select('amount')
      .eq('user_id', user.id)

    if (platinumError) {
      console.error(
        'Erro ao carregar Platinum:',
        platinumError
      )
    }

    const totalPlatinum =
      platinumData?.reduce(
        (total, item) => total + Number(item.amount),
        0
      ) ?? 0

    setPlatinum(totalPlatinum)

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-rune">✦</div>
        <p>Entrando na Guilda...</p>
      </div>
    )
  }

  return (
    <main className="guild-page">

      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />

      <div className="guild-container">

        {/* CABEÇALHO */}

        <header className="guild-header">

          <div className="brand-area">
            <span className="brand-small">
              SISTEMA DA GUILDA
            </span>

            <h1>GUILDY</h1>

            <p>
              Organize. Complete. Evolua.
            </p>
          </div>

          <button
            className="rpg-small-button logout-rpg"
            onClick={logout}
          >
            SAIR
          </button>

        </header>

        {/* PERFIL */}

        <section className="character-panel">

          <div className="character-avatar-frame">

            <div className="avatar-ring">

              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="character-avatar"
                />
              ) : (
                <div className="character-avatar avatar-fallback">
                  {profile?.name
                    ?.charAt(0)
                    .toUpperCase() ?? '?'}
                </div>
              )}

            </div>

            <div className="online-indicator" />

          </div>

          <div className="character-info">

            <span className="character-label">
              MEMBRO DA GUILDA
            </span>

            <h2>
              {profile?.name ?? 'Aventureiro'}
            </h2>

            <div className="rank-line">

              <span className="rank-badge">
                ✦
              </span>

              <span>
                Aventureiro
              </span>

            </div>

            <div className="xp-area">

              <div className="xp-top">
                <span>STATUS</span>
                <span>ONLINE</span>
              </div>

              <div className="xp-bar">
                <div className="xp-fill" />
              </div>

            </div>

          </div>

        </section>

        {/* MOEDAS */}

        <section className="resource-section">

          <div className="resource-card gold-card">

            <div className="resource-icon gold-icon">
              ◉
            </div>

            <div className="resource-content">

              <span className="resource-label">
                GOLD DA GUILDA
              </span>

              <strong>
                {formatarValor(gold)}
              </strong>

              <span className="resource-description">
                Tesouro coletivo
              </span>

            </div>

            <div className="resource-glow gold-glow" />

          </div>

          <div className="resource-card platinum-card">

            <div className="resource-icon platinum-icon">
              ◆
            </div>

            <div className="resource-content">

              <span className="resource-label">
                SEU PLATINUM
              </span>

              <strong>
                {formatarValor(platinum)}
              </strong>

              <span className="resource-description">
                Recompensa pessoal
              </span>

            </div>

            <div className="resource-glow platinum-glow" />

          </div>

        </section>

        {/* MENU */}

        <section className="guild-menu">

          <button
            className="rpg-menu-card missions-card"
            onClick={() => navigate('/missions')}
          >

            <div className="menu-card-shine" />

            <div className="rpg-icon-frame red-frame">
              <span className="rpg-menu-icon">
                ⚔
              </span>
            </div>

            <div className="menu-card-content">

              <span className="menu-category">
                QUADRO DA GUILDA
              </span>

              <h2>
                MISSÕES
              </h2>

              <p>
                Encontre tarefas, aceite desafios
                e conquiste recompensas.
              </p>

            </div>

            <span className="menu-arrow">
              ›
            </span>

          </button>

          <button
            className="rpg-menu-card ideas-card"
            onClick={() => navigate('/ideas')}
          >

            <div className="menu-card-shine" />

            <div className="rpg-icon-frame purple-frame">
              <span className="rpg-menu-icon">
                ☁
              </span>
            </div>

            <div className="menu-card-content">

              <span className="menu-category">
                ARQUIVO MÁGICO
              </span>

              <h2>
                IDEIAS
              </h2>

              <p>
                Conecte pensamentos e construa
                seu universo de ideias.
              </p>

            </div>

            <span className="menu-arrow">
              ›
            </span>

          </button>

          <button
            className="rpg-menu-card calculator-card"
            onClick={() => navigate('/calculator')}
          >

            <div className="menu-card-shine" />

            <div className="rpg-icon-frame blue-frame">
              <span className="rpg-menu-icon">
                ✧
              </span>
            </div>

            <div className="menu-card-content">

              <span className="menu-category">
                ARTEFATO NUMÉRICO
              </span>

              <h2>
                CALCULADORA
              </h2>

              <p>
                Use o modo Humano ou convoque
                a Calculadora Mágica.
              </p>

            </div>

            <span className="menu-arrow">
              ›
            </span>

          </button>

        </section>

        <footer className="guild-footer">
          <span>✦</span>
          <p>GUILDY — SISTEMA DA GUILDA</p>
          <span>✦</span>
        </footer>

      </div>

    </main>
  )
}

export default Home