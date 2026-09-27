import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Priority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

type MissionStatus =
  | 'available'
  | 'claimed'
  | 'completed'
  | 'cancelled'

type Mission = {
  id: string
  title: string
  description: string | null
  priority: Priority
  gold_reward: number
  platinum_reward: number
  status: MissionStatus
  created_by: string
  claimed_by: string | null
  created_at: string
  claimed_at: string | null
  completed_at: string | null
}

type Tab =
  | 'board'
  | 'mine'
  | 'completed'

function Missions() {
  const navigate = useNavigate()

  /* =========================
     DADOS
  ========================= */

  const [missions, setMissions] =
    useState<Mission[]>([])

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [activeTab, setActiveTab] =
    useState<Tab>('board')

  /* =========================
     NOVA MISSÃO
  ========================= */

  const [showCreateMission, setShowCreateMission] =
    useState(false)

  const [title, setTitle] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [priority, setPriority] =
    useState<Priority>('medium')

  const [goldReward, setGoldReward] =
    useState('')

  const [platinumReward, setPlatinumReward] =
    useState('')

  const [creating, setCreating] =
    useState(false)

  /* =========================
     AÇÕES
  ========================= */

  const [acceptingMissionId, setAcceptingMissionId] =
    useState<string | null>(null)

  const [completingMissionId, setCompletingMissionId] =
    useState<string | null>(null)

  const [deletingMissionId, setDeletingMissionId] =
    useState<string | null>(null)

  /* =========================
     MENSAGENS
  ========================= */

  const [message, setMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  /* =========================
     CARREGAMENTO
  ========================= */

  useEffect(() => {
    loadMissions()
  }, [])

  async function loadMissions() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    setCurrentUserId(user.id)

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
        created_by,
        claimed_by,
        created_at,
        claimed_at,
        completed_at
      `)
      .neq('status', 'cancelled')
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

    setMissions(
      (data as Mission[]) ?? []
    )

    setLoading(false)
  }

  /* =========================
     FILTROS
  ========================= */

  const boardMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) =>
            mission.status === 'available'
        ),
      [missions]
    )

  const myMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) =>
            mission.status === 'claimed' &&
            mission.claimed_by === currentUserId
        ),
      [missions, currentUserId]
    )

  const completedMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) =>
            mission.status === 'completed' &&
            mission.claimed_by === currentUserId
        ),
      [missions, currentUserId]
    )

  /* =========================
     CRIAR MISSÃO
  ========================= */

  async function createMission() {
    setMessage('')
    setSuccessMessage('')

    if (!title.trim()) {
      setMessage(
        'A missão precisa ter um nome.'
      )
      return
    }

    const gold =
      Number(
        goldReward.replace(',', '.')
      ) || 0

    const platinum =
      Number(
        platinumReward.replace(',', '.')
      ) || 0

    if (gold < 0 || platinum < 0) {
      setMessage(
        'As recompensas não podem ser negativas.'
      )
      return
    }

    if (
      gold === 0 &&
      platinum === 0
    ) {
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
        title:
          title.trim(),

        description:
          description.trim() || null,

        priority,

        gold_reward:
          gold,

        platinum_reward:
          platinum,

        status:
          'available',

        created_by:
          user.id,
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

    setSuccessMessage(
      'Missão publicada no Quadro da Guilda.'
    )

    setActiveTab('board')

    await loadMissions()
  }

  /* =========================
     ACEITAR MISSÃO
  ========================= */

  async function acceptMission(
    missionId: string
  ) {
    setMessage('')
    setSuccessMessage('')

    setAcceptingMissionId(
      missionId
    )

    const { error } =
      await supabase.rpc(
        'claim_mission',
        {
          p_mission_id:
            missionId,
        }
      )

    if (error) {
      console.error(
        'Erro ao aceitar missão:',
        error
      )

      setMessage(
        'Não foi possível aceitar a missão.'
      )

      setAcceptingMissionId(null)

      await loadMissions()
      return
    }

    setAcceptingMissionId(null)

    await loadMissions()

    setActiveTab('mine')

    setSuccessMessage(
      'Missão adicionada ao seu quadro pessoal!'
    )
  }

  /* =========================
     CONCLUIR MISSÃO
  ========================= */

  async function completeMission(
    missionId: string
  ) {
    setMessage('')
    setSuccessMessage('')

    setCompletingMissionId(
      missionId
    )

    const { error } =
      await supabase.rpc(
        'complete_mission',
        {
          p_mission_id:
            missionId,
        }
      )

    if (error) {
      console.error(
        'Erro ao concluir missão:',
        error
      )

      setMessage(
        'Não foi possível concluir a missão.'
      )

      setCompletingMissionId(null)
      return
    }

    setCompletingMissionId(null)

    await loadMissions()

    setActiveTab('completed')

    setSuccessMessage(
      'Missão concluída! Gold e Platinum foram creditados.'
    )
  }

  /* =========================
     APAGAR MISSÃO
  ========================= */

  async function deleteMission(
    mission: Mission
  ) {
    let warning =
      `Tem certeza que deseja apagar a missão "${mission.title}"?`

    if (
      mission.status === 'claimed'
    ) {
      warning +=
        '\n\nEsta missão já foi aceita. Ela será removida do quadro pessoal do membro.'
    }

    if (
      mission.status === 'completed'
    ) {
      warning +=
        '\n\nATENÇÃO: esta missão já foi concluída. O Gold e o Platinum recebidos por ela também serão removidos.'
    }

    const confirmed =
      window.confirm(
        warning
      )

    if (!confirmed) {
      return
    }

    setMessage('')
    setSuccessMessage('')

    setDeletingMissionId(
      mission.id
    )

    const { error } =
      await supabase.rpc(
        'delete_mission',
        {
          p_mission_id:
            mission.id,
        }
      )

    if (error) {
      console.error(
        'Erro ao apagar missão:',
        error
      )

      if (
        error.message
          .toLowerCase()
          .includes(
            'somente o criador'
          )
      ) {
        setMessage(
          'Somente quem criou esta missão pode apagá-la.'
        )
      } else {
        setMessage(
          'Não foi possível apagar a missão.'
        )
      }

      setDeletingMissionId(null)
      return
    }

    setMissions(
      (currentMissions) =>
        currentMissions.filter(
          (item) =>
            item.id !== mission.id
        )
    )

    setDeletingMissionId(null)

    setSuccessMessage(
      `Missão "${mission.title}" apagada.`
    )
  }

  /* =========================
     UTILITÁRIOS
  ========================= */

  function priorityLabel(
    missionPriority: Priority
  ) {
    switch (
      missionPriority
    ) {
      case 'low':
        return 'BAIXA'

      case 'medium':
        return 'MÉDIA'

      case 'high':
        return 'ALTA'

      case 'critical':
        return 'CRÍTICA'
    }
  }

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

  /* =========================
     CARD DE MISSÃO
  ========================= */

  function renderMissionCard(
    mission: Mission,
    mode:
      | 'board'
      | 'mine'
      | 'completed'
  ) {
    const canDelete =
      mission.created_by ===
      currentUserId

    return (
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

          <div className="mission-card-top-actions">

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

            {canDelete && (

              <button
                className="delete-mission-card-button"
                title="Apagar missão"
                onClick={() =>
                  deleteMission(
                    mission
                  )
                }
                disabled={
                  deletingMissionId ===
                  mission.id
                }
              >
                {deletingMissionId ===
                mission.id
                  ? '...'
                  : '🗑'}
              </button>

            )}

          </div>

        </div>

        <span className="mission-type">

          {mode === 'board' &&
            'MISSÃO DA GUILDA'}

          {mode === 'mine' &&
            'MISSÃO EM ANDAMENTO'}

          {mode === 'completed' &&
            'MISSÃO CONCLUÍDA'}

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

        {/* ACEITAR */}

        {mode === 'board' && (

          <button
            className="
              accept-mission-button
              accept-mission-active
            "
            onClick={() =>
              acceptMission(
                mission.id
              )
            }
            disabled={
              acceptingMissionId ===
                mission.id ||
              deletingMissionId ===
                mission.id
            }
          >

            {acceptingMissionId ===
            mission.id
              ? 'ACEITANDO...'
              : 'ACEITAR MISSÃO'}

          </button>

        )}

        {/* CONCLUIR */}

        {mode === 'mine' && (

          <>
            <button
              className="
                complete-mission-button
                complete-mission-active
              "
              onClick={() =>
                completeMission(
                  mission.id
                )
              }
              disabled={
                completingMissionId ===
                  mission.id ||
                deletingMissionId ===
                  mission.id
              }
            >

              {completingMissionId ===
              mission.id
                ? 'CONCLUINDO...'
                : '✓ CONCLUIR MISSÃO'}

            </button>

            <span className="mission-next-step">
              Ao concluir, Gold e
              Platinum serão creditados
              automaticamente.
            </span>
          </>

        )}

        {/* CONCLUÍDA */}

        {mode === 'completed' && (

          <>

            <div className="completed-mission-seal">
              ✓ MISSÃO CONCLUÍDA
            </div>

            <span className="completed-reward-text">
              Recompensas creditadas
            </span>

          </>

        )}

      </article>
    )
  }

  /* =========================
     ESTADO VAZIO
  ========================= */

  function renderEmptyState() {
    if (
      activeTab === 'board'
    ) {
      return (
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
              setShowCreateMission(
                true
              )
            }
          >
            CRIAR MISSÃO
          </button>

        </section>
      )
    }

    if (
      activeTab === 'mine'
    ) {
      return (
        <section className="empty-mission-board">

          <div className="empty-mission-icon">
            🛡
          </div>

          <h2>
            Nenhuma missão ativa
          </h2>

          <p>
            Vá até o Quadro da Guilda
            e aceite um desafio.
          </p>

          <button
            onClick={() =>
              setActiveTab(
                'board'
              )
            }
          >
            VER QUADRO
          </button>

        </section>
      )
    }

    return (
      <section className="empty-mission-board">

        <div className="empty-mission-icon">
          ★
        </div>

        <h2>
          Nenhuma missão concluída
        </h2>

        <p>
          Suas conquistas aparecerão
          aqui.
        </p>

      </section>
    )
  }

  /* =========================
     MISSÕES VISÍVEIS
  ========================= */

  const visibleMissions =
    activeTab === 'board'
      ? boardMissions
      : activeTab === 'mine'
        ? myMissions
        : completedMissions

  /* =========================
     INTERFACE
  ========================= */

  return (
    <main className="missions-page">

      <div className="missions-container">

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
              Aceite desafios,
              cumpra tarefas e
              fortaleça a Guilda.
            </p>

          </div>

          <button
            className="create-mission-button"
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setShowCreateMission(
                true
              )
            }}
          >
            + NOVA MISSÃO
          </button>

        </header>

        {/* ABAS */}

        <nav className="mission-tabs">

          <button
            className={
              activeTab === 'board'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab('board')
            }}
          >

            <span>
              ⚔
            </span>

            <div>

              <strong>
                QUADRO DA GUILDA
              </strong>

              <small>
                {
                  boardMissions.length
                }{' '}
                disponíveis
              </small>

            </div>

          </button>

          <button
            className={
              activeTab === 'mine'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab('mine')
            }}
          >

            <span>
              🛡
            </span>

            <div>

              <strong>
                MINHAS MISSÕES
              </strong>

              <small>
                {
                  myMissions.length
                }{' '}
                em andamento
              </small>

            </div>

          </button>

          <button
            className={
              activeTab ===
              'completed'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab(
                'completed'
              )
            }}
          >

            <span>
              ★
            </span>

            <div>

              <strong>
                CONCLUÍDAS
              </strong>

              <small>
                {
                  completedMissions.length
                }{' '}
                finalizadas
              </small>

            </div>

          </button>

        </nav>

        {/* STATUS */}

        <section className="mission-board-info">

          <div>

            <span>
              {activeTab === 'board'
                ? 'MISSÕES DISPONÍVEIS'
                : activeTab === 'mine'
                  ? 'MISSÕES ATIVAS'
                  : 'MISSÕES CONCLUÍDAS'}
            </span>

            <strong>
              {
                visibleMissions.length
              }
            </strong>

          </div>

          <div className="mission-board-status">

            <span className="status-light" />

            QUADRO ATIVO

          </div>

        </section>

        {message && (
          <div className="mission-message">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="mission-success-message">
            ✓ {successMessage}
          </div>
        )}

        {loading ? (

          <div className="mission-loading">
            Carregando missões...
          </div>

        ) : visibleMissions.length === 0 ? (

          renderEmptyState()

        ) : (

          <section className="mission-grid">

            {visibleMissions.map(
              (mission) =>
                renderMissionCard(
                  mission,
                  activeTab
                )
            )}

          </section>

        )}

      </div>

      {/* =========================
          MODAL NOVA MISSÃO
      ========================= */}

      {showCreateMission && (

        <div
          className="mission-modal-overlay"
          onMouseDown={() =>
            setShowCreateMission(
              false
            )
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
                  setShowCreateMission(
                    false
                  )
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
                  type="button"
                  className={
                    priority === 'low'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority(
                      'low'
                    )
                  }
                >
                  BAIXA
                </button>

                <button
                  type="button"
                  className={
                    priority === 'medium'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority(
                      'medium'
                    )
                  }
                >
                  MÉDIA
                </button>

                <button
                  type="button"
                  className={
                    priority === 'high'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority(
                      'high'
                    )
                  }
                >
                  ALTA
                </button>

                <button
                  type="button"
                  className={
                    priority === 'critical'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setPriority(
                      'critical'
                    )
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
                    value={
                      platinumReward
                    }
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
                onClick={
                  createMission
                }
                disabled={
                  creating
                }
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