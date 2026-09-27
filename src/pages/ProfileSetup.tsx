import { useState } from 'react'
import { supabase } from '../lib/supabase'

type ProfileSetupProps = {
  onCompleted: () => void
}

function ProfileSetup({ onCompleted }: ProfileSetupProps) {
  const [nickname, setNickname] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function selecionarImagem(file: File | null) {
    if (!file) return

    setImage(file)

    const imageUrl = URL.createObjectURL(file)
    setPreview(imageUrl)
  }

  async function salvarPerfil() {
    if (!nickname.trim()) {
      setMessage('Escolha um nickname.')
      return
    }

    if (!image) {
      setMessage('Escolha uma foto de perfil.')
      return
    }

    setLoading(true)
    setMessage('Salvando perfil...')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Usuário não encontrado.')
      setLoading(false)
      return
    }

    const extension =
      image.name.split('.').pop()?.toLowerCase() || 'jpg'

    const fileName =
      `${user.id}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } =
      await supabase.storage
        .from('avatars')
        .upload(fileName, image)

    if (uploadError) {
      console.error(uploadError)

      setMessage('Erro ao enviar a imagem.')
      setLoading(false)
      return
    }

    const { data: publicUrlData } =
      supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

    const avatarUrl = publicUrlData.publicUrl

    const { error: profileError } =
      await supabase
        .from('profiles')
        .update({
          name: nickname.trim(),
          avatar_url: avatarUrl,
          onboarding_completed: true,
        })
        .eq('id', user.id)

    if (profileError) {
      console.error(profileError)

      setMessage('Erro ao salvar o perfil.')
      setLoading(false)
      return
    }

    setMessage('')
    setLoading(false)

    onCompleted()
  }

  return (
    <main className="profile-setup-page">
      <section className="profile-setup-card">

        <div className="profile-setup-header">
          <span className="setup-small">
            PRIMEIRO ACESSO
          </span>

          <h1>Bem-vindo ao GUILDY</h1>

          <p>
            Antes de entrar na Guilda,
            crie sua identidade.
          </p>
        </div>

        <div className="avatar-selector">

          {preview ? (
            <img
              src={preview}
              alt="Prévia do perfil"
              className="setup-avatar"
            />
          ) : (
            <div className="setup-avatar-empty">
              ?
            </div>
          )}

          <label className="image-button">
            Escolher imagem

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) =>
                selecionarImagem(
                  event.target.files?.[0] ?? null
                )
              }
            />
          </label>

        </div>

        <div className="profile-fields">

          <label>
            Nickname
          </label>

          <input
            type="text"
            maxLength={30}
            placeholder="Como será chamado na Guilda?"
            value={nickname}
            onChange={(event) =>
              setNickname(event.target.value)
            }
          />

          <small>
            {nickname.length}/30
          </small>

        </div>

        <button
          className="finish-profile-button"
          onClick={salvarPerfil}
          disabled={loading}
        >
          {loading
            ? 'Criando perfil...'
            : 'Entrar na Guilda'}
        </button>

        {message && (
          <p className="setup-message">
            {message}
          </p>
        )}

      </section>
    </main>
  )
}

export default ProfileSetup