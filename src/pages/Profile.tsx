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
  }, [])

  /* =========================================================
     CARREGAR PERFIL
  ========================================================= */

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

  /* =========================================================
     CARREGAR AMIGOS
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
      console.error(
        'Erro ao enviar pedido:',
        error
      )

      const lowerMessage =
        error.message.toLowerCase()

      if (
        lowerMessage.includes(
          'já são amigos'
        )
      ) {
        setMessage(
          'Vocês já são amigos.'
        )
      } else if (
        lowerMessage.includes(
          'já enviado'
        )
      ) {
        setMessage(
          'Você já enviou um pedido para este membro.'
        )
      } else if (
        lowerMessage.includes(
          'já enviou uma solicitação'
        )
      ) {
        setMessage(
          'Esse membro já enviou uma solicitação para você. Veja a aba Solicitações.'
        )
      } else {
        setMessage(
          'Não foi possível enviar o pedido de amizade.'
        )
      }

      setSendingRequestId(
        null
      )

      return
    }

    /*
      Atualizamos somente o resultado
      correspondente sem precisar
      refazer a busca.
    */

    setSearchResults(
      (currentResults) =>
        currentResults.map(
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
      `Pedido de amizade enviado para ${member.name}!`
    )
  }

  /* =========================================================
     FORMATAÇÃO
  ========================================================= */

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

  /* =========================================================
     AVATAR
  ========================================================= */

  function renderAvatar(
    avatarUrl: string | null,
    name: string
  ) {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
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
     BOTÃO DE RELAÇÃO
  ========================================================= */

  function renderRelationButton(
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
          onClick={() =>
            setActiveTab(
              'requests'
            )
          }
        >
          ✉ RESPONDER SOLICITAÇÃO
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

        {/* ===================================================
            CABEÇALHO
        =================================================== */}

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
              Sua identidade e seus
              companheiros dentro
              do GUILDY.
            </p>

          </div>

        </header>

        {/* ===================================================
            PERSONAGEM
        =================================================== */}

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
                {profile.name
                  .charAt(0)
                  .toUpperCase()}
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

        {/* ===================================================
            ABAS
        =================================================== */}

        <nav className="profile-tabs">

          <button
            className={
              activeTab ===
              'profile'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() => {
              setActiveTab(
                'profile'
              )

              setMessage('')
              setSuccessMessage('')
            }}
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
            onClick={() => {
              setActiveTab(
                'friends'
              )

              setMessage('')
              setSuccessMessage('')

              loadFriends()
            }}
          >
            👥 AMIGOS
            {' '}
            ({friends.length})
          </button>

          <button
            className={
              activeTab ===
              'requests'
                ? 'profile-tab active'
                : 'profile-tab'
            }
            onClick={() => {
              setActiveTab(
                'requests'
              )

              setMessage('')
              setSuccessMessage('')
            }}
          >
            ✉ SOLICITAÇÕES
          </button>

        </nav>

        {/* MENSAGENS */}

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

        {/* ===================================================
            MEU PERFIL
        =================================================== */}

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

        {/* ===================================================
            AMIGOS
        =================================================== */}

        {activeTab ===
          'friends' && (

          <section className="profile-panel">

            {/* BUSCA */}

            <div className="profile-section-title">

              <span>
                RECRUTAMENTO
              </span>

              <h2>
                Encontrar membros
              </h2>

              <p className="friends-section-description">
                Procure alguém pelo
                nickname ou pelo e-mail
                usado no GUILDY.
              </p>

            </div>

            <div className="friend-search-box">

              <div className="friend-search-input">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="@nickname ou email@exemplo.com"
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

                    setSearchResults(
                      []
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

            {/* RESULTADOS */}

            {hasSearched && (
              <div className="friend-search-results">

                <div className="friends-list-heading">

                  <span>
                    RESULTADOS
                  </span>

                  <strong>
                    {
                      searchResults.length
                    }
                  </strong>

                </div>

                {searchResults.length ===
                  0 &&
                !searching ? (

                  <div className="friends-empty-state">

                    <span>
                      ⌕
                    </span>

                    <h3>
                      Nenhum membro encontrado
                    </h3>

                    <p>
                      Confira o nickname
                      ou digite o e-mail
                      completo da pessoa.
                    </p>

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

                            {renderAvatar(
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

                            {renderRelationButton(
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

            {/* LISTA DE AMIGOS */}

            <div className="my-friends-section">

              <div className="friends-list-heading">

                <span>
                  SUA PARTY SOCIAL
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

                  <p>
                    Procure outro membro
                    acima e envie seu
                    primeiro pedido de
                    amizade.
                  </p>

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

                          {renderAvatar(
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

        {/* ===================================================
            SOLICITAÇÕES
        =================================================== */}

        {activeTab ===
          'requests' && (

          <section className="profile-panel social-placeholder">

            <div className="social-placeholder-icon">
              ✉
            </div>

            <h2>
              Solicitações de amizade
            </h2>

            <p>
              Os pedidos recebidos
              aparecerão aqui.
            </p>

            <div className="social-next-feature">
              PRÓXIMA ETAPA:
              ACEITAR OU RECUSAR
            </div>

          </section>

        )}

      </div>

    </main>
  )
}

export default Profile