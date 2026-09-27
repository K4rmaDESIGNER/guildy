import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mission = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  gold_reward: number
  platinum_reward: number
  status: string
  created_at: string
}

function Missions() {
  const navigate = useNavigate()

  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateMission, setShowCreateMission] =
    useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] =
    useState<Mission['priority']>('medium')

  const [goldReward, setGoldReward] = useState('')
  const [platinumReward, setPlatinumReward] = useState('')

  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadMissions()
  }, [])

  async function loadMissions() {
    setLoading(true)

    const { data, error } = await supabase
      .from('missions')
      .select(`
        id,
        title,
        description,
        priority,
        gold_reward,
        platinum_reward,
        status,
        created_at
      `)
      .eq('status', 'available')
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Erro ao carregar missões:',
        error
      )

      setMessage(
        'Não foi possível carregar as missões.'
      )

      setLoading(false)
      return
    }

    setMissions(data ?? [])
    setLoading(false)
  }

  async function createMission() {
    setMessage('')

    if (!title.trim()) {
      setMessage(
        'A missão precisa ter um nome.'
      )
      return
    }

    const gold =
      Number(goldReward.replace(',', '.')) || 0

    const platinum =
      Number(platinumReward.replace(',', '.')) || 0

    if (gold < 0 || platinum < 0) {
      setMessage(
        'As recompensas não podem ser negativas.'
      )
      return
    }

    if (gold === 0 && platinum === 0) {
      setMessage(
        'A missão precisa oferecer Gold, Platinum ou ambos.'
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

    setCreating(true)

    const { error } = await supabase
      .from('missions')
      .insert({
        title: title.trim(),
        description:
          description.trim() || null,

        priority,

        gold_reward: gold,
        platinum_reward: platinum,

        status: 'available',

        created_by: user.id,
      })

    if (error) {
      console.error(
        'Erro ao criar missão:',
        error
      )

      setMessage(
        'Não foi possível criar a missão.'
      )

      setCreating(false)
      return
    }

    setTitle('')
    setDescription('')
    setPriority('medium')
    setGoldReward('')
    setPlatinumReward('')

    setShowCreateMission(false)
    setCreating(false)

    await loadMissions()
  }

  function priorityLabel(
    missionPriority: Mission['priority']
  ) {
    switch (missionPriority) {
      case 'low':
        return 'BAIXA'

      case 'medium':
        return 'MÉDIA'

      case 'high':
        return 'ALTA'

      case 'critical':
        return 'CRÍTICA'

      default:
        return 'MÉDIA'
    }
  }

  function formatValue(value: number) {
    return Number(value).toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )
  }

  return (
    <main className="missions-page">

      <div className="missions-container">

        {/* CABEÇALHO */}

        <header className="missions-header">

          <div>

            <button
              className="mission-back-button"
              onClick={() =>
                navigate('/home')
              }
            >
              ← VOLTAR
            </button>

            <span className="missions-kicker">
              QUADRO DA GUILDA
            </span>

            <h1>
              ⚔ MISSÕES
            </h1>

            <p>
              Aceite desafios, cumpra tarefas
              e fortaleça a Guilda.
            </p>

          </div>

          <button
            className="create-mission-button"
            onClick={() => {
              setMessage('')
              setShowCreateMission(true)
            }}
          >
            + NOVA MISSÃO
          </button>

        </header>

        {/* CONTADOR */}

        <section className="mission-board-info">

          <div>
            <span>
              MISSÕES DISPONÍVEIS
            </span>

            <strong>
              {missions.length}
            </strong>
          </div>

          <div className="mission-board-status">
            <span className="status-light" />
            QUADRO ATIVO
          </div>

        </section>

        {/* MENSAGEM */}

        {message && !showCreateMission && (
          <div className="mission-message">
            {message}
          </div>
        )}

        {/* QUADRO */}

        {loading ? (

          <div className="mission-loading">
            Carregando missões...
          </div>

        ) : missions.length === 0 ? (

          <section className="empty-mission-board">

            <div className="empty-mission-icon">
              ⚔
            </div>

            <h2>
              Nenhuma missão disponível
            </h2>

            <p>
              A Guilda está tranquila...
              por enquanto.
            </p>

            <button
              onClick={() =>
                setShowCreateMission(true)
              }
            >
              CRIAR PRIMEIRA MISSÃO
            </button>

          </section>

        ) : (

          <section className="mission-grid">

            {missions.map((mission) => (

              <article
                key={mission.id}
                className={`
                  mission-card
                  priority-${mission.priority}
                `}
              >

                <div className="mission-card-top">

                  <div className="mission-symbol">
                    ⚔
                  </div>

                  <span
                    className={`
                      priority-badge
                      priority-badge-${mission.priority}
                    `}
                  >
                    {priorityLabel(
                      mission.priority
                    )}
                  </span>

                </div>

                <span className="mission-type">
                  MISSÃO DA GUILDA
                </span>

                <h2>
                  {mission.title}
                </h2>

                <p className="mission-description">

                  {mission.description ||
                    'Nenhuma descrição foi adicionada.'}

                </p>

                <div className="mission-rewards">

                  {Number(
                    mission.gold_reward
                  ) > 0 && (

                    <div className="reward reward-gold">

                      <span>
                        ◉
                      </span>

                      <div>
                        <small>
                          GOLD
                        </small>

                        <strong>
                          +
                          {formatValue(
                            mission.gold_reward
                          )}
                        </strong>
                      </div>

                    </div>

                  )}

                  {Number(
                    mission.platinum_reward
                  ) > 0 && (

                    <div className="reward reward-platinum">

                      <span>
                        ◆
                      </span>

                      <div>
                        <small>
                          PLATINUM
                        </small>

                        <strong>
                          +
                          {formatValue(
                            mission.platinum_reward
                          )}
                        </strong>
                      </div>

                    </div>

                  )}

                </div>

                <button
                  className="accept-mission-button"
                  disabled
                >
                  ACEITAR MISSÃO
                </button>

                <span className="coming-soon-label">
                  Em breve
                </span>

              </article>

            ))}

          </section>

        )}

      </div>

      {/* MODAL NOVA MISSÃO */}

      {showCreateMission && (

        <div
          className="mission-modal-overlay"
          onMouseDown={() =>
            setShowCreateMission(false)
          }
        >

          <section
            className="mission-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="mission-modal-header">

              <div>
                <span>
                  QUADRO DA GUILDA
                </span>

                <h2>
                  NOVA MISSÃO
                </h2>
              </div>

              <button
                onClick={() =>
                  setShowCreateMission(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="mission-form">

              <label>
                Nome da missão
              </label>

              <input
                type="text"
                maxLength={80}
                placeholder="Ex: Cadastrar novos produtos"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
              />

              <label>
                Descrição
              </label>

              <textarea
                rows={5}
                maxLength={500}
                placeholder="Explique o que precisa ser feito..."
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
              />

              <label>
                Prioridade
              </label>

              <div className="priority-selector">

                <button
                  className={
                    priority === 'low'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority('low')
                  }
                >
                  BAIXA
                </button>

                <button
                  className={
                    priority === 'medium'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority('medium')
                  }
                >
                  MÉDIA
                </button>

                <button
                  className={
                    priority === 'high'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority('high')
                  }
                >
                  ALTA
                </button>

                <button
                  className={
                    priority === 'critical'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority('critical')
                  }
                >
                  CRÍTICA
                </button>

              </div>

              <div className="reward-input-grid">

                <div>

                  <label>
                    🪙 Gold
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={goldReward}
                    onChange={(event) =>
                      setGoldReward(
                        event.target.value
                      )
                    }
                  />

                </div>

                <div>

                  <label>
                    💎 Platinum
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={platinumReward}
                    onChange={(event) =>
                      setPlatinumReward(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>

              {message && (
                <div className="mission-form-message">
                  {message}
                </div>
              )}

              <button
                className="confirm-create-mission"
                onClick={createMission}
                disabled={creating}
              >
                {creating
                  ? 'CRIANDO MISSÃO...'
                  : 'PUBLICAR MISSÃO'}
              </button>

            </div>

          </section>

        </div>

      )}

    </main>
  )
}

export default Missions