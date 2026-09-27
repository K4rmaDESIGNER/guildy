import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import { supabase } from '../lib/supabase'

/* =========================================================
   TIPOS
========================================================= */

type IdeaBoard = {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

type IdeaNodeDatabase = {
  id: string
  board_id: string
  title: string
  content: string | null
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

type IdeaEdgeDatabase = {
  id: string
  board_id: string
  source_node_id: string
  target_node_id: string
  created_at: string
}

type ThoughtNodeData = {
  title: string
  content: string | null
}

/* =========================================================
   NUVEM PERSONALIZADA
========================================================= */

function ThoughtNode({
  data,
}: NodeProps<Node<ThoughtNodeData>>) {
  return (
    <div className="thought-node">

      <Handle
        type="target"
        position={Position.Top}
        className="thought-handle"
      />

      <div className="thought-node-symbol">
        ☁
      </div>

      <strong>
        {data.title}
      </strong>

      {data.content && (
        <p>
          {data.content}
        </p>
      )}

      <span className="thought-node-footer">
        PENSAMENTO
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="thought-handle"
      />

    </div>
  )
}

const nodeTypes = {
  thought: ThoughtNode,
}

/* =========================================================
   COMPONENTE
========================================================= */

function Ideas() {
  const navigate = useNavigate()

  /* =======================================================
     UNIVERSOS
  ======================================================= */

  const [boards, setBoards] =
    useState<IdeaBoard[]>([])

  const [selectedBoard, setSelectedBoard] =
    useState<IdeaBoard | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [deletingBoardId, setDeletingBoardId] =
    useState<string | null>(null)

  /* =======================================================
     CRIAR UNIVERSO
  ======================================================= */

  const [showCreateBoard, setShowCreateBoard] =
    useState(false)

  const [boardName, setBoardName] =
    useState('')

  const [creatingBoard, setCreatingBoard] =
    useState(false)

  /* =======================================================
     MAPA
  ======================================================= */

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<ThoughtNodeData>>([])

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>([])

  const [loadingWorld, setLoadingWorld] =
    useState(false)

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null)

  const [deletingNodeId, setDeletingNodeId] =
    useState<string | null>(null)

  /* =======================================================
     NOVA IDEIA
  ======================================================= */

  const [showCreateThought, setShowCreateThought] =
    useState(false)

  const [thoughtTitle, setThoughtTitle] =
    useState('')

  const [thoughtContent, setThoughtContent] =
    useState('')

  const [creatingThought, setCreatingThought] =
    useState(false)

  /* =======================================================
     MENSAGENS
  ======================================================= */

  const [message, setMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  /* =======================================================
     INÍCIO
  ======================================================= */

  useEffect(() => {
    loadBoards()
  }, [])

  /* =======================================================
     CARREGAR UNIVERSOS
  ======================================================= */

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

  /* =======================================================
     CRIAR UNIVERSO
  ======================================================= */

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

    setCreatingBoard(true)

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

      setCreatingBoard(false)
      return
    }

    setBoardName('')
    setShowCreateBoard(false)
    setCreatingBoard(false)

    setNodes([])
    setEdges([])
    setSelectedNodeId(null)

    await loadBoards()

    setSelectedBoard(
      data as IdeaBoard
    )

    setSuccessMessage(
      'Universo criado!'
    )
  }

  /* =======================================================
     APAGAR UNIVERSO
  ======================================================= */

  async function deleteBoard(
    board: IdeaBoard
  ) {
    const confirmed =
      window.confirm(
        `Tem certeza que deseja apagar o universo "${board.name}"?\n\nTodas as ideias e conexões dentro dele também serão apagadas.`
      )

    if (!confirmed) {
      return
    }

    setMessage('')
    setSuccessMessage('')
    setDeletingBoardId(board.id)

    /*
      Primeiro apagamos todas as conexões.
    */

    const {
      error: edgesError,
    } = await supabase
      .from('idea_edges')
      .delete()
      .eq(
        'board_id',
        board.id
      )

    if (edgesError) {
      console.error(
        'Erro ao apagar conexões:',
        edgesError
      )

      setMessage(
        'Não foi possível apagar as conexões deste universo.'
      )

      setDeletingBoardId(null)
      return
    }

    /*
      Depois apagamos todas as ideias.
    */

    const {
      error: nodesError,
    } = await supabase
      .from('idea_nodes')
      .delete()
      .eq(
        'board_id',
        board.id
      )

    if (nodesError) {
      console.error(
        'Erro ao apagar ideias:',
        nodesError
      )

      setMessage(
        'Não foi possível apagar as ideias deste universo.'
      )

      setDeletingBoardId(null)
      return
    }

    /*
      Por último apagamos o universo.
    */

    const {
      error: boardError,
    } = await supabase
      .from('idea_boards')
      .delete()
      .eq(
        'id',
        board.id
      )

    if (boardError) {
      console.error(
        'Erro ao apagar universo:',
        boardError
      )

      setMessage(
        'Não foi possível apagar o universo.'
      )

      setDeletingBoardId(null)
      return
    }

    setBoards(
      (currentBoards) =>
        currentBoards.filter(
          (item) =>
            item.id !== board.id
        )
    )

    if (
      selectedBoard?.id ===
      board.id
    ) {
      setSelectedBoard(null)
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
    }

    setDeletingBoardId(null)

    setSuccessMessage(
      `Universo "${board.name}" apagado.`
    )
  }

  /* =======================================================
     ABRIR UNIVERSO
  ======================================================= */

  async function openBoard(
    board: IdeaBoard
  ) {
    setSelectedBoard(board)

    setSelectedNodeId(null)
    setMessage('')
    setSuccessMessage('')

    await loadWorld(
      board.id
    )
  }

  /* =======================================================
     CARREGAR MAPA
  ======================================================= */

  async function loadWorld(
    boardId: string
  ) {
    setLoadingWorld(true)

    const [
      nodeResult,
      edgeResult,
    ] = await Promise.all([
      supabase
        .from('idea_nodes')
        .select(`
          id,
          board_id,
          title,
          content,
          position_x,
          position_y,
          created_at,
          updated_at
        `)
        .eq(
          'board_id',
          boardId
        ),

      supabase
        .from('idea_edges')
        .select(`
          id,
          board_id,
          source_node_id,
          target_node_id,
          created_at
        `)
        .eq(
          'board_id',
          boardId
        ),
    ])

    if (nodeResult.error) {
      console.error(
        'Erro ao carregar ideias:',
        nodeResult.error
      )

      setMessage(
        'Não foi possível carregar as ideias.'
      )

      setLoadingWorld(false)
      return
    }

    if (edgeResult.error) {
      console.error(
        'Erro ao carregar conexões:',
        edgeResult.error
      )

      setMessage(
        'Não foi possível carregar as conexões.'
      )

      setLoadingWorld(false)
      return
    }

    const databaseNodes =
      (nodeResult.data ??
        []) as IdeaNodeDatabase[]

    const databaseEdges =
      (edgeResult.data ??
        []) as IdeaEdgeDatabase[]

    const flowNodes:
      Node<ThoughtNodeData>[] =
      databaseNodes.map(
        (item) => ({
          id: item.id,

          type: 'thought',

          position: {
            x:
              Number(
                item.position_x
              ) || 0,

            y:
              Number(
                item.position_y
              ) || 0,
          },

          data: {
            title:
              item.title,

            content:
              item.content,
          },
        })
      )

    const flowEdges:
      Edge[] =
      databaseEdges.map(
        (item) => ({
          id:
            item.id,

          source:
            item.source_node_id,

          target:
            item.target_node_id,

          type:
            'smoothstep',

          animated:
            true,
        })
      )

    setNodes(flowNodes)
    setEdges(flowEdges)

    setLoadingWorld(false)
  }

  /* =======================================================
     CRIAR IDEIA
  ======================================================= */

  async function createThought() {
    if (!selectedBoard) {
      return
    }

    setMessage('')
    setSuccessMessage('')

    if (!thoughtTitle.trim()) {
      setMessage(
        'Dê um título para a ideia.'
      )
      return
    }

    setCreatingThought(true)

    const ideaNumber =
      nodes.length

    const x =
      (ideaNumber % 4) *
        260 -
      300

    const y =
      Math.floor(
        ideaNumber / 4
      ) *
        190 -
      150

    const { data, error } =
      await supabase
        .from('idea_nodes')
        .insert({
          board_id:
            selectedBoard.id,

          title:
            thoughtTitle.trim(),

          content:
            thoughtContent.trim() ||
            null,

          position_x:
            x,

          position_y:
            y,
        })
        .select(`
          id,
          board_id,
          title,
          content,
          position_x,
          position_y,
          created_at,
          updated_at
        `)
        .single()

    if (error) {
      console.error(
        'Erro ao criar ideia:',
        error
      )

      setMessage(
        'Não foi possível criar a ideia.'
      )

      setCreatingThought(false)
      return
    }

    const newIdea =
      data as IdeaNodeDatabase

    const newNode:
      Node<ThoughtNodeData> = {
      id:
        newIdea.id,

      type:
        'thought',

      position: {
        x:
          Number(
            newIdea.position_x
          ),

        y:
          Number(
            newIdea.position_y
          ),
      },

      data: {
        title:
          newIdea.title,

        content:
          newIdea.content,
      },
    }

    setNodes(
      (currentNodes) => [
        ...currentNodes,
        newNode,
      ]
    )

    setThoughtTitle('')
    setThoughtContent('')

    setShowCreateThought(false)
    setCreatingThought(false)

    setSuccessMessage(
      'Nova ideia criada!'
    )
  }

  /* =======================================================
     APAGAR IDEIA
  ======================================================= */

  async function deleteThought(
    nodeId: string
  ) {
    const node =
      nodes.find(
        (item) =>
          item.id === nodeId
      )

    const title =
      node?.data.title ??
      'esta ideia'

    const confirmed =
      window.confirm(
        `Apagar "${title}"?\n\nAs conexões ligadas a esta ideia também serão apagadas.`
      )

    if (!confirmed) {
      return
    }

    setMessage('')
    setSuccessMessage('')
    setDeletingNodeId(nodeId)

    /*
      Primeiro apagamos as linhas
      que entram ou saem desta ideia.
    */

    const {
      error: edgesError,
    } = await supabase
      .from('idea_edges')
      .delete()
      .or(
        `source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`
      )

    if (edgesError) {
      console.error(
        'Erro ao apagar conexões:',
        edgesError
      )

      setMessage(
        'Não foi possível apagar as conexões desta ideia.'
      )

      setDeletingNodeId(null)
      return
    }

    /*
      Agora apagamos a própria ideia.
    */

    const {
      error: nodeError,
    } = await supabase
      .from('idea_nodes')
      .delete()
      .eq(
        'id',
        nodeId
      )

    if (nodeError) {
      console.error(
        'Erro ao apagar ideia:',
        nodeError
      )

      setMessage(
        'Não foi possível apagar a ideia.'
      )

      setDeletingNodeId(null)
      return
    }

    setNodes(
      (currentNodes) =>
        currentNodes.filter(
          (item) =>
            item.id !== nodeId
        )
    )

    setEdges(
      (currentEdges) =>
        currentEdges.filter(
          (edge) =>
            edge.source !== nodeId &&
            edge.target !== nodeId
        )
    )

    setSelectedNodeId(null)
    setDeletingNodeId(null)

    setSuccessMessage(
      `"${title}" foi apagada.`
    )
  }

  /* =======================================================
     SALVAR POSIÇÃO
  ======================================================= */

  async function saveNodePosition(
    node: Node
  ) {
    const { error } =
      await supabase
        .from('idea_nodes')
        .update({
          position_x:
            node.position.x,

          position_y:
            node.position.y,
        })
        .eq(
          'id',
          node.id
        )

    if (error) {
      console.error(
        'Erro ao salvar posição:',
        error
      )
    }
  }

  /* =======================================================
     CRIAR CONEXÃO
  ======================================================= */

  const onConnect =
    useCallback(
      async (
        connection:
          Connection
      ) => {
        if (
          !selectedBoard ||
          !connection.source ||
          !connection.target
        ) {
          return
        }

        if (
          connection.source ===
          connection.target
        ) {
          return
        }

        const alreadyExists =
          edges.some(
            (edge) =>
              edge.source ===
                connection.source &&
              edge.target ===
                connection.target
          )

        if (alreadyExists) {
          return
        }

        const {
          data,
          error,
        } = await supabase
          .from('idea_edges')
          .insert({
            board_id:
              selectedBoard.id,

            source_node_id:
              connection.source,

            target_node_id:
              connection.target,
          })
          .select(`
            id,
            board_id,
            source_node_id,
            target_node_id,
            created_at
          `)
          .single()

        if (error) {
          console.error(
            'Erro ao criar conexão:',
            error
          )

          setMessage(
            'Não foi possível conectar as ideias.'
          )

          return
        }

        const newEdgeData =
          data as IdeaEdgeDatabase

        const newEdge: Edge = {
          id:
            newEdgeData.id,

          source:
            newEdgeData.source_node_id,

          target:
            newEdgeData.target_node_id,

          type:
            'smoothstep',

          animated:
            true,
        }

        setEdges(
          (currentEdges) =>
            addEdge(
              newEdge,
              currentEdges
            )
        )
      },
      [
        selectedBoard,
        edges,
        setEdges,
      ]
    )

  /* =======================================================
     DATA
  ======================================================= */

  function formatDate(
    date: string
  ) {
    return new Date(date)
      .toLocaleDateString(
        'pt-BR',
        {
          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric',
        }
      )
  }

  /* =======================================================
     NÚMERO DE IDEIAS
  ======================================================= */

  const thoughtCount =
    useMemo(
      () => nodes.length,
      [nodes]
    )

  /* =======================================================
     UNIVERSO ABERTO
  ======================================================= */

  if (selectedBoard) {
    return (
      <main className="ideas-page">

        <div className="ideas-container idea-world-container">

          <header className="idea-world-header">

            <div>

              <button
                className="ideas-back-button"
                onClick={() => {
                  setSelectedBoard(null)
                  setNodes([])
                  setEdges([])
                  setSelectedNodeId(null)
                  setMessage('')
                  setSuccessMessage('')
                }}
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
                {thoughtCount}{' '}
                {thoughtCount === 1
                  ? 'pensamento registrado'
                  : 'pensamentos registrados'}
              </p>

            </div>

            <div className="idea-world-actions">

              {selectedNodeId && (

                <button
                  className="delete-thought-button"
                  onClick={() =>
                    deleteThought(
                      selectedNodeId
                    )
                  }
                  disabled={
                    deletingNodeId ===
                    selectedNodeId
                  }
                >
                  {deletingNodeId ===
                  selectedNodeId
                    ? 'APAGANDO...'
                    : '🗑 APAGAR IDEIA'}
                </button>

              )}

              <button
                className="create-thought-button active"
                onClick={() => {
                  setMessage('')
                  setSuccessMessage('')
                  setShowCreateThought(true)
                }}
              >
                + NOVA IDEIA
              </button>

              <button
                className="delete-world-button"
                onClick={() =>
                  deleteBoard(
                    selectedBoard
                  )
                }
                disabled={
                  deletingBoardId ===
                  selectedBoard.id
                }
              >
                {deletingBoardId ===
                selectedBoard.id
                  ? 'APAGANDO...'
                  : '🗑 APAGAR UNIVERSO'}
              </button>

            </div>

          </header>

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

          <section className="idea-flow-wrapper">

            {loadingWorld ? (

              <div className="idea-world-loading">
                Abrindo universo...
              </div>

            ) : (

              <ReactFlow
                nodes={nodes}
                edges={edges}

                onNodesChange={
                  onNodesChange
                }

                onEdgesChange={
                  onEdgesChange
                }

                onConnect={
                  onConnect
                }

                onNodeClick={(
                  _event,
                  node
                ) => {
                  setSelectedNodeId(
                    node.id
                  )
                }}

                onPaneClick={() =>
                  setSelectedNodeId(
                    null
                  )
                }

                onNodeDragStop={(
                  _event,
                  node
                ) =>
                  saveNodePosition(
                    node
                  )
                }

                nodeTypes={
                  nodeTypes
                }

                fitView

                fitViewOptions={{
                  padding: 0.4,
                }}

                minZoom={0.2}
                maxZoom={2.5}

                defaultEdgeOptions={{
                  type:
                    'smoothstep',

                  animated:
                    true,
                }}
              >

                <Background
                  gap={28}
                  size={1}
                />

                <Controls />

                <MiniMap
                  zoomable
                  pannable
                />

              </ReactFlow>

            )}

            {!loadingWorld &&
              nodes.length === 0 && (

                <div className="empty-world-message">

                  <div>
                    ✦
                  </div>

                  <h2>
                    Universo vazio
                  </h2>

                  <p>
                    Crie seu primeiro
                    pensamento.
                  </p>

                  <button
                    onClick={() =>
                      setShowCreateThought(
                        true
                      )
                    }
                  >
                    + CRIAR IDEIA
                  </button>

                </div>

              )}

          </section>

        </div>

        {/* =====================================
            MODAL NOVA IDEIA
        ===================================== */}

        {showCreateThought && (

          <div
            className="idea-modal-overlay"
            onMouseDown={() =>
              setShowCreateThought(
                false
              )
            }
          >

            <section
              className="idea-modal"
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >

              <div className="idea-modal-header">

                <div>

                  <span>
                    NOVO PENSAMENTO
                  </span>

                  <h2>
                    NOVA IDEIA
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setShowCreateThought(
                      false
                    )
                  }
                >
                  ✕
                </button>

              </div>

              <div className="idea-form">

                <label>
                  Título
                </label>

                <input
                  type="text"
                  maxLength={70}
                  autoFocus
                  placeholder="Ex: Nova coleção de camisetas"
                  value={
                    thoughtTitle
                  }
                  onChange={(
                    event
                  ) =>
                    setThoughtTitle(
                      event.target.value
                    )
                  }
                />

                <label>
                  Anotação
                </label>

                <textarea
                  rows={5}
                  maxLength={500}
                  placeholder="Escreva sua ideia..."
                  value={
                    thoughtContent
                  }
                  onChange={(
                    event
                  ) =>
                    setThoughtContent(
                      event.target.value
                    )
                  }
                />

                <small>
                  {
                    thoughtContent
                      .length
                  }
                  /500
                </small>

                {message && (
                  <div className="idea-form-message">
                    {message}
                  </div>
                )}

                <button
                  className="confirm-create-universe"
                  onClick={
                    createThought
                  }
                  disabled={
                    creatingThought
                  }
                >
                  {creatingThought
                    ? 'CRIANDO IDEIA...'
                    : 'CRIAR IDEIA'}
                </button>

              </div>

            </section>

          </div>

        )}

      </main>
    )
  }

  /* =======================================================
     LISTA DE UNIVERSOS
  ======================================================= */

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
              Crie universos,
              conecte pensamentos
              e desenvolva suas ideias.
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
                setShowCreateBoard(
                  true
                )
              }
            >
              CRIAR PRIMEIRO UNIVERSO
            </button>

          </section>

        ) : (

          <section className="universe-grid">

            {boards.map(
              (board) => (

                <article
                  key={
                    board.id
                  }
                  className="universe-card universe-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (
                      deletingBoardId !==
                      board.id
                    ) {
                      openBoard(
                        board
                      )
                    }
                  }}
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        'Enter' ||
                      event.key === ' '
                    ) {
                      openBoard(
                        board
                      )
                    }
                  }}
                >

                  <button
                    className="delete-universe-card-button"
                    title="Apagar universo"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation()

                      deleteBoard(
                        board
                      )
                    }}
                    disabled={
                      deletingBoardId ===
                      board.id
                    }
                  >
                    {deletingBoardId ===
                    board.id
                      ? '...'
                      : '🗑'}
                  </button>

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
                      Criado em{' '}
                      {formatDate(
                        board.created_at
                      )}
                    </span>

                    <strong>
                      ENTRAR ›
                    </strong>

                  </div>

                </article>

              )
            )}

          </section>

        )}

      </div>

      {/* =====================================
          MODAL NOVO UNIVERSO
      ===================================== */}

      {showCreateBoard && (

        <div
          className="idea-modal-overlay"
          onMouseDown={() =>
            setShowCreateBoard(
              false
            )
          }
        >

          <section
            className="idea-modal"
            onMouseDown={(
              event
            ) =>
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
                  setShowCreateBoard(
                    false
                  )
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
                onChange={(
                  event
                ) =>
                  setBoardName(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    createBoard()
                  }
                }}
              />

              <small>
                {
                  boardName.length
                }
                /60
              </small>

              {message && (
                <div className="idea-form-message">
                  {message}
                </div>
              )}

              <button
                className="confirm-create-universe"
                onClick={
                  createBoard
                }
                disabled={
                  creatingBoard
                }
              >
                {creatingBoard
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