import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const URL_GENERAR  = import.meta.env.VITE_OTP_GENERAR_URL
const URL_VERIFICAR = import.meta.env.VITE_OTP_VERIFICAR_URL

const TIMER_SEGUNDOS = 600 // 10 minutos

export default function LoginCliente({ onClienteLogin }) {
  const navigate = useNavigate()

  const [paso, setPaso]       = useState('email')
  const [email, setEmail]     = useState('')
  const [codigo, setCodigo]   = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)   // { tipo: 'error'|'info', texto }
  const [timerSecs, setTimerSecs]   = useState(TIMER_SEGUNDOS)
  const [timerActivo, setTimerActivo] = useState(false)
  const intervalRef = useRef(null)

  // Countdown — arranca cuando timerActivo = true
  useEffect(() => {
    if (!timerActivo) return
    intervalRef.current = setInterval(() => {
      setTimerSecs((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setTimerActivo(false)
          setMsg({ tipo: 'error', texto: 'El código expiró. Volvé atrás y solicitá uno nuevo.' })
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timerActivo])

  function formatTimer(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // ── Paso 1: solicitar OTP ─────────────────────────────────
  async function solicitarCodigo(e) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      const r = await fetch(URL_GENERAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await r.json()
      if (data.ok) {
        setPaso('codigo')
        setCodigo('')
        setTimerSecs(TIMER_SEGUNDOS)
        setTimerActivo(true)
      } else {
        setMsg({ tipo: 'error', texto: data.mensaje || 'No se pudo enviar el código.' })
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar. Verificá tu conexión.' })
    }
    setLoading(false)
  }

  // ── Paso 2: verificar OTP ─────────────────────────────────
  async function verificarCodigo(e) {
    e.preventDefault()
    if (codigo.length !== 6) {
      setMsg({ tipo: 'error', texto: 'El código debe tener 6 dígitos.' })
      return
    }
    setMsg(null)
    setLoading(true)
    try {
      const r = await fetch(URL_VERIFICAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo }),
      })
      const data = await r.json()
      if (data.ok) {
        clearInterval(intervalRef.current)
        setTimerActivo(false)
        onClienteLogin({
          email: data.email || email,
          nombre_completo: data.nombre_completo || data.nombre || data.email || email,
        })
        navigate('/mis-cotizaciones', { replace: true })
      } else {
        setMsg({ tipo: 'error', texto: data.mensaje || 'Código incorrecto.' })
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar. Verificá tu conexión.' })
    }
    setLoading(false)
  }

  function volverEmail() {
    clearInterval(intervalRef.current)
    setTimerActivo(false)
    setCodigo('')
    setMsg(null)
    setPaso('email')
  }

  return (
    <>
      <div className="bg-illustration" />
      <div className="login-page">
        <div className="login-card">

          <div className="login-logo">
            <img src="/assets/logo.png" alt="TechSource Solutions" />
          </div>

          {/* ── PANTALLA 1: EMAIL ─────────────────────────── */}
          {paso === 'email' && (
            <>
              <h2>Iniciar sesión</h2>
              <p className="login-subtitle">Ingresá tu correo para ver tus cotizaciones</p>

              {msg && <div className={`login-msg login-msg-${msg.tipo}`}>{msg.texto}</div>}

              <form className="login-form" onSubmit={solicitarCodigo}>
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Continuar →'}
                </button>
              </form>
            </>
          )}

          {/* ── PANTALLA 2: CÓDIGO OTP ────────────────────── */}
          {paso === 'codigo' && (
            <>
              <h2>Verificar identidad</h2>
              <p className="login-subtitle">
                Enviamos un código de 6 dígitos a<br />
                <strong>{email}</strong>
              </p>

              {msg && <div className={`login-msg login-msg-${msg.tipo}`}>{msg.texto}</div>}

              <form className="login-form" onSubmit={verificarCodigo}>
                <input
                  className="otp-codigo-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                  autoComplete="one-time-code"
                />
                <button
                  className="login-btn"
                  type="submit"
                  disabled={loading || timerSecs === 0 || codigo.length !== 6}
                >
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>

              <div className="otp-timer">
                {timerSecs > 0
                  ? <>El código expira en <span>{formatTimer(timerSecs)}</span></>
                  : <span className="otp-timer-expired">Código expirado</span>
                }
              </div>

              <button className="login-back-btn" onClick={volverEmail} type="button">
                ← Cambiar correo
              </button>
            </>
          )}

        </div>
      </div>
    </>
  )
}
