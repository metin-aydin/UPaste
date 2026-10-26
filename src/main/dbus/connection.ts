// Unix soketi üzerinden D-Bus bağlantısı: EXTERNAL kimlik doğrulama, yöntem çağrısı, sinyal dinleme ve nesne
// yayımlama. Yalnız UPaste'in ihtiyaç duyduğu kadarını yapar (dosya tanıtıcısı aktarımı yok).
import { EventEmitter } from 'events'
import { createConnection, type Socket } from 'net'
import {
  decodeMessage,
  encodeMessage,
  messageLength,
  MessageType,
  NO_REPLY_EXPECTED,
  type Message
} from './wire'

export class DBusError extends Error {
  constructor(
    readonly name: string,
    message: string
  ) {
    super(message || name)
  }
}

export interface CallOptions {
  destination: string
  path: string
  interface: string
  member: string
  signature?: string
  body?: unknown[]
  timeout?: number
}

export interface SignalOptions {
  destination?: string
  path: string
  interface: string
  member: string
  signature?: string
  body?: unknown[]
}

export interface MethodSpec {
  in?: string
  out?: string
  handler: (args: unknown[], msg: Message) => unknown[] | void | Promise<unknown[] | void>
}

export interface InterfaceSpec {
  name: string
  methods: Record<string, MethodSpec>
  signals?: Record<string, string>
}

interface Pending {
  resolve: (body: unknown[]) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

const DEFAULT_TIMEOUT = 25_000

/** `unix:path=…` ya da `unix:abstract=…` adresini soket yoluna çevirir. */
export function socketPath(address: string): string {
  for (const part of address.split(';')) {
    const [transport, rest = ''] = part.split(':', 2)
    if (transport !== 'unix') continue
    const params = new Map(
      rest.split(',').map((kv) => {
        const i = kv.indexOf('=')
        return [kv.slice(0, i), decodeURIComponent(kv.slice(i + 1))] as const
      })
    )
    if (params.get('path')) return params.get('path')!
    if (params.get('abstract')) return '\0' + params.get('abstract')
  }
  throw new Error(`Unsupported D-Bus address: ${address}`)
}

export class DBusConnection extends EventEmitter {
  uniqueName = ''
  private serial = 1
  private pending = new Map<number, Pending>()
  private objects = new Map<string, Map<string, InterfaceSpec>>()
  private input = Buffer.alloc(0)
  private closed = false

  private constructor(private readonly socket: Socket) {
    super()
  }

  static connect(address: string): Promise<DBusConnection> {
    return new Promise((resolve, reject) => {
      const socket = createConnection(socketPath(address))
      const conn = new DBusConnection(socket)
      let auth = ''
      let authenticated = false
      const fail = (err: Error): void => {
        socket.destroy()
        reject(err)
      }
      socket.once('error', fail)
      socket.once('connect', () => {
        const uid = Buffer.from(String(process.getuid?.() ?? 0)).toString('hex')
        socket.write(Buffer.concat([Buffer.from([0]), Buffer.from(`AUTH EXTERNAL ${uid}\r\n`)]))
      })
      socket.on('data', (chunk: Buffer) => {
        if (authenticated) {
          conn.receive(chunk)
          return
        }
        auth += chunk.toString('latin1')
        const end = auth.indexOf('\r\n')
        if (end < 0) return
        const line = auth.slice(0, end)
        if (!line.startsWith('OK ')) {
          fail(new Error(`D-Bus authentication failed: ${line}`))
          return
        }
        authenticated = true
        socket.write('BEGIN\r\n')
        socket.off('error', fail)
        socket.on('error', (err) => conn.emit('error', err))
        socket.on('close', () => conn.handleClose())
        const rest = Buffer.from(auth.slice(end + 2), 'latin1')
        if (rest.length) conn.receive(rest)
        conn
          .call({
            destination: 'org.freedesktop.DBus',
            path: '/org/freedesktop/DBus',
            interface: 'org.freedesktop.DBus',
            member: 'Hello'
          })
          .then(([name]) => {
            conn.uniqueName = name as string
            resolve(conn)
          }, fail)
      })
    })
  }

  get isClosed(): boolean {
    return this.closed
  }

  close(): void {
    this.socket.end()
    this.socket.destroy()
    this.handleClose()
  }

  call(opts: CallOptions): Promise<unknown[]> {
    if (this.closed) return Promise.reject(new Error('D-Bus connection is closed'))
    const serial = this.serial++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(serial)
        reject(new DBusError('org.freedesktop.DBus.Error.Timeout', `${opts.member} timed out`))
      }, opts.timeout ?? DEFAULT_TIMEOUT)
      this.pending.set(serial, { resolve, reject, timer })
      this.send({
        type: MessageType.MethodCall,
        flags: 0,
        serial,
        destination: opts.destination,
        path: opts.path,
        interface: opts.interface,
        member: opts.member,
        signature: opts.signature,
        body: opts.body ?? []
      })
    })
  }

  signal(opts: SignalOptions): void {
    this.send({
      type: MessageType.Signal,
      flags: NO_REPLY_EXPECTED,
      serial: this.serial++,
      destination: opts.destination,
      path: opts.path,
      interface: opts.interface,
      member: opts.member,
      signature: opts.signature,
      body: opts.body ?? []
    })
  }

  private busCall(member: string, signature: string, body: unknown[]): Promise<unknown[]> {
    return this.call({
      destination: 'org.freedesktop.DBus',
      path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus',
      member,
      signature,
      body
    })
  }

  addMatch(rule: string): Promise<unknown[]> {
    return this.busCall('AddMatch', 's', [rule])
  }

  removeMatch(rule: string): Promise<unknown[]> {
    return this.busCall('RemoveMatch', 's', [rule])
  }

  /** Adı ister; 1 (birincil sahip) ya da 4 (zaten sahibi) başarı demektir. */
  async requestName(name: string, flags = 0): Promise<number> {
    const [result] = await this.busCall('RequestName', 'su', [name, flags])
    return result as number
  }

  async nameHasOwner(name: string): Promise<boolean> {
    const [has] = await this.busCall('NameHasOwner', 's', [name])
    return has as boolean
  }

  async pidOf(name: string): Promise<number> {
    const [pid] = await this.busCall('GetConnectionUnixProcessID', 's', [name])
    return pid as number
  }

  exportInterface(path: string, spec: InterfaceSpec): void {
    let ifaces = this.objects.get(path)
    if (!ifaces) this.objects.set(path, (ifaces = new Map()))
    ifaces.set(spec.name, spec)
  }

  private send(msg: Message): void {
    if (this.closed) return
    this.socket.write(encodeMessage(msg))
  }

  private receive(chunk: Buffer): void {
    this.input = this.input.length ? Buffer.concat([this.input, chunk]) : Buffer.from(chunk)
    for (;;) {
      const length = messageLength(this.input)
      if (length === null || this.input.length < length) return
      const raw = this.input.subarray(0, length)
      this.input = this.input.subarray(length)
      let msg: Message
      try {
        msg = decodeMessage(Buffer.from(raw))
      } catch (err) {
        this.emit('error', err)
        continue
      }
      this.dispatch(msg)
    }
  }

  private dispatch(msg: Message): void {
    if (msg.type === MessageType.MethodReturn || msg.type === MessageType.Error) {
      const pending = msg.replySerial !== undefined ? this.pending.get(msg.replySerial) : undefined
      if (!pending) return
      this.pending.delete(msg.replySerial!)
      clearTimeout(pending.timer)
      if (msg.type === MessageType.MethodReturn) pending.resolve(msg.body)
      else pending.reject(new DBusError(msg.errorName ?? 'Error', String(msg.body[0] ?? '')))
      return
    }
    if (msg.type === MessageType.Signal) {
      this.emit('signal', msg)
      return
    }
    if (msg.type === MessageType.MethodCall) void this.handleCall(msg)
  }

  private reply(call: Message, signature: string | undefined, body: unknown[]): void {
    if (call.flags & NO_REPLY_EXPECTED) return
    this.send({
      type: MessageType.MethodReturn,
      flags: NO_REPLY_EXPECTED,
      serial: this.serial++,
      replySerial: call.serial,
      destination: call.sender,
      signature,
      body
    })
  }

  private replyError(call: Message, name: string, text: string): void {
    if (call.flags & NO_REPLY_EXPECTED) return
    this.send({
      type: MessageType.Error,
      flags: NO_REPLY_EXPECTED,
      serial: this.serial++,
      replySerial: call.serial,
      destination: call.sender,
      errorName: name,
      signature: 's',
      body: [text]
    })
  }

  private async handleCall(msg: Message): Promise<void> {
    const ifaces = this.objects.get(msg.path ?? '')
    if (msg.interface === 'org.freedesktop.DBus.Peer') {
      if (msg.member === 'Ping') this.reply(msg, undefined, [])
      else this.replyError(msg, 'org.freedesktop.DBus.Error.UnknownMethod', 'Unknown method')
      return
    }
    if (msg.interface === 'org.freedesktop.DBus.Introspectable' && msg.member === 'Introspect') {
      this.reply(msg, 's', [this.introspect(msg.path ?? '/')])
      return
    }
    if (!ifaces) {
      this.replyError(msg, 'org.freedesktop.DBus.Error.UnknownObject', `No object at ${msg.path}`)
      return
    }
    const candidates = msg.interface ? [ifaces.get(msg.interface)] : [...ifaces.values()]
    const spec = candidates.find((s) => s?.methods[msg.member ?? ''])
    const method = spec?.methods[msg.member ?? '']
    if (!method) {
      this.replyError(msg, 'org.freedesktop.DBus.Error.UnknownMethod', `No method ${msg.member}`)
      return
    }
    if ((msg.signature ?? '') !== (method.in ?? '')) {
      this.replyError(
        msg,
        'org.freedesktop.DBus.Error.InvalidArgs',
        `Expected signature '${method.in ?? ''}'`
      )
      return
    }
    try {
      const out = (await method.handler(msg.body, msg)) ?? []
      this.reply(msg, method.out || undefined, out)
    } catch (err) {
      const name = err instanceof DBusError ? err.name : 'org.freedesktop.DBus.Error.Failed'
      this.replyError(msg, name, err instanceof Error ? err.message : String(err))
    }
  }

  private introspect(path: string): string {
    const args = (sig: string | undefined, direction: string): string =>
      sig ? `<arg type="${sig}" direction="${direction}"/>` : ''
    const ifaces = [...(this.objects.get(path)?.values() ?? [])]
      .map((spec) => {
        const methods = Object.entries(spec.methods)
          .map(
            ([name, m]) =>
              `<method name="${name}">${args(m.in, 'in')}${args(m.out, 'out')}</method>`
          )
          .join('')
        const signals = Object.entries(spec.signals ?? {})
          .map(
            ([name, sig]) => `<signal name="${name}">${sig ? `<arg type="${sig}"/>` : ''}</signal>`
          )
          .join('')
        return `<interface name="${spec.name}">${methods}${signals}</interface>`
      })
      .join('')
    const prefix = path === '/' ? '/' : path + '/'
    const children = new Set<string>()
    for (const p of this.objects.keys())
      if (p.startsWith(prefix) && p !== path) children.add(p.slice(prefix.length).split('/')[0])
    const nodes = [...children].map((c) => `<node name="${c}"/>`).join('')
    return (
      '<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" ' +
      '"http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">' +
      `<node><interface name="org.freedesktop.DBus.Introspectable"><method name="Introspect">` +
      `<arg type="s" direction="out"/></method></interface>${ifaces}${nodes}</node>`
    )
  }

  private handleClose(): void {
    if (this.closed) return
    this.closed = true
    for (const p of this.pending.values()) {
      clearTimeout(p.timer)
      p.reject(new Error('D-Bus connection closed'))
    }
    this.pending.clear()
    this.emit('close')
  }
}

/** Oturum veri yoluna bağlanır. */
export function connectSessionBus(): Promise<DBusConnection> {
  const address =
    process.env['DBUS_SESSION_BUS_ADDRESS'] || `unix:path=/run/user/${process.getuid?.()}/bus`
  return DBusConnection.connect(address)
}
