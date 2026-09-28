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

type Friend = {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  friends_since: string
}

type SearchResult = {
  user_id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  relation_status:
    | 'none'
    | 'friend'
    | 'request_sent'
    | 'request_received'
}

type FriendRequest = {
  request_id: string
  sender_id: string
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

  /* =========================================================
     PERFIL
  ========================================================= */

  const [profile, setProfile] =
    useState<ProfileData | null>(null)

  const [email, setEmail] =
    useState('')

  const [nickname, setNickname] =
    useState('')

  const [platinumBalance, setPlatinumBalance] =
    useState(0)

  const [activeTab, setActiveTab] =
    useState<ProfileTab>('profile')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  /* =========================================================
     AMIGOS
  ========================================================= */

  const [friends, setFriends] =
    useState<Friend[]>([])

  const [loadingFriends, setLoadingFriends] =
    useState(false)

  /* =========================================================
     SOLICITAÇÕES
  ========================================================= */

  const [requests, setRequests] =
    useState<FriendRequest[]>([])

  const [loadingRequests, setLoadingRequests] =
    useState(false)

  const [respondingRequestId, setRespondingRequestId] =
    useState<string | null>(null)

  /* =========================================================
     BUSCA
  ========================================================= */

  const [searchQuery, setSearchQuery] =
    useState('')

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([])

  const [searching, setSearching] =
    useState(false)

  const [hasSearched, setHasSearched] =
    useState(false)

  const [sendingRequestId, setSendingRequestId] =
    useState<string | null>(null)

  /* =========================================================
     MENSAGENS
  ========================================================= */

  const [message, setMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  /* =========================================================
     INÍCIO
  ========================================================= */

  useEffect(() => {
    loadProfile()
    loadFriends()
    loadRequests()
  }, [])

  /* =========================================================
     PERFIL
  ========================================================= */

  async function loadProfile() {
    setLoading(true)

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

  /* =========================================================
     PLATINUM
  ========================================================= */

  async function loadPlatinum(
    userId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('platinum_transactions')
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

  /* =========================================================
     AMIGOS
  ========================================================= */

  async function loadFriends() {
    setLoadingFriends(true)

    const {
      data,
      error,
    } = await supabase.rpc(
      'get_my_friends'
    )

    if (error) {
      console.error(
        'Erro ao carregar amigos:',
        error
      )

      setLoadingFriends(false)
      return
    }

    setFriends(
      (data as Friend[]) ?? []
    )

    setLoadingFriends(false)
  }

  /* =========================================================
     SOLICITAÇÕES RECEBIDAS
  ========================================================= */

  async function loadRequests() {
    setLoadingRequests(true)

    const {
      data,
      error,
    } = await supabase.rpc(
      'get_received_friend_requests'
    )

    if (error) {
      console.error(
        'Erro ao carregar solicitações:',
        error
      )

      setLoadingRequests(false)
      return
    }

    setRequests(
      (data as FriendRequest[]) ??
        []
    )

    setLoadingRequests(false)
  }

  /* =========================================================
     ACEITAR / RECUSAR
  ========================================================= */

  async function respondRequest(
    request: FriendRequest,
    accept: boolean
  ) {
    setMessage('')
    setSuccessMessage('')

    setRespondingRequestId(
      request.request_id
    )

    const {
      error,
    } = await supabase.rpc(
      'respond_friend_request',
      {
        p_request_id:
          request.request_id,

        p_accept:
          accept,
      }
    )

    if (error) {
      console.error(
        'Erro ao responder solicitação:',
        error
      )

      setMessage(
        'Não foi possível responder à solicitação.'
      )

      setRespondingRequestId(
        null
      )

      return
    }

    setRequests(
      (currentRequests) =>
        currentRequests.filter(
          (item) =>
            item.request_id !==
            request.request_id
        )
    )

    setRespondingRequestId(
      null
    )

    if (accept) {
      setSuccessMessage(
        `${request.name} agora faz parte dos seus amigos!`
      )

      await loadFriends()
    } else {
      setSuccessMessage(
        `Solicitação de ${request.name} recusada.`
      )
    }
  }

  /* =========================================================
     NICKNAME
  ========================================================= */

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

    setProfile(
      data as ProfileData
    )

    setNickname(
      data.nickname ?? ''
    )

    setSaving(false)

    setSuccessMessage(
      'Nickname atualizado!'
    )
  }

  /* =========================================================
     BUSCAR MEMBROS
  ========================================================= */

  async function searchMembers() {
    setMessage('')
    setSuccessMessage('')
    setSearchResults([])
    setHasSearched(true)

    const query =
      searchQuery.trim()

    if (
      query.length < 3
    ) {
      setMessage(
        'Digite pelo menos 3 caracteres para buscar.'
      )
      return
    }

    setSearching(true)

    const {
      data,
      error,
    } = await supabase.rpc(
      'search_guild_members',
      {
        p_query:
          query,
      }
    )

    if (error) {
      console.error(
        'Erro ao buscar membros:',
        error
      )

      setMessage(
        'Não foi possível realizar a busca.'
      )

      setSearching(false)
      return
    }

    setSearchResults(
      (data as SearchResult[]) ??
        []
    )

    setSearching(false)
  }

  /* =========================================================
     ENVIAR PEDIDO
  ========================================================= */

  async function sendFriendRequest(
    member: SearchResult
  ) {
    setMessage('')
    setSuccessMessage('')

    setSendingRequestId(
      member.user_id
    )

    const {
      error,
    } = await supabase.rpc(
      'send_friend_request',
      {
        p_receiver_id:
          member.user_id,
      }
    )

    if (error) {
      const lower =
        error.message.toLowerCase()

      if (
        lower.includes(
          'já são amigos'
        )
      ) {
        setMessage(
          'Vocês já são amigos.'
        )
      } else if (
        lower.includes(
          'já enviado'
        )
      ) {
        setMessage(
          'Pedido já enviado.'
        )
      } else if (
        lower.includes(
          'já enviou uma solicitação'
        )
      ) {
        setMessage(
          'Esse membro já enviou uma solicitação para você.'
        )
      } else {
        setMessage(
          'Não foi possível enviar o pedido.'
        )
      }

      setSendingRequestId(
        null
      )

      return
    }

    setSearchResults(
      (current) =>
        current.map(
          (item) =>
            item.user_id ===
            member.user_id
              ? {
                  ...item,
                  relation_status:
                    'request_sent',
                }
              : item
        )
    )

    setSendingRequestId(
      null
    )

    setSuccessMessage(
      `Pedido enviado para ${member.name}!`
    )
  }

  /* =========================================================
     FORMATAR
  ========================================================= */

  function formatDate(
    date: string
  ) {
    return new Date(date)
      .toLocaleDateString(
        'pt-BR'
      )
  }

  function formatPlatinum(
    value: number
  ) {
    return value.toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )
  }

  /* =========================================================
     AVATAR
  ========================================================= */

  function avatar(
    url: string | null,
    name: string
  ) {
    if (url) {
      return (
        <img
          src={url}
          alt={name}
        />
      )
    }

    return (
      <span>
        {name
          .charAt(0)
          .toUpperCase()}
      </span>
    )
  }

  /* =========================================================
     STATUS DA BUSCA
  ========================================================= */

  function relationButton(
    member: SearchResult
  ) {
    if (
      member.relation_status ===
      'friend'
    ) {
      return (
        <div className="friend-relation-status friend-status-confirmed">
          ✓ AMIGO
        </div>
      )
    }

    if (
      member.relation_status ===
      'request_sent'
    ) {
      return (
        <div className="friend-relation-status friend-status-pending">
          ⏳ PEDIDO ENVIADO
        </div>
      )
    }

    if (
      member.relation_status ===
      'request_received'
    ) {
      return (
        <button
          className="friend-request-received-button"
          onClick={() => {
            setActiveTab(
              'requests'
            )

            loadRequests()
          }}
        >
          ✉ VER SOLICITAÇÃO
        </button>
      )
    }

    return (
      <button
        className="send-friend-request-button"
        onClick={() =>
          sendFriendRequest(
            member
          )
        }
        disabled={
          sendingRequestId ===
          member.user_id
        }
      >
        {sendingRequestId ===
        member.user_id
          ? 'ENVIANDO...'
          : '+ ADICIONAR AMIGO'}
      </button>
    )
  }

  /* =========================================================
     LOADING
  ========================================================= */

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

  /* =========================================================
     INTERFACE
  ========================================================= */

  return (
    <main className="profile-page">

      <div className="profile-container">

        <header className="profile-header">

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
            Sua identidade e seus
            companheiros dentro do GUILDY.
          </p>

        </header>

        {/* PERFIL SUPERIOR */}

        <section className="profile-hero">

          <div className="profile-avatar-frame">
            {avatar(
              profile.avatar_url,
              profile.name
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
              activeTab === 'profile'
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
              activeTab === 'friends'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() => {
              setActiveTab(
                'friends'
              )

              loadFriends()
            }}
          >
            👥 AMIGOS ({friends.length})
          </button>

          <button
            className={
              activeTab === 'requests'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() => {
              setActiveTab(
                'requests'
              )

              loadRequests()
            }}
          >
            ✉ SOLICITAÇÕES
            {requests.length > 0 &&
              ` (${requests.length})`}
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

        {/* =================================================
            MEU PERFIL
        ================================================= */}

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

              <div className="profile-info-field">

                <label>
                  Nickname
                </label>

                <div className="nickname-input-wrapper">

                  <span>
                    @
                  </span>

                  <input
                    value={
                      nickname
                    }
                    maxLength={24}
                    onChange={(
                      event
                    ) =>
                      setNickname(
                        event.target.value
                      )
                    }
                  />

                </div>

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

        {/* =================================================
            AMIGOS
        ================================================= */}

        {activeTab ===
          'friends' && (

          <section className="profile-panel">

            <div className="profile-section-title">

              <span>
                RECRUTAMENTO
              </span>

              <h2>
                Encontrar membros
              </h2>

            </div>

            <div className="friend-search-box">

              <div className="friend-search-input">

                <span>
                  ⌕
                </span>

                <input
                  placeholder="@nickname ou email"
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) => {
                    setSearchQuery(
                      event.target.value
                    )

                    setHasSearched(
                      false
                    )
                  }}
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      searchMembers()
                    }
                  }}
                />

              </div>

              <button
                className="search-friend-button"
                onClick={
                  searchMembers
                }
                disabled={
                  searching
                }
              >
                {searching
                  ? 'BUSCANDO...'
                  : 'BUSCAR'}
              </button>

            </div>

            {hasSearched && (

              <div className="friend-search-results">

                <div className="friends-list-heading">

                  <span>
                    RESULTADOS
                  </span>

                  <strong>
                    {searchResults.length}
                  </strong>

                </div>

                {searchResults.length ===
                  0 ? (

                  <div className="friends-empty-state">

                    <span>
                      ⌕
                    </span>

                    <h3>
                      Nenhum membro encontrado
                    </h3>

                  </div>

                ) : (

                  <div className="friend-cards-list">

                    {searchResults.map(
                      (member) => (

                        <article
                          key={
                            member.user_id
                          }
                          className="friend-member-card"
                        >

                          <div className="friend-avatar">
                            {avatar(
                              member.avatar_url,
                              member.name
                            )}
                          </div>

                          <div className="friend-member-info">

                            <span>
                              MEMBRO DA GUILDA
                            </span>

                            <h3>
                              {member.name}
                            </h3>

                            <strong>
                              {member.nickname
                                ? `@${member.nickname}`
                                : 'Sem nickname'}
                            </strong>

                          </div>

                          <div className="friend-member-action">
                            {relationButton(
                              member
                            )}
                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

            {/* LISTA */}

            <div className="my-friends-section">

              <div className="friends-list-heading">

                <span>
                  SEUS AMIGOS
                </span>

                <strong>
                  {friends.length}
                </strong>

              </div>

              {loadingFriends ? (

                <div className="friends-loading">
                  Carregando amigos...
                </div>

              ) : friends.length ===
                  0 ? (

                <div className="friends-empty-state">

                  <span>
                    👥
                  </span>

                  <h3>
                    Nenhum amigo ainda
                  </h3>

                </div>

              ) : (

                <div className="friend-cards-list">

                  {friends.map(
                    (friend) => (

                      <article
                        key={
                          friend.id
                        }
                        className="friend-member-card confirmed-friend-card"
                      >

                        <div className="friend-avatar">
                          {avatar(
                            friend.avatar_url,
                            friend.name
                          )}
                        </div>

                        <div className="friend-member-info">

                          <span>
                            COMPANHEIRO
                          </span>

                          <h3>
                            {friend.name}
                          </h3>

                          <strong>
                            {friend.nickname
                              ? `@${friend.nickname}`
                              : 'Sem nickname'}
                          </strong>

                        </div>

                        <div className="friend-member-action">

                          <div className="friend-relation-status friend-status-confirmed">
                            ✓ AMIGO
                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )}

            </div>

          </section>

        )}

        {/* =================================================
            SOLICITAÇÕES
        ================================================= */}

        {activeTab ===
          'requests' && (

          <section className="profile-panel">

            <div className="profile-section-title">

              <span>
                CONVITES SOCIAIS
              </span>

              <h2>
                Solicitações de amizade
              </h2>

            </div>

            {loadingRequests ? (

              <div className="friends-loading">
                Carregando solicitações...
              </div>

            ) : requests.length ===
                0 ? (

              <div className="friends-empty-state">

                <span>
                  ✉
                </span>

                <h3>
                  Nenhuma solicitação
                </h3>

                <p>
                  Quando alguém quiser
                  adicionar você,
                  aparecerá aqui.
                </p>

              </div>

            ) : (

              <div className="friend-cards-list request-list">

                {requests.map(
                  (request) => (

                    <article
                      key={
                        request.request_id
                      }
                      className="friend-member-card request-card"
                    >

                      <div className="friend-avatar">
                        {avatar(
                          request.avatar_url,
                          request.name
                        )}
                      </div>

                      <div className="friend-member-info">

                        <span>
                          PEDIDO DE AMIZADE
                        </span>

                        <h3>
                          {request.name}
                        </h3>

                        <strong>
                          {request.nickname
                            ? `@${request.nickname}`
                            : 'Sem nickname'}
                        </strong>

                      </div>

                      <div className="friend-request-actions">

                        <button
                          className="accept-friend-button"
                          disabled={
                            respondingRequestId ===
                            request.request_id
                          }
                          onClick={() =>
                            respondRequest(
                              request,
                              true
                            )
                          }
                        >
                          ✓ ACEITAR
                        </button>

                        <button
                          className="decline-friend-button"
                          disabled={
                            respondingRequestId ===
                            request.request_id
                          }
                          onClick={() =>
                            respondRequest(
                              request,
                              false
                            )
                          }
                        >
                          ✕ RECUSAR
                        </button>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </section>

        )}

      </div>

    </main>
  )
}

export default Profile