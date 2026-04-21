import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const WEBHOOK_URL = import.meta.env.VITE_CHATBOT_WEBHOOK

export default function ChatWidget({ clienteSession }) {
  const [abierto, setAbierto]       = useState(false)
  const [mensajes, setMensajes]     = useState([])
  const [historial, setHistorial]   = useState([])
  const [input, setInput]           = useState('')
  const [cargando, setCargando]     = useState(false)
  const [notif, setNotif]           = useState(false)
  const [iniciado, setIniciado]     = useState(false)
  const [email, setEmail]           = useState(clienteSession?.email || null)
  const msgsRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (clienteSession?.email) setEmail(clienteSession.email)
  }, [clienteSession])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [mensajes, cargando])

  function hora() {
    return new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  function addMsg(tipo, texto) {
    setMensajes((prev) => [...prev, { tipo, texto, hora: hora() }])
  }

  function toggle() {
    setAbierto((v) => {
      if (!v && !iniciado) {
        setIniciado(true)
        setTimeout(() => addMsg('bot',
          'Hola! Soy TechBot, el asistente de TechSource Supplier.\n\n' +
          'Puedo ayudarte a:\n- Consultar el catálogo de productos\n' +
          '- Generar una cotización\n- Ver tu historial de cotizaciones\n\n' +
          (clienteSession ? `Hola ${clienteSession.nombre_completo || clienteSession.email}! ¿En qué te puedo ayudar?` : '¿En qué te puedo ayudar hoy?')
        ), 350)
      }
      if (!v) setTimeout(() => inputRef.current?.focus(), 450)
      setNotif(false)
      return !v
    })
  }

  async function enviar(textoForzado) {
    if (cargando) return
    const texto = (textoForzado || input).trim()
    if (!texto) return

    setInput('')
    addMsg('user', texto)

    const emailDetectado = texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailDetectado) setEmail(emailDetectado[0])

    const nuevoHistorial = [...historial, { rol: 'user', texto }]
    setHistorial(nuevoHistorial)
    setCargando(true)

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: nuevoHistorial.slice(-10),
          email: email || clienteSession?.email || null,
        }),
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)

      const data = await res.json()
      const resp = data.respuesta || 'Hubo un error. Por favor intentá de nuevo.'
      addMsg('bot', resp)
      setHistorial((prev) => [...prev, { rol: 'assistant', texto: resp }])

      if (!abierto) setNotif(true)
    } catch {
      addMsg('bot', 'No pude conectarme en este momento. Verificá tu conexión e intentá de nuevo.')
    }

    setCargando(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <>
      {/* FAB */}
      <button
        className={`chat-fab${abierto ? ' open' : ''}`}
        onClick={toggle}
        title="Chat TechBot"
      >
        <svg className="chat-fab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <svg className="chat-fab-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        {notif && <span className="chat-notif">1</span>}
      </button>

      {/* Panel */}
      <div className={`chat-panel${abierto ? ' open' : ''}`}>

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className={`chat-avatar${cargando ? ' thinking' : ''}`}>TB</div>
            <div>
              <h3>TechBot</h3>
              <p>{cargando ? 'Escribiendo...' : 'Asistente de TechSource'}</p>
            </div>
          </div>
          <button className="chat-header-close" onClick={toggle}>✕</button>
        </div>

        {/* Mensajes */}
        <div className="chat-msgs" ref={msgsRef}>
          {mensajes.map((m, i) => (
            <div key={i} className={`chat-msg ${m.tipo}`}>
              <div className="chat-msg-bubble">{m.texto}</div>
              <div className="chat-msg-time">{m.hora}</div>
            </div>
          ))}
          {cargando && (
            <div className="chat-msg bot">
              <div className="chat-typing">
                <span/><span/><span/>
              </div>
            </div>
          )}
        </div>

        {/* Sugerencias */}
        {mensajes.length <= 1 && (
          <div className="chat-suggs">
            <button className="chat-sq" onClick={() => enviar('¿Qué laptops tienen disponibles?')}>💻 Ver laptops</button>
            <button className="chat-sq" onClick={() => { toggle(); navigate('/cotizar') }}>📋 Cotizar</button>
            {clienteSession
              ? <button className="chat-sq" onClick={() => { toggle(); navigate('/mis-cotizaciones') }}>📄 Mis cotizaciones</button>
              : <button className="chat-sq" onClick={() => enviar('¿Qué productos tienen bajo $500?')}>💰 Bajo $500</button>
            }
            <button className="chat-sq" onClick={() => enviar('¿Cuánto demora una cotización?')}>⏱ Tiempos</button>
          </div>
        )}

        {/* Input */}
        <div className="chat-input-row">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Escribí tu pregunta..."
            value={input}
            maxLength={500}
            disabled={cargando}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          />
          <button className="chat-send" onClick={() => enviar()} disabled={cargando || !input.trim()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    </>
  )
}
