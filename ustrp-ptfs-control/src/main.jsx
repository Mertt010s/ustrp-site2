import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { MapPin, Radio, Send, Shield, Crosshair, Clock3, Plane, MessageSquare, ChevronDown, Wifi, WifiOff, Trash2 } from 'lucide-react'
import './style.css'

const DEFAULT_API = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
const frequencies = ['118.000', '121.500', '124.850', '127.900', '132.000']
const initialReport = { callsign: 'USTRP-01', aircraft: 'F-16', altitude: '12000', speed: '250', heading: '090', note: '' }

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [frequency, setFrequency] = useState('118.000')
  const [messages, setMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [callsign, setCallsign] = useState('USTRP-01')
  const [report, setReport] = useState(initialReport)
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [seconds, setSeconds] = useState(60)
  const [canReport, setCanReport] = useState(true)
  const [mode, setMode] = useState('report')
  const [permissionRequests, setPermissionRequests] = useState([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [lastPointer, setLastPointer] = useState(null)
  const mapRef = useRef(null)
  const [draftPoint, setDraftPoint] = useState(null)

  useEffect(() => {
    const s = io(DEFAULT_API, { transports: ['websocket', 'polling'], reconnection: true })
    setSocket(s)
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('reports:init', setReports)
    s.on('report:new', r => setReports(prev => [r, ...prev.filter(x => x.id !== r.id)]))
    s.on('report:delete', id => setReports(prev => prev.filter(x => x.id !== id)))
    s.on('chat:init', all => setMessages(all))
    s.on('chat:new', m => setMessages(prev => [...prev, m].slice(-150)))
    s.on('permission:new', p => setPermissionRequests(prev => [p, ...prev]))
    s.on('permission:update', p => setPermissionRequests(prev => prev.map(x => x.id === p.id ? p : x)))
    return () => s.disconnect()
  }, [])

  useEffect(() => {
    if (!socket) return
    setMessages([])
    socket.emit('chat:join', frequency)
  }, [socket, frequency])

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { setCanReport(true); return 60 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const updateReport = (key, value) => setReport(prev => ({ ...prev, [key]: value }))
  const onMapClick = e => {
    if (dragging || mode !== 'report' || !mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - pan.x) / (rect.width * zoom)) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - pan.y) / (rect.height * zoom)) * 100))
    setDraftPoint({ x, y })
  }
  const publishReport = () => {
    if (!draftPoint) return alert('Önce haritada crosshair ile bir nokta seç.')
    if (!canReport) return alert('Yeni rapor için sayaç dolmalı.')
    const item = { ...report, x: draftPoint.x, y: draftPoint.y, callsign: callsign || report.callsign, frequency, createdAt: new Date().toISOString(), id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }
    if (socket?.connected) socket.emit('report:new', item)
    else setReports(prev => [item, ...prev])
    setSelected(item)
    setDraftPoint(null)
    setCanReport(false)
    setSeconds(60)
  }
  const sendChat = e => {
    e.preventDefault()
    if (!chatText.trim()) return
    const m = { text: chatText.trim(), callsign, frequency, createdAt: new Date().toISOString(), id: `${Date.now()}-${Math.random()}` }
    if (socket?.connected) socket.emit('chat:new', m)
    else setMessages(prev => [...prev, m])
    setChatText('')
  }
  const requestPermission = () => {
    const p = { id: `${Date.now()}`, callsign, frequency, permission: 'Bu frekansta yayın yapma izni', status: 'Bekliyor', createdAt: new Date().toISOString() }
    if (socket?.connected) socket.emit('permission:new', p)
    setPermissionRequests(prev => [p, ...prev])
  }
  const deleteReport = id => {
    if (socket?.connected) socket.emit('report:delete', id)
    else setReports(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
  }
  const handleWheel = e => setZoom(z => Math.max(1, Math.min(3, z + (e.deltaY < 0 ? 0.1 : -0.1))))
  const startPan = e => { if (e.button !== 0) return; setDragging(false); setLastPointer({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }) }
  const movePan = e => { if (!lastPointer) return; const dx = e.clientX - lastPointer.x, dy = e.clientY - lastPointer.y; if (Math.abs(dx)+Math.abs(dy)>5) setDragging(true); setPan({ x: lastPointer.panX + dx, y: lastPointer.panY + dy }) }
  const endPan = () => { setLastPointer(null); setTimeout(() => setDragging(false), 0) }

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Plane size={22}/></div><div><b>USTRP</b><span>PTFS TACTICAL CONTROL</span></div></div>
      <div className="timer"><Clock3 size={17}/><div><small>SONRAKİ RAPOR</small><strong>00:{String(seconds).padStart(2,'0')}</strong></div><span className={canReport?'ready':'waiting'}>{canReport?'RAPOR HAZIR':'BEKLENİYOR'}</span></div>
      <div className="connection">{connected ? <Wifi size={16}/> : <WifiOff size={16}/>}<span>{connected?'SUNUCU BAĞLI':'YEREL MOD'}</span><i className={connected?'dot online':'dot'} /></div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <div className="section-label">OPERASYON</div>
        <label className="field-label">ÇAĞRI KODUN</label><input value={callsign} onChange={e=>setCallsign(e.target.value)} maxLength={24}/>
        <button className={`nav-item ${mode==='report'?'active':''}`} onClick={()=>setMode('report')}><Crosshair size={17}/> Rapor / İşaret</button>
        <button className={`nav-item ${mode==='permissions'?'active':''}`} onClick={()=>setMode('permissions')}><Shield size={17}/> İzin İstekleri <span className="count">{permissionRequests.filter(p=>p.status==='Bekliyor').length}</span></button>
        <div className="section-label chat-heading"><Radio size={14}/> FREKANS SOHBETİ</div>
        <label className="field-label">AKTİF FREKANS</label>
        <div className="select-wrap"><select value={frequency} onChange={e=>setFrequency(e.target.value)}>{frequencies.map(f=><option key={f} value={f}>{f} MHz</option>)}</select><ChevronDown size={15}/></div>
        <div className="chat-box">
          {messages.map(m=><div className="chat-message" key={m.id}><div><b>{m.callsign}</b><time>{new Date(m.createdAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.text}</p></div>)}
          {!messages.length&&<div className="empty-chat"><MessageSquare size={24}/><span>{frequency} MHz</span><small>Bu frekansta henüz mesaj yok.</small></div>}
        </div>
        <form className="chat-form" onSubmit={sendChat}><input value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Frekansa mesaj yaz..." maxLength={500}/><button title="Gönder"><Send size={16}/></button></form>
        <button className="permission-button" onClick={requestPermission}><Shield size={15}/> Bu frekansta yayın izni iste</button>
        <div className="sidebar-footer"><span className="dot online"/> USTRP CONTROL v1.0 <span>PTFS</span></div>
      </aside>
      <main className="main">
        <div className="map-toolbar"><div><span className="live-pill"><i/> CANLI HARİTA</span><strong>PTFS / ANA OPERASYON HARİTASI</strong></div><div className="map-controls"><button onClick={()=>setZoom(z=>Math.min(3,z+0.2))}>+</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.max(1,z-0.2))}>−</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>SIFIRLA</button></div></div>
        <div className="map-wrap" onWheel={handleWheel} onMouseDown={startPan} onMouseMove={movePan} onMouseUp={endPan} onMouseLeave={endPan}>
          <div className="map-inner" ref={mapRef} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}} onClick={onMapClick}>
            <img className="map-image" src="/ptfs-map.png" alt="PTFS haritası"/>
            {reports.map(r=><button key={r.id} className="map-marker" style={{left:`${r.x}%`,top:`${r.y}%`}} onClick={e=>{e.stopPropagation();setSelected(r)}} title={`${r.callsign} - ${r.altitude} ft`}><span className="marker-pulse"/><span className="marker-card"><b>{r.callsign}</b><span>{Number(r.altitude).toLocaleString('en-US')} ft</span><span>{r.speed} kt · {r.heading}°</span></span></button>)}
            {draftPoint&&<div className="draft-crosshair" style={{left:`${draftPoint.x}%`,top:`${draftPoint.y}%`}}><span/><b>SEÇİLEN NOKTA</b></div>}
          </div>
          <div className="map-hint"><Crosshair size={14}/> Haritada bir nokta seç · Tekerlekle yakınlaştır · Sürükleyerek hareket et</div>
          <div className="map-legend"><span><i className="legend-green"/> USTRP RAPORU</span><span><i className="legend-yellow"/> TASLAK NOKTA</span></div>
        </div>
        <div className="bottom-panel">
          {mode==='permissions' ? <div className="permissions-panel"><div className="panel-title"><Shield size={17}/> FREKANS İZİN İSTEKLERİ</div>{permissionRequests.length===0?<p className="muted">Henüz izin isteği yok.</p>:permissionRequests.map(p=><div className="permission-row" key={p.id}><div><b>{p.callsign}</b><span>{p.frequency} MHz · {p.permission}</span></div><em>{p.status}</em></div>)}</div> :
          <><div className="panel-title"><MapPin size={17}/> MANUEL UÇUŞ RAPORU <span>· {draftPoint?'HARİTA NOKTASI SEÇİLDİ':'HARİTADAN NOKTA SEÇ'}</span></div>
            <div className="report-fields">
              <label>ÇAĞRI KODU<input value={report.callsign} onChange={e=>updateReport('callsign',e.target.value)}/></label>
              <label>UÇAK TİPİ<input value={report.aircraft} onChange={e=>updateReport('aircraft',e.target.value)}/></label>
              <label>İRTİFA (FT)<input type="number" value={report.altitude} onChange={e=>updateReport('altitude',e.target.value)}/></label>
              <label>HIZ (KTS)<input type="number" value={report.speed} onChange={e=>updateReport('speed',e.target.value)}/></label>
              <label>YÖN (°)<input type="number" min="0" max="359" value={report.heading} onChange={e=>updateReport('heading',e.target.value)}/></label>
              <label className="note-field">EK BİLGİ<input value={report.note} onChange={e=>updateReport('note',e.target.value)} placeholder="Örn. kuzeye ilerliyor"/></label>
              <button className="publish-button" disabled={!canReport||!draftPoint} onClick={publishReport}><MapPin size={16}/> İŞARET GÖNDER</button>
            </div>
          </>}
        </div>
      </main>
      <aside className="details">
        <div className="details-title"><span>RAPOR DETAYI</span><span className="tiny-live">LIVE</span></div>
        {selected ? <><div className="selected-aircraft"><div className="aircraft-icon"><Plane size={25}/></div><div><h2>{selected.callsign}</h2><span>{selected.aircraft}</span></div></div>
          <div className="data-grid"><div><small>İRTİFA</small><b>{Number(selected.altitude).toLocaleString('en-US')} <em>FT</em></b></div><div><small>HIZ</small><b>{selected.speed} <em>KTS</em></b></div><div><small>YÖN</small><b>{selected.heading}°</b></div><div><small>FREKANS</small><b>{selected.frequency}</b></div></div>
          <div className="detail-row"><span>RAPOR ZAMANI</span><b>{new Date(selected.createdAt).toLocaleTimeString('tr-TR')}</b></div><div className="detail-row"><span>KOORDİNAT</span><b>{selected.x.toFixed(2)}% / {selected.y.toFixed(2)}%</b></div>
          <div className="extra-info"><small>EK BİLGİ</small><p>{selected.note||'Ek bilgi girilmedi.'}</p></div>
          <button className="delete-button" onClick={()=>deleteReport(selected.id)}><Trash2 size={15}/> İşareti kaldır</button>
        </> : <div className="detail-empty"><Crosshair size={28}/><b>İşaret seçilmedi</b><p>Haritadaki bir rapora tıklayarak uçuş bilgilerini ve detaylarını görüntüle.</p></div>}
        <div className="recent-title">SON RAPORLAR <span>{reports.length}</span></div>
        <div className="recent-list">{reports.slice(0,8).map(r=><button key={r.id} className="recent-item" onClick={()=>setSelected(r)}><span className="recent-icon"><Plane size={14}/></span><span><b>{r.callsign}</b><small>{r.aircraft} · {r.speed} kt</small></span><time>{new Date(r.createdAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time></button>)}
          {!reports.length&&<p className="muted">Henüz rapor gönderilmedi.</p>}</div>
      </aside>
    </div>
  </div>
}
createRoot(document.getElementById('root')).render(<App />)
