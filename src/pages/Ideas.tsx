import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type IdeaBoard = {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

function Ideas() {
  const navigate = useNavigate()

  const [boards, setBoards] =
    useState<IdeaBoard[]>([])

  const [loading, setLoading] =
    useState(true)

  const [showCreateBoard, setShowCreateBoard] =
    useState(false)

  const [boardName, setBoardName] =
    useState('')

  const [creating, setCreating] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [selectedBoard, setSelectedBoard] =
    useState<IdeaBoard | null>(null)

  useEffect(() => {
    loadBoards()
  }, [])

  async function loadBoards() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    const { data, error } = await supabase
      .from('idea_boards')
      .select(`
        id,
        user_id,
        name,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('updated_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Erro ao carregar universos:',
        error
      )

      setMessage(
        'Não foi possível carregar seus universos.'
      )

      setLoading(false)
      return
    }

    setBoards(
      (data as IdeaBoard[]) ?? []
    )

    setLoading(false)
  }

  async function createBoard() {
    setMessage('')
    setSuccessMessage('')

    if (!boardName.trim()) {
      setMessage(
        'Escolha um nome para o universo.'
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

    const { data, error } = await supabase
      .from('idea_boards')
      .insert({
        user_id: user.id,
        name: boardName.trim(),
      })
      .select(`
        id,
        user_id,
        name,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error(
        'Erro ao criar universo:',
        error
      )

      setMessage(
        'Não foi possível criar o universo.'
      )

      setCreating(false)
      return
    }

    setBoardName('')
    setShowCreateBoard(false)
    setCreating(false)

    setSuccessMessage(
      'Novo universo criado!'
    )

    await loadBoards()

    if (data) {
      setSelectedBoard(
        data as IdeaBoard
      )
    }
  }

  function formatDate(date: string) {
    return new Date(date)
      .toLocaleDateString(
        'pt-BR',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }
      )
  }

  /* =========================================
     UNIVERSO ABERTO
     Por enquanto é somente a estrutura.
     O mapa visual entra na próxima etapa.
  ========================================= */

  if (selectedBoard) {
    return (
      <main className="ideas-page">

        <div className="ideas-container">

          <header className="idea-world-header">

            <div>

              <button
                className="ideas-back-button"
                onClick={() =>
                  setSelectedBoard(null)
                }
              >
                ← MEUS UNIVERSOS
              </button>

              <span className="ideas-kicker">
                UNIVERSO DE PENSAMENTOS
              </span>

              <h1>
                {selectedBoard.name}
              </h1>

              <p>
                Este será o espaço onde
                suas ideias ganharão forma.
              </p>

            </div>

            <button
              className="create-thought-button"
              disabled
            >
              + NOVA IDEIA
            </button>

          </header>

          <section className="idea-world-placeholder">

            <div className="idea-orbit orbit-one" />
            <div className="idea-orbit orbit-two" />

            <div className="central-thought">

              <span>
                ☁
              </span>

              <strong>
                {selectedBoard.name}
              </strong>

              <small>
                Universo criado
              </small>

            </div>

            <div className="idea-placeholder-message">

              <span>
                ✦
              </span>

              <h2>
                Universo pronto
              </h2>

              <p>
                Na próxima etapa,
                colocaremos aqui as nuvens
                arrastáveis, zoom e conexões.
              </p>

            </div>

          </section>

        </div>

      </main>
    )
  }

  /* =========================================
     LISTA DE UNIVERSOS
  ========================================= */

  return (
    <main className="ideas-page">

      <div className="ideas-container">

        <header className="ideas-header">

          <div>

            <button
              className="ideas-back-button"
              onClick={() =>
                navigate('/home')
              }
            >
              ← VOLTAR
            </button>

            <span className="ideas-kicker">
              ARQUIVO MÁGICO
            </span>

            <h1>
              ☁ IDEIAS
            </h1>

            <p>
              Crie universos, conecte
              pensamentos e desenvolva
              suas ideias.
            </p>

          </div>

          <button
            className="create-universe-button"
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setShowCreateBoard(true)
            }}
          >
            + NOVO UNIVERSO
          </button>

        </header>

        <section className="idea-summary">

          <div>
            <span>
              SEUS UNIVERSOS
            </span>

            <strong>
              {boards.length}
            </strong>
          </div>

          <div className="idea-system-status">
            <span className="idea-status-light" />
            MEMÓRIA ATIVA
          </div>

        </section>

        {message && (
          <div className="idea-error-message">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="idea-success-message">
            ✓ {successMessage}
          </div>
        )}

        {loading ? (

          <div className="ideas-loading">
            Acessando memórias...
          </div>

        ) : boards.length === 0 ? (

          <section className="empty-ideas">

            <div className="empty-ideas-symbol">
              ☁
            </div>

            <h2>
              Sua mente ainda está vazia
            </h2>

            <p>
              Crie seu primeiro universo
              e comece a registrar ideias.
            </p>

            <button
              onClick={() =>
                setShowCreateBoard(true)
              }
            >
              CRIAR PRIMEIRO UNIVERSO
            </button>

          </section>

        ) : (

          <section className="universe-grid">

            {boards.map((board) => (

              <button
                key={board.id}
                className="universe-card"
                onClick={() =>
                  setSelectedBoard(board)
                }
              >

                <div className="universe-card-glow" />

                <div className="universe-icon">
                  ✦
                </div>

                <span className="universe-type">
                  UNIVERSO
                </span>

                <h2>
                  {board.name}
                </h2>

                <p>
                  Entre neste espaço
                  para explorar seus
                  pensamentos.
                </p>

                <div className="universe-footer">

                  <span>
                    Criado em
                    {' '}
                    {formatDate(
                      board.created_at
                    )}
                  </span>

                  <strong>
                    ENTRAR ›
                  </strong>

                </div>

              </button>

            ))}

          </section>

        )}

      </div>

      {/* =====================================
          MODAL CRIAR UNIVERSO
      ===================================== */}

      {showCreateBoard && (

        <div
          className="idea-modal-overlay"
          onMouseDown={() =>
            setShowCreateBoard(false)
          }
        >

          <section
            className="idea-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="idea-modal-header">

              <div>

                <span>
                  ARQUIVO MÁGICO
                </span>

                <h2>
                  NOVO UNIVERSO
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowCreateBoard(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="idea-form">

              <label>
                Nome do universo
              </label>

              <input
                type="text"
                maxLength={60}
                autoFocus
                placeholder="Ex: Marketing, Produtos, Projetos..."
                value={boardName}
                onChange={(event) =>
                  setBoardName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    createBoard()
                  }
                }}
              />

              <small>
                {boardName.length}/60
              </small>

              {message && (
                <div className="idea-form-message">
                  {message}
                </div>
              )}

              <button
                className="confirm-create-universe"
                onClick={createBoard}
                disabled={creating}
              >
                {creating
                  ? 'CRIANDO UNIVERSO...'
                  : 'CRIAR UNIVERSO'}
              </button>

            </div>

          </section>

        </div>

      )}

    </main>
  )
}

export default Ideas