import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'

const app = express()
app.use(cors({ origin: '*' }))
app.get('/', (_req, res) => res.json({ service: 'USTRP PTFS Socket.IO', status: 'online' }))
app.get('/health', (_req, res) => res.json({ ok: true }))
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } })

let reports = []
let messages = []
let permissionRequests = []
const MAX_REPORTS = 250
const MAX_MESSAGES = 500

io.on('connection', socket => {
  socket.emit('reports:init', reports)
  socket.emit('chat:init', messages)
  socket.on('chat:join', frequency => {
    for (const room of socket.rooms) if (room !== socket.id && room.startsWith('freq:')) socket.leave(room)
    socket.join(`freq:${String(frequency).slice(0, 20)}`)
    socket.emit('chat:init', messages.filter(m => m.frequency === frequency))
  })
  socket.on('report:new', report => {
    if (!report || typeof report !== 'object') return
    const clean = {
      id: String(report.id || Date.now()).slice(0, 80),
      callsign: String(report.callsign || 'UNKNOWN').slice(0, 24),
      aircraft: String(report.aircraft || 'Unknown').slice(0, 40),
      altitude: String(report.altitude ?? '').slice(0, 12),
      speed: String(report.speed ?? '').slice(0, 12),
      heading: String(report.heading ?? '').slice(0, 12),
      note: String(report.note || '').slice(0, 500),
      frequency: String(report.frequency || '118.000').slice(0, 20),
      x: Math.max(0, Math.min(100, Number(report.x) || 0)),
      y: Math.max(0, Math.min(100, Number(report.y) || 0)),
      createdAt: new Date().toISOString()
    }
    reports = [clean, ...reports.filter(r => r.id !== clean.id)].slice(0, MAX_REPORTS)
    io.emit('report:new', clean)
  })
  socket.on('report:delete', id => {
    reports = reports.filter(r => r.id !== String(id))
    io.emit('report:delete', String(id))
  })
  socket.on('chat:new', message => {
    if (!message || !String(message.text || '').trim()) return
    const clean = {
      id: String(message.id || Date.now()).slice(0, 80),
      callsign: String(message.callsign || 'UNKNOWN').slice(0, 24),
      text: String(message.text).trim().slice(0, 500),
      frequency: String(message.frequency || '118.000').slice(0, 20),
      createdAt: new Date().toISOString()
    }
    messages.push(clean)
    messages = messages.slice(-MAX_MESSAGES)
    io.to(`freq:${clean.frequency}`).emit('chat:new', clean)
  })
  socket.on('permission:new', request => {
    if (!request || typeof request !== 'object') return
    const clean = {
      id: String(request.id || Date.now()).slice(0, 80),
      callsign: String(request.callsign || 'UNKNOWN').slice(0, 24),
      frequency: String(request.frequency || '118.000').slice(0, 20),
      permission: String(request.permission || 'Yayın izni').slice(0, 100),
      status: 'Bekliyor',
      createdAt: new Date().toISOString()
    }
    permissionRequests = [clean, ...permissionRequests].slice(0, 200)
    io.emit('permission:new', clean)
  })
  socket.on('permission:update', request => {
    if (!request?.id) return
    permissionRequests = permissionRequests.map(p => p.id === request.id ? { ...p, status: String(request.status || 'Bekliyor').slice(0, 30) } : p)
    const updated = permissionRequests.find(p => p.id === request.id)
    if (updated) io.emit('permission:update', updated)
  })
})
const port = process.env.PORT || 3001
server.listen(port, '0.0.0.0', () => console.log(`USTRP Socket.IO listening on ${port}`))
