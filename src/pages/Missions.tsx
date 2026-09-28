import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* =========================================================
   TIPOS
========================================================= */

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

type MemberStatus =
  | 'invited'
  | 'accepted'
  | 'declined'

type MemberRole =
  | 'leader'
  | 'member'

type Tab =
  | 'board'
  | 'mine'
  | 'invites'
  | 'completed'

type Mission = {
  id: string
  title: string
  description: string | null
  priority: Priority
  gold_reward: number | string
  platinum_reward: number | string
  status: MissionStatus
  created_by: string
  claimed_by: string | null
  created_at: string
  claimed_at: string | null
  completed_at: string | null
}

type Membership = {
  mission_id: string
  user_id: string
  role: MemberRole
  status: MemberStatus
  reward_percentage: number | string
  completed: boolean
  completed_at: string | null
}

type MissionInvite = {
  mission_id: string
  title: string
  description: string | null
  priority: Priority
  gold_reward: number | string
  platinum_reward: number | string
  reward_percentage: number | string
  leader_id: string
  leader_name: string
  leader_nickname: string | null
  leader_avatar_url: string | null
  created_at: string
}

type PartyMember = {
  user_id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  role: MemberRole
  status: MemberStatus
  reward_percentage: number | string
  completed: boolean
  completed_at: string | null
}

type Friend = {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  friends_since: string
}

type PartySelection = {
  user_id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  selected: boolean
  percentage: string
}

/* =========================================================
   COMPONENTE
========================================================= */

function Missions() {
  const navigate = useNavigate()

  /* =======================================================
     DADOS PRINCIPAIS
  ======================================================= */

  const [missions, setMissions] =
    useState<Mission[]>([])

  const [memberships, setMemberships] =
    useState<Membership[]>([])

  const [invites, setInvites] =
    useState<MissionInvite[]>([])

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [activeTab, setActiveTab] =
    useState<Tab>('board')

  /* =======================================================
     NOVA MISSÃO
  ======================================================= */

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

  /* =======================================================
     AÇÕES
  ======================================================= */

  const [acceptingMissionId, setAcceptingMissionId] =
    useState<string | null>(null)

  const [completingMissionId, setCompletingMissionId] =
    useState<string | null>(null)

  const [deletingMissionId, setDeletingMissionId] =
    useState<string | null>(null)

  const [respondingInviteId, setRespondingInviteId] =
    useState<string | null>(null)

  /* =======================================================
     PARTY
  ======================================================= */

  const [showPartyModal, setShowPartyModal] =
    useState(false)

  const [partyMission, setPartyMission] =
    useState<Mission | null>(null)

  const [partyMembers, setPartyMembers] =
    useState<PartyMember[]>([])

  const [partySelections, setPartySelections] =
    useState<PartySelection[]>([])

  const [leaderPercentage, setLeaderPercentage] =
    useState('100')

  const [partyLoading, setPartyLoading] =
    useState(false)

  const [savingParty, setSavingParty] =
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
    loadEverything()
  }, [])

  /* =======================================================
     CARREGAR TUDO
  ======================================================= */

  async function loadEverything() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    setCurrentUserId(user.id)

    const [
      missionsResult,
      membershipResult,
      inviteResult,
    ] = await Promise.all([
      supabase
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
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from('mission_members')
        .select(`
          mission_id,
          user_id,
          role,
          status,
          reward_percentage,
          completed,
          completed_at
        `)
        .eq(
          'user_id',
          user.id
        ),

      supabase.rpc(
        'get_my_mission_invites'
      ),
    ])

    if (missionsResult.error) {
      console.error(
        'Erro ao carregar missões:',
        missionsResult.error
      )

      setMessage(
        'Não foi possível carregar as missões.'
      )
    } else {
      setMissions(
        (missionsResult.data as Mission[]) ??
          []
      )
    }

    if (membershipResult.error) {
      console.error(
        'Erro ao carregar participações:',
        membershipResult.error
      )
    } else {
      setMemberships(
        (membershipResult.data as Membership[]) ??
          []
      )
    }

    if (inviteResult.error) {
      console.error(
        'Erro ao carregar convites:',
        inviteResult.error
      )
    } else {
      setInvites(
        (inviteResult.data as MissionInvite[]) ??
          []
      )
    }

    setLoading(false)
  }

  /* =======================================================
     FILTROS DAS ABAS
  ======================================================= */

  const boardMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) =>
            mission.status ===
            'available'
        ),
      [missions]
    )

  const myMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) => {
            if (
              mission.status !==
              'claimed'
            ) {
              return false
            }

            return memberships.some(
              (membership) =>
                membership.mission_id ===
                  mission.id &&
                membership.status ===
                  'accepted'
            )
          }
        ),
      [
        missions,
        memberships,
      ]
    )

  const completedMissions =
    useMemo(
      () =>
        missions.filter(
          (mission) => {
            if (
              mission.status !==
              'completed'
            ) {
              return false
            }

            return memberships.some(
              (membership) =>
                membership.mission_id ===
                  mission.id &&
                membership.status ===
                  'accepted'
            )
          }
        ),
      [
        missions,
        memberships,
      ]
    )

  function membershipFor(
    missionId: string
  ) {
    return memberships.find(
      (membership) =>
        membership.mission_id ===
        missionId
    )
  }

  /* =======================================================
     CRIAR MISSÃO
  ======================================================= */

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
        goldReward.replace(
          ',',
          '.'
        )
      ) || 0

    const platinum =
      Number(
        platinumReward.replace(
          ',',
          '.'
        )
      ) || 0

    if (
      gold < 0 ||
      platinum < 0
    ) {
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
      return
    }

    setCreating(true)

    const { error } =
      await supabase
        .from('missions')
        .insert({
          title:
            title.trim(),

          description:
            description.trim() ||
            null,

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

    setCreating(false)
    setShowCreateMission(false)

    setActiveTab('board')

    setSuccessMessage(
      'Missão publicada no Quadro da Guilda!'
    )

    await loadEverything()
  }

  /* =======================================================
     ACEITAR MISSÃO
  ======================================================= */

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
        'Não foi possível aceitar a missão. Talvez outro membro já tenha aceitado.'
      )

      setAcceptingMissionId(
        null
      )

      await loadEverything()
      return
    }

    setAcceptingMissionId(
      null
    )

    await loadEverything()

    setActiveTab('mine')

    setSuccessMessage(
      'Missão adicionada ao seu quadro pessoal!'
    )
  }

  /* =======================================================
     RESPONDER CONVITE
  ======================================================= */

  async function respondMissionInvite(
    invite: MissionInvite,
    accept: boolean
  ) {
    setMessage('')
    setSuccessMessage('')

    setRespondingInviteId(
      invite.mission_id
    )

    const { error } =
      await supabase.rpc(
        'respond_mission_invite',
        {
          p_mission_id:
            invite.mission_id,

          p_accept:
            accept,
        }
      )

    if (error) {
      console.error(
        'Erro ao responder convite:',
        error
      )

      setMessage(
        'Não foi possível responder ao convite.'
      )

      setRespondingInviteId(
        null
      )

      return
    }

    setRespondingInviteId(
      null
    )

    await loadEverything()

    if (accept) {
      setActiveTab('mine')

      setSuccessMessage(
        `Você entrou na Party da missão "${invite.title}"!`
      )
    } else {
      setSuccessMessage(
        `Convite da missão "${invite.title}" recusado.`
      )
    }
  }

  /* =======================================================
     CONCLUIR MINHA PARTE
  ======================================================= */

  async function completeMission(
    mission: Mission
  ) {
    setMessage('')
    setSuccessMessage('')

    setCompletingMissionId(
      mission.id
    )

    const { error } =
      await supabase.rpc(
        'complete_mission',
        {
          p_mission_id:
            mission.id,
        }
      )

    if (error) {
      console.error(
        'Erro ao concluir missão:',
        error
      )

      const lower =
        error.message.toLowerCase()

      if (
        lower.includes(
          'convites'
        )
      ) {
        setMessage(
          'Ainda existem convites de Party aguardando resposta.'
        )
      } else if (
        lower.includes(
          'recusou'
        )
      ) {
        setMessage(
          'Um membro recusou o convite. O líder precisa reorganizar a Party.'
        )
      } else if (
        lower.includes(
          '100'
        )
      ) {
        setMessage(
          'A divisão das recompensas precisa totalizar 100%.'
        )
      } else {
        setMessage(
          'Não foi possível concluir sua parte.'
        )
      }

      setCompletingMissionId(
        null
      )

      return
    }

    setCompletingMissionId(
      null
    )

    /*
      Verifica se esta conclusão
      também finalizou toda a missão.
    */

    const {
      data: missionAfter,
    } = await supabase
      .from('missions')
      .select('status')
      .eq(
        'id',
        mission.id
      )
      .single()

    await loadEverything()

    if (
      missionAfter?.status ===
      'completed'
    ) {
      setActiveTab(
        'completed'
      )

      setSuccessMessage(
        'Party completa! A missão foi concluída e as recompensas foram distribuídas.'
      )
    } else {
      setActiveTab('mine')

      setSuccessMessage(
        'Sua parte foi concluída. Agora aguardamos os demais membros da Party.'
      )
    }
  }

  /* =======================================================
     APAGAR MISSÃO
  ======================================================= */

  async function deleteMission(
    mission: Mission
  ) {
    let warning =
      `Tem certeza que deseja apagar a missão "${mission.title}"?`

    if (
      mission.status ===
      'claimed'
    ) {
      warning +=
        '\n\nA Party e todos os convites desta missão também serão removidos.'
    }

    if (
      mission.status ===
      'completed'
    ) {
      warning +=
        '\n\nAs recompensas de Gold e Platinum geradas por esta missão também serão removidas.'
    }

    const confirmed =
      window.confirm(
        warning
      )

    if (!confirmed) {
      return
    }

    setDeletingMissionId(
      mission.id
    )

    setMessage('')
    setSuccessMessage('')

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

      setMessage(
        'Não foi possível apagar a missão.'
      )

      setDeletingMissionId(
        null
      )

      return
    }

    setDeletingMissionId(
      null
    )

    setSuccessMessage(
      `Missão "${mission.title}" apagada.`
    )

    await loadEverything()
  }

  /* =======================================================
     ABRIR PARTY
  ======================================================= */

  async function openParty(
    mission: Mission
  ) {
    setPartyMission(
      mission
    )

    setShowPartyModal(
      true
    )

    setPartyLoading(
      true
    )

    setMessage('')
    setSuccessMessage('')

    const isLeader =
      mission.claimed_by ===
      currentUserId

    /*
      Carrega a Party atual.
    */

    const {
      data: partyData,
      error: partyError,
    } = await supabase.rpc(
      'get_mission_party',
      {
        p_mission_id:
          mission.id,
      }
    )

    if (partyError) {
      console.error(
        'Erro ao carregar Party:',
        partyError
      )

      setMessage(
        'Não foi possível carregar a Party.'
      )

      setPartyLoading(
        false
      )

      return
    }

    const currentParty =
      (partyData as PartyMember[]) ??
      []

    setPartyMembers(
      currentParty
    )

    const leader =
      currentParty.find(
        (member) =>
          member.role ===
          'leader'
      )

    setLeaderPercentage(
      leader
        ? String(
            Number(
              leader.reward_percentage
            )
          )
        : '100'
    )

    /*
      Se for líder, carrega os amigos
      para permitir edição da Party.
    */

    if (isLeader) {
      const {
        data: friendsData,
        error: friendsError,
      } = await supabase.rpc(
        'get_my_friends'
      )

      if (friendsError) {
        console.error(
          'Erro ao carregar amigos:',
          friendsError
        )

        setMessage(
          'Não foi possível carregar sua lista de amigos.'
        )

        setPartyLoading(
          false
        )

        return
      }

      const friends =
        (friendsData as Friend[]) ??
        []

      const selections:
        PartySelection[] =
        friends.map(
          (friend) => {
            const existing =
              currentParty.find(
                (member) =>
                  member.user_id ===
                  friend.id &&
                  member.role ===
                  'member'
              )

            return {
              user_id:
                friend.id,

              name:
                friend.name,

              nickname:
                friend.nickname,

              avatar_url:
                friend.avatar_url,

              selected:
                Boolean(
                  existing
                ),

              percentage:
                existing
                  ? String(
                      Number(
                        existing.reward_percentage
                      )
                    )
                  : '',
            }
          }
        )

      setPartySelections(
        selections
      )
    } else {
      setPartySelections(
        []
      )
    }

    setPartyLoading(
      false
    )
  }

  /* =======================================================
     SELECIONAR AMIGO
  ======================================================= */

  function toggleFriend(
    userId: string
  ) {
    const selectedCount =
      partySelections.filter(
        (friend) =>
          friend.selected
      ).length

    const target =
      partySelections.find(
        (friend) =>
          friend.user_id ===
          userId
      )

    if (!target) {
      return
    }

    if (
      !target.selected &&
      selectedCount >= 5
    ) {
      setMessage(
        'A Party permite no máximo 5 amigos além do líder.'
      )

      return
    }

    setMessage('')

    setPartySelections(
      (current) =>
        current.map(
          (friend) =>
            friend.user_id ===
            userId
              ? {
                  ...friend,

                  selected:
                    !friend.selected,

                  percentage:
                    friend.selected
                      ? ''
                      : friend.percentage,
                }
              : friend
        )
    )
  }

  /* =======================================================
     PORCENTAGEM DO AMIGO
  ======================================================= */

  function changeFriendPercentage(
    userId: string,
    value: string
  ) {
    setPartySelections(
      (current) =>
        current.map(
          (friend) =>
            friend.user_id ===
            userId
              ? {
                  ...friend,
                  percentage:
                    value,
                }
              : friend
        )
    )
  }

  /* =======================================================
     TOTAL DA DIVISÃO
  ======================================================= */

  const partyTotal =
    useMemo(
      () => {
        const leader =
          Number(
            leaderPercentage
          ) || 0

        const friends =
          partySelections
            .filter(
              (friend) =>
                friend.selected
            )
            .reduce(
              (
                total,
                friend
              ) =>
                total +
                (
                  Number(
                    friend.percentage
                  ) || 0
                ),
              0
            )

        return (
          Math.round(
            (
              leader +
              friends
            ) *
              100
          ) /
          100
        )
      },
      [
        leaderPercentage,
        partySelections,
      ]
    )

  /* =======================================================
     SALVAR PARTY
  ======================================================= */

  async function saveParty() {
    if (!partyMission) {
      return
    }

    setMessage('')
    setSuccessMessage('')

    const leaderPct =
      Number(
        leaderPercentage
      )

    if (
      !Number.isFinite(
        leaderPct
      ) ||
      leaderPct <= 0 ||
      leaderPct > 100
    ) {
      setMessage(
        'Defina uma porcentagem válida para o líder.'
      )

      return
    }

    const selectedFriends =
      partySelections.filter(
        (friend) =>
          friend.selected
      )

    if (
      selectedFriends.length > 5
    ) {
      setMessage(
        'A Party permite no máximo 5 amigos.'
      )

      return
    }

    for (
      const friend
      of selectedFriends
    ) {
      const percentage =
        Number(
          friend.percentage
        )

      if (
        !Number.isFinite(
          percentage
        ) ||
        percentage <= 0 ||
        percentage > 100
      ) {
        setMessage(
          `Defina uma porcentagem válida para ${friend.name}.`
        )

        return
      }
    }

    if (
      Math.abs(
        partyTotal -
        100
      ) > 0.001
    ) {
      setMessage(
        `A divisão precisa totalizar 100%. Atualmente está em ${partyTotal.toFixed(
          2
        )}%.`
      )

      return
    }

    const payload =
      selectedFriends.map(
        (friend) => ({
          user_id:
            friend.user_id,

          percentage:
            Number(
              friend.percentage
            ),
        })
      )

    setSavingParty(
      true
    )

    const { error } =
      await supabase.rpc(
        'set_mission_party',
        {
          p_mission_id:
            partyMission.id,

          p_leader_percentage:
            leaderPct,

          p_members:
            payload,
        }
      )

    if (error) {
      console.error(
        'Erro ao salvar Party:',
        error
      )

      setMessage(
        error.message ||
          'Não foi possível salvar a Party.'
      )

      setSavingParty(
        false
      )

      return
    }

    setSavingParty(
      false
    )

    setShowPartyModal(
      false
    )

    setSuccessMessage(
      selectedFriends.length ===
        0
        ? 'Missão configurada como Solo!'
        : 'Party configurada! Os convites foram enviados.'
    )

    await loadEverything()
  }

  /* =======================================================
     PRIORIDADE
  ======================================================= */

  function priorityLabel(
    value: Priority
  ) {
    switch (value) {
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

  /* =======================================================
     FORMATAR VALORES
  ======================================================= */

  function formatValue(
    value:
      | number
      | string
  ) {
    return Number(
      value
    ).toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      }
    )
  }

  /* =======================================================
     CALCULAR PARTE
  ======================================================= */

  function calculateShare(
    total:
      | number
      | string,
    percentage:
      | number
      | string
  ) {
    return (
      Number(total) *
      Number(percentage)
    ) / 100
  }

  /* =======================================================
     AVATAR
  ======================================================= */

  function renderAvatar(
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

  /* =======================================================
     CARD DA MISSÃO
  ======================================================= */

  function renderMissionCard(
    mission: Mission,
    mode:
      | 'board'
      | 'mine'
      | 'completed'
  ) {
    const membership =
      membershipFor(
        mission.id
      )

    const canDelete =
      mission.created_by ===
      currentUserId

    const isLeader =
      mission.claimed_by ===
      currentUserId

    const percentage =
      Number(
        membership
          ?.reward_percentage ??
          100
      )

    const personalGold =
      calculateShare(
        mission.gold_reward,
        percentage
      )

    const personalPlatinum =
      calculateShare(
        mission.platinum_reward,
        percentage
      )

    return (
      <article
        key={mission.id}
        className={`
          mission-card
          priority-${mission.priority}
        `}
      >

        {/* TOPO */}

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

        {/* TIPO */}

        <span className="mission-type">

          {mode === 'board' &&
            'MISSÃO DA GUILDA'}

          {mode === 'mine' &&
            (
              isLeader
                ? 'MISSÃO • LÍDER DA PARTY'
                : 'MISSÃO • MEMBRO DA PARTY'
            )}

          {mode === 'completed' &&
            'MISSÃO CONCLUÍDA'}

        </span>

        {/* TÍTULO */}

        <h2>
          {mission.title}
        </h2>

        <p className="mission-description">

          {mission.description ||
            'Nenhuma descrição foi adicionada.'}

        </p>

        {/* RECOMPENSA TOTAL */}

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
                  GOLD TOTAL
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
                  PLATINUM TOTAL
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

        {/* PARTE DO USUÁRIO */}

        {mode !== 'board' &&
          membership && (

          <div className="mission-personal-share">

            <div>

              <span>
                SUA PARTICIPAÇÃO
              </span>

              <strong>
                {percentage}%
              </strong>

            </div>

            <div className="personal-share-rewards">

              <span>
                ◉{' '}
                {formatValue(
                  personalGold
                )}
              </span>

              <span>
                ◆{' '}
                {formatValue(
                  personalPlatinum
                )}
              </span>

            </div>

          </div>

        )}

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
              mission.id
            }
          >

            {acceptingMissionId ===
            mission.id
              ? 'ACEITANDO...'
              : 'ACEITAR MISSÃO'}

          </button>

        )}

        {/* MISSÃO EM ANDAMENTO */}

        {mode === 'mine' && (

          <>

            <button
              className="party-details-button"
              onClick={() =>
                openParty(
                  mission
                )
              }
            >

              {isLeader
                ? '👥 GERENCIAR PARTY'
                : '👥 VER PARTY'}

            </button>

            {membership?.completed ? (

              <div className="my-part-completed">

                ✓ SUA PARTE FOI CONCLUÍDA

                <small>
                  Aguardando os demais membros.
                </small>

              </div>

            ) : (

              <button
                className="
                  complete-mission-button
                  complete-mission-active
                "
                onClick={() =>
                  completeMission(
                    mission
                  )
                }
                disabled={
                  completingMissionId ===
                  mission.id
                }
              >

                {completingMissionId ===
                mission.id
                  ? 'CONCLUINDO...'
                  : '✓ CONCLUÍ MINHA PARTE'}

              </button>

            )}

          </>

        )}

        {/* CONCLUÍDA */}

        {mode === 'completed' && (

          <>

            <div className="completed-mission-seal">
              ✓ MISSÃO CONCLUÍDA
            </div>

            <span className="completed-reward-text">
              Recompensas distribuídas
            </span>

          </>

        )}

      </article>
    )
  }

  /* =======================================================
     MISSÕES DA ABA
  ======================================================= */

  const visibleMissions =
    activeTab === 'board'
      ? boardMissions
      : activeTab === 'mine'
        ? myMissions
        : activeTab ===
            'completed'
          ? completedMissions
          : []

  /* =======================================================
     CONTADOR DO STATUS
  ======================================================= */

  function currentCount() {
    if (
      activeTab === 'board'
    ) {
      return boardMissions.length
    }

    if (
      activeTab === 'mine'
    ) {
      return myMissions.length
    }

    if (
      activeTab === 'invites'
    ) {
      return invites.length
    }

    return completedMissions.length
  }

  function currentLabel() {
    if (
      activeTab === 'board'
    ) {
      return 'MISSÕES DISPONÍVEIS'
    }

    if (
      activeTab === 'mine'
    ) {
      return 'MISSÕES ATIVAS'
    }

    if (
      activeTab === 'invites'
    ) {
      return 'CONVITES DE PARTY'
    }

    return 'MISSÕES CONCLUÍDAS'
  }

  /* =======================================================
     INTERFACE
  ======================================================= */

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
              Enfrente desafios sozinho
              ou forme uma Party com seus amigos.
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

        {/* =================================================
            ABAS
        ================================================= */}

        <nav className="mission-tabs mission-tabs-four">

          {/* QUADRO */}

          <button
            className={
              activeTab ===
              'board'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab(
                'board'
              )
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
                {boardMissions.length}
                {' '}
                disponíveis
              </small>

            </div>

          </button>

          {/* MINHAS */}

          <button
            className={
              activeTab ===
              'mine'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab(
                'mine'
              )
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
                {myMissions.length}
                {' '}
                em andamento
              </small>

            </div>

          </button>

          {/* CONVITES */}

          <button
            className={
              activeTab ===
              'invites'
                ? 'mission-tab active'
                : 'mission-tab'
            }
            onClick={() => {
              setMessage('')
              setSuccessMessage('')
              setActiveTab(
                'invites'
              )
            }}
          >

            <span>
              ✉
            </span>

            <div>

              <strong>
                CONVITES
              </strong>

              <small>
                {invites.length}
                {' '}
                pendentes
              </small>

            </div>

          </button>

          {/* CONCLUÍDAS */}

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
                {completedMissions.length}
                {' '}
                finalizadas
              </small>

            </div>

          </button>

        </nav>

        {/* =================================================
            STATUS DO QUADRO
        ================================================= */}

        <section className="mission-board-info">

          <div>

            <span>
              {currentLabel()}
            </span>

            <strong>
              {currentCount()}
            </strong>

          </div>

          <div className="mission-board-status">

            <span className="status-light" />

            QUADRO ATIVO

          </div>

        </section>

        {/* MENSAGENS */}

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

        {/* =================================================
            CONVITES
        ================================================= */}

        {activeTab ===
          'invites' ? (

          <section className="mission-invites-section">

            {loading ? (

              <div className="mission-loading">
                Carregando convites...
              </div>

            ) : invites.length ===
                0 ? (

              <section className="empty-mission-board">

                <div className="empty-mission-icon">
                  ✉
                </div>

                <h2>
                  Nenhum convite de Party
                </h2>

                <p>
                  Quando um amigo chamar
                  você para uma missão,
                  o convite aparecerá aqui.
                </p>

              </section>

            ) : (

              <div className="mission-invite-list">

                {invites.map(
                  (invite) => {
                    const percentage =
                      Number(
                        invite.reward_percentage
                      )

                    const gold =
                      calculateShare(
                        invite.gold_reward,
                        percentage
                      )

                    const platinum =
                      calculateShare(
                        invite.platinum_reward,
                        percentage
                      )

                    return (
                      <article
                        key={
                          invite.mission_id
                        }
                        className="mission-invite-card"
                      >

                        {/* LÍDER */}

                        <div className="invite-leader">

                          <div className="invite-leader-avatar">

                            {renderAvatar(
                              invite.leader_avatar_url,
                              invite.leader_name
                            )}

                          </div>

                          <div>

                            <span>
                              CONVITE DE PARTY
                            </span>

                            <strong>
                              {invite.leader_name}
                            </strong>

                            <small>

                              {invite.leader_nickname
                                ? `@${invite.leader_nickname}`
                                : 'Líder da Party'}

                            </small>

                          </div>

                        </div>

                        {/* MISSÃO */}

                        <h2>
                          {invite.title}
                        </h2>

                        <p>
                          {invite.description ||
                            'Sem descrição.'}
                        </p>

                        {/* RECOMPENSA */}

                        <div className="invite-share">

                          <div>

                            <span>
                              SUA PARTE
                            </span>

                            <strong>
                              {percentage}%
                            </strong>

                          </div>

                          <div>

                            <span>
                              ◉ GOLD
                            </span>

                            <strong>
                              {formatValue(
                                gold
                              )}
                            </strong>

                          </div>

                          <div>

                            <span>
                              ◆ PLATINUM
                            </span>

                            <strong>
                              {formatValue(
                                platinum
                              )}
                            </strong>

                          </div>

                        </div>

                        {/* AÇÕES */}

                        <div className="mission-invite-actions">

                          <button
                            className="accept-party-invite"
                            onClick={() =>
                              respondMissionInvite(
                                invite,
                                true
                              )
                            }
                            disabled={
                              respondingInviteId ===
                              invite.mission_id
                            }
                          >

                            {respondingInviteId ===
                            invite.mission_id
                              ? 'AGUARDE...'
                              : '✓ ACEITAR PARTY'}

                          </button>

                          <button
                            className="decline-party-invite"
                            onClick={() =>
                              respondMissionInvite(
                                invite,
                                false
                              )
                            }
                            disabled={
                              respondingInviteId ===
                              invite.mission_id
                            }
                          >
                            ✕ RECUSAR
                          </button>

                        </div>

                      </article>
                    )
                  }
                )}

              </div>

            )}

          </section>

        ) : loading ? (

          <div className="mission-loading">
            Carregando missões...
          </div>

        ) : visibleMissions.length ===
            0 ? (

          /* =================================================
             VAZIO
          ================================================= */

          <section className="empty-mission-board">

            <div className="empty-mission-icon">

              {activeTab ===
              'board'
                ? '⚔'
                : activeTab ===
                    'mine'
                  ? '🛡'
                  : '★'}

            </div>

            <h2>

              {activeTab ===
              'board'
                ? 'Nenhuma missão disponível'
                : activeTab ===
                    'mine'
                  ? 'Nenhuma missão ativa'
                  : 'Nenhuma missão concluída'}

            </h2>

            <p>

              {activeTab ===
              'board'
                ? 'A Guilda está tranquila... por enquanto.'
                : activeTab ===
                    'mine'
                  ? 'Aceite uma missão ou aguarde um convite de Party.'
                  : 'Suas conquistas aparecerão aqui.'}

            </p>

          </section>

        ) : (

          /* =================================================
             GRID
          ================================================= */

          <section className="mission-grid">

            {visibleMissions.map(
              (mission) =>
                renderMissionCard(
                  mission,
                  activeTab as
                    | 'board'
                    | 'mine'
                    | 'completed'
                )
            )}

          </section>

        )}

      </div>

      {/* =====================================================
          MODAL NOVA MISSÃO
      ===================================================== */}

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
                    value={
                      goldReward
                    }
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

      {/* =====================================================
          MODAL PARTY
      ===================================================== */}

      {showPartyModal &&
        partyMission && (

        <div
          className="mission-modal-overlay"
          onMouseDown={() =>
            setShowPartyModal(
              false
            )
          }
        >

          <section
            className="party-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="mission-modal-header">

              <div>

                <span>
                  PARTY DA MISSÃO
                </span>

                <h2>
                  {partyMission.title}
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowPartyModal(
                    false
                  )
                }
              >
                ✕
              </button>

            </div>

            {partyLoading ? (

              <div className="mission-loading">
                Reunindo a Party...
              </div>

            ) : (

              <>

                {/* =========================================
                    PARTY ATUAL
                ========================================= */}

                <div className="party-current-section">

                  <span className="party-section-label">
                    PARTY ATUAL
                  </span>

                  <div className="party-members-list">

                    {partyMembers.map(
                      (member) => (

                        <div
                          key={
                            member.user_id
                          }
                          className="party-member-row"
                        >

                          <div className="party-member-avatar">

                            {renderAvatar(
                              member.avatar_url,
                              member.name
                            )}

                          </div>

                          <div className="party-member-name">

                            <strong>

                              {member.role ===
                              'leader'
                                ? '👑 '
                                : ''}

                              {member.name}

                            </strong>

                            <span>

                              {member.nickname
                                ? `@${member.nickname}`
                                : member.role ===
                                    'leader'
                                  ? 'Líder'
                                  : 'Membro'}

                            </span>

                          </div>

                          <div className="party-member-percent">

                            {Number(
                              member.reward_percentage
                            )}
                            %

                          </div>

                          <div
                            className={`
                              party-member-status
                              status-${member.status}
                            `}
                          >

                            {member.status ===
                              'accepted' &&
                              (
                                member.completed
                                  ? '✓ CONCLUÍDO'
                                  : '✓ ACEITO'
                              )}

                            {member.status ===
                              'invited' &&
                              '⏳ CONVIDADO'}

                            {member.status ===
                              'declined' &&
                              '✕ RECUSOU'}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

                {/* =========================================
                    SOMENTE LÍDER EDITA
                ========================================= */}

                {partyMission.claimed_by ===
                  currentUserId && (

                  <>

                    <div className="party-divider" />

                    <span className="party-section-label">
                      DIVIDIR RECOMPENSAS
                    </span>

                    {/* LÍDER */}

                    <div className="party-percentage-row leader-party-row">

                      <div>

                        <strong>
                          👑 VOCÊ
                        </strong>

                        <small>
                          Líder da Party
                        </small>

                      </div>

                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={
                          leaderPercentage
                        }
                        onChange={(event) =>
                          setLeaderPercentage(
                            event.target.value
                          )
                        }
                      />

                      <span>
                        %
                      </span>

                    </div>

                    {/* =====================================
                        AMIGOS
                    ===================================== */}

                    <div className="party-friends-list">

                      {partySelections.length ===
                        0 ? (

                        <div className="party-no-friends">

                          Você ainda não
                          possui amigos
                          disponíveis para
                          convidar.

                        </div>

                      ) : (

                        partySelections.map(
                          (friend) => (

                            <div
                              key={
                                friend.user_id
                              }
                              className={`
                                party-friend-select
                                ${
                                  friend.selected
                                    ? 'selected'
                                    : ''
                                }
                              `}
                            >

                              <button
                                type="button"
                                className="party-friend-toggle"
                                onClick={() =>
                                  toggleFriend(
                                    friend.user_id
                                  )
                                }
                              >

                                <span>

                                  {friend.selected
                                    ? '✓'
                                    : '+'}

                                </span>

                              </button>

                              <div className="party-member-avatar">

                                {renderAvatar(
                                  friend.avatar_url,
                                  friend.name
                                )}

                              </div>

                              <div className="party-member-name">

                                <strong>
                                  {friend.name}
                                </strong>

                                <span>

                                  {friend.nickname
                                    ? `@${friend.nickname}`
                                    : 'Amigo'}

                                </span>

                              </div>

                              {friend.selected && (

                                <div className="party-percentage-input">

                                  <input
                                    type="number"
                                    min="0.01"
                                    max="100"
                                    step="0.01"
                                    placeholder="0"
                                    value={
                                      friend.percentage
                                    }
                                    onChange={(event) =>
                                      changeFriendPercentage(
                                        friend.user_id,
                                        event.target.value
                                      )
                                    }
                                  />

                                  <span>
                                    %
                                  </span>

                                </div>

                              )}

                            </div>

                          )
                        )

                      )}

                    </div>

                    {/* =====================================
                        TOTAL
                    ===================================== */}

                    <div
                      className={`
                        party-total
                        ${
                          Math.abs(
                            partyTotal -
                            100
                          ) <
                          0.001
                            ? 'valid'
                            : 'invalid'
                        }
                      `}
                    >

                      <span>
                        TOTAL DA DIVISÃO
                      </span>

                      <strong>
                        {partyTotal.toFixed(
                          2
                        )}
                        %
                      </strong>

                    </div>

                    {/* =====================================
                        PREVIEW
                    ===================================== */}

                    <div className="party-reward-preview">

                      <h3>
                        PREVISÃO DE RECOMPENSAS
                      </h3>

                      {/* LÍDER */}

                      <div className="party-preview-row">

                        <span>
                          👑 Você
                        </span>

                        <strong>
                          {Number(
                            leaderPercentage
                          ) || 0}
                          %
                        </strong>

                        <span>
                          ◉{' '}
                          {formatValue(
                            calculateShare(
                              partyMission.gold_reward,
                              Number(
                                leaderPercentage
                              ) || 0
                            )
                          )}
                        </span>

                        <span>
                          ◆{' '}
                          {formatValue(
                            calculateShare(
                              partyMission.platinum_reward,
                              Number(
                                leaderPercentage
                              ) || 0
                            )
                          )}
                        </span>

                      </div>

                      {/* AMIGOS */}

                      {partySelections
                        .filter(
                          (friend) =>
                            friend.selected
                        )
                        .map(
                          (friend) => {
                            const pct =
                              Number(
                                friend.percentage
                              ) || 0

                            return (
                              <div
                                key={
                                  friend.user_id
                                }
                                className="party-preview-row"
                              >

                                <span>
                                  👤 {friend.name}
                                </span>

                                <strong>
                                  {pct}%
                                </strong>

                                <span>
                                  ◉{' '}
                                  {formatValue(
                                    calculateShare(
                                      partyMission.gold_reward,
                                      pct
                                    )
                                  )}
                                </span>

                                <span>
                                  ◆{' '}
                                  {formatValue(
                                    calculateShare(
                                      partyMission.platinum_reward,
                                      pct
                                    )
                                  )}
                                </span>

                              </div>
                            )
                          }
                        )}

                    </div>

                    {/* =====================================
                        SALVAR
                    ===================================== */}

                    <button
                      className="save-party-button"
                      onClick={
                        saveParty
                      }
                      disabled={
                        savingParty ||
                        Math.abs(
                          partyTotal -
                          100
                        ) >
                          0.001
                      }
                    >

                      {savingParty
                        ? 'ENVIANDO CONVITES...'
                        : partySelections.some(
                            (friend) =>
                              friend.selected
                          )
                          ? '⚔ SALVAR PARTY E ENVIAR CONVITES'
                          : '⚔ MANTER MISSÃO SOLO'}

                    </button>

                  </>

                )}

              </>

            )}

          </section>

        </div>

      )}

    </main>
  )
}

export default Missions