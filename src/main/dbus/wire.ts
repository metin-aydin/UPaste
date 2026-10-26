// D-Bus ileti biçimi: imza ayrıştırma, değerlerin ikili kodlanması ve çözülmesi.
// Değer eşlemesi: y n q i u h d → number, x t → bigint, b → boolean, s o g → string, ay → Buffer,
// a{sK} → anahtarları dize olan nesne, diğer sözlükler → Map, diziler → Array, yapılar → Array, v → Variant.

export class Variant {
  constructor(
    readonly signature: string,
    readonly value: unknown
  ) {}
}

export interface DBusType {
  code: string
  children?: DBusType[]
}

const BASIC = 'ybnqiuxtdsogvh'

export function parseSignature(signature: string): DBusType[] {
  let i = 0
  const one = (): DBusType => {
    const c = signature[i++]
    if (c === undefined) throw new Error(`Incomplete D-Bus signature: ${signature}`)
    if (c === 'a') return { code: 'a', children: [one()] }
    if (c === '(') {
      const children: DBusType[] = []
      while (signature[i] !== ')') {
        if (i >= signature.length) throw new Error(`Unclosed struct in signature: ${signature}`)
        children.push(one())
      }
      i++
      return { code: '(', children }
    }
    if (c === '{') {
      const key = one()
      const value = one()
      if (signature[i++] !== '}') throw new Error(`Bad dict entry in signature: ${signature}`)
      return { code: '{', children: [key, value] }
    }
    if (BASIC.includes(c)) return { code: c }
    throw new Error(`Unknown type '${c}' in D-Bus signature: ${signature}`)
  }
  const types: DBusType[] = []
  while (i < signature.length) types.push(one())
  return types
}

const ALIGN: Record<string, number> = {
  y: 1,
  b: 4,
  n: 2,
  q: 2,
  i: 4,
  u: 4,
  x: 8,
  t: 8,
  d: 8,
  s: 4,
  o: 4,
  g: 1,
  a: 4,
  '(': 8,
  '{': 8,
  v: 1,
  h: 4
}

export class Writer {
  private buf = Buffer.alloc(256)
  length = 0

  private ensure(n: number): void {
    if (this.length + n <= this.buf.length) return
    const next = Buffer.alloc(Math.max(this.buf.length * 2, this.length + n))
    this.buf.copy(next, 0, 0, this.length)
    this.buf = next
  }

  align(n: number): void {
    const pad = (n - (this.length % n)) % n
    if (pad === 0) return
    this.ensure(pad)
    this.buf.fill(0, this.length, this.length + pad)
    this.length += pad
  }

  u8(v: number): void {
    this.ensure(1)
    this.buf.writeUInt8(v & 0xff, this.length)
    this.length += 1
  }

  u32(v: number): void {
    this.align(4)
    this.ensure(4)
    this.buf.writeUInt32LE(v >>> 0, this.length)
    this.length += 4
  }

  patchU32(at: number, v: number): void {
    this.buf.writeUInt32LE(v >>> 0, at)
  }

  raw(bytes: Uint8Array): void {
    this.ensure(bytes.length)
    this.buf.set(bytes, this.length)
    this.length += bytes.length
  }

  result(): Buffer {
    return Buffer.from(this.buf.subarray(0, this.length))
  }

  write(type: DBusType, value: unknown): void {
    switch (type.code) {
      case 'y':
        this.u8(Number(value))
        return
      case 'b':
        this.u32(value ? 1 : 0)
        return
      case 'n':
      case 'q':
        this.align(2)
        this.ensure(2)
        if (type.code === 'n') this.buf.writeInt16LE(Number(value), this.length)
        else this.buf.writeUInt16LE(Number(value), this.length)
        this.length += 2
        return
      case 'i':
        this.align(4)
        this.ensure(4)
        this.buf.writeInt32LE(Number(value), this.length)
        this.length += 4
        return
      case 'u':
      case 'h':
        this.u32(Number(value))
        return
      case 'x':
      case 't':
        this.align(8)
        this.ensure(8)
        if (type.code === 'x') this.buf.writeBigInt64LE(BigInt(value as number), this.length)
        else this.buf.writeBigUInt64LE(BigInt(value as number), this.length)
        this.length += 8
        return
      case 'd':
        this.align(8)
        this.ensure(8)
        this.buf.writeDoubleLE(Number(value), this.length)
        this.length += 8
        return
      case 's':
      case 'o': {
        const bytes = Buffer.from(String(value), 'utf8')
        this.u32(bytes.length)
        this.raw(bytes)
        this.u8(0)
        return
      }
      case 'g': {
        const bytes = Buffer.from(String(value), 'utf8')
        this.u8(bytes.length)
        this.raw(bytes)
        this.u8(0)
        return
      }
      case 'v': {
        if (!(value instanceof Variant)) throw new Error('D-Bus variant value must be a Variant')
        const [inner] = parseSignature(value.signature)
        this.write({ code: 'g' }, value.signature)
        this.write(inner, value.value)
        return
      }
      case '(': {
        const items = value as unknown[]
        this.align(8)
        type.children!.forEach((child, i) => this.write(child, items[i]))
        return
      }
      case 'a': {
        const element = type.children![0]
        this.u32(0)
        const lengthAt = this.length - 4
        this.align(ALIGN[element.code])
        const start = this.length
        if (element.code === 'y' && value instanceof Uint8Array) {
          this.raw(value)
        } else if (element.code === '{') {
          const entries =
            value instanceof Map ? [...value.entries()] : Object.entries(value as object)
          for (const [k, v] of entries) {
            this.align(8)
            this.write(element.children![0], k)
            this.write(element.children![1], v)
          }
        } else {
          for (const item of value as unknown[]) this.write(element, item)
        }
        this.patchU32(lengthAt, this.length - start)
        return
      }
      default:
        throw new Error(`Cannot write D-Bus type ${type.code}`)
    }
  }
}

export class Reader {
  constructor(
    private readonly buf: Buffer,
    public pos: number,
    private readonly little: boolean
  ) {}

  align(n: number): void {
    this.pos += (n - (this.pos % n)) % n
  }

  private u32(): number {
    this.align(4)
    const v = this.little ? this.buf.readUInt32LE(this.pos) : this.buf.readUInt32BE(this.pos)
    this.pos += 4
    return v
  }

  read(type: DBusType): unknown {
    const b = this.buf
    const le = this.little
    switch (type.code) {
      case 'y':
        return b.readUInt8(this.pos++)
      case 'b':
        return this.u32() !== 0
      case 'n': {
        this.align(2)
        const v = le ? b.readInt16LE(this.pos) : b.readInt16BE(this.pos)
        this.pos += 2
        return v
      }
      case 'q': {
        this.align(2)
        const v = le ? b.readUInt16LE(this.pos) : b.readUInt16BE(this.pos)
        this.pos += 2
        return v
      }
      case 'i': {
        this.align(4)
        const v = le ? b.readInt32LE(this.pos) : b.readInt32BE(this.pos)
        this.pos += 4
        return v
      }
      case 'u':
      case 'h':
        return this.u32()
      case 'x': {
        this.align(8)
        const v = le ? b.readBigInt64LE(this.pos) : b.readBigInt64BE(this.pos)
        this.pos += 8
        return v
      }
      case 't': {
        this.align(8)
        const v = le ? b.readBigUInt64LE(this.pos) : b.readBigUInt64BE(this.pos)
        this.pos += 8
        return v
      }
      case 'd': {
        this.align(8)
        const v = le ? b.readDoubleLE(this.pos) : b.readDoubleBE(this.pos)
        this.pos += 8
        return v
      }
      case 's':
      case 'o': {
        const len = this.u32()
        const v = b.toString('utf8', this.pos, this.pos + len)
        this.pos += len + 1
        return v
      }
      case 'g': {
        const len = b.readUInt8(this.pos++)
        const v = b.toString('utf8', this.pos, this.pos + len)
        this.pos += len + 1
        return v
      }
      case 'v': {
        const signature = this.read({ code: 'g' }) as string
        const [inner] = parseSignature(signature)
        return new Variant(signature, this.read(inner))
      }
      case '(': {
        this.align(8)
        return type.children!.map((child) => this.read(child))
      }
      case 'a': {
        const len = this.u32()
        const element = type.children![0]
        this.align(ALIGN[element.code])
        const end = this.pos + len
        if (end > b.length) throw new Error('D-Bus array runs past the end of the message')
        if (element.code === 'y') {
          const v = Buffer.from(b.subarray(this.pos, end))
          this.pos = end
          return v
        }
        if (element.code === '{') {
          const [keyType, valueType] = element.children!
          const stringKeys = 'sog'.includes(keyType.code)
          const obj: Record<string, unknown> = Object.create(null)
          const map = new Map<unknown, unknown>()
          while (this.pos < end) {
            this.align(8)
            const k = this.read(keyType)
            const v = this.read(valueType)
            if (stringKeys) obj[k as string] = v
            else map.set(k, v)
          }
          return stringKeys ? obj : map
        }
        const items: unknown[] = []
        while (this.pos < end) items.push(this.read(element))
        return items
      }
      default:
        throw new Error(`Cannot read D-Bus type ${type.code}`)
    }
  }
}

export function encodeBody(signature: string, body: unknown[]): Buffer {
  const w = new Writer()
  parseSignature(signature).forEach((t, i) => w.write(t, body[i]))
  return w.result()
}

/** İçteki Variant'ları değerlerine açar (a{sv} sözlükleri düz nesne olur). */
export function unwrap(value: unknown): unknown {
  if (value instanceof Variant) return unwrap(value.value)
  if (Array.isArray(value)) return value.map(unwrap)
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, unwrap(v)]))
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = Object.create(null)
    for (const [k, v] of Object.entries(value)) out[k] = unwrap(v)
    return out
  }
  return value
}

export const MessageType = {
  MethodCall: 1,
  MethodReturn: 2,
  Error: 3,
  Signal: 4
} as const
export type MessageType = (typeof MessageType)[keyof typeof MessageType]

export const NO_REPLY_EXPECTED = 0x1

export interface Message {
  type: MessageType
  flags: number
  serial: number
  path?: string
  interface?: string
  member?: string
  errorName?: string
  replySerial?: number
  destination?: string
  sender?: string
  signature?: string
  body: unknown[]
}

const FIELDS: [keyof Message, number, string][] = [
  ['path', 1, 'o'],
  ['interface', 2, 's'],
  ['member', 3, 's'],
  ['errorName', 4, 's'],
  ['replySerial', 5, 'u'],
  ['destination', 6, 's'],
  ['sender', 7, 's'],
  ['signature', 8, 'g']
]

const HEADER_FIELDS = parseSignature('a(yv)')[0]

export function encodeMessage(msg: Message): Buffer {
  const signature = msg.signature ?? ''
  const body = signature ? encodeBody(signature, msg.body) : Buffer.alloc(0)
  const fields: [number, Variant][] = []
  for (const [key, code, sig] of FIELDS) {
    const v = key === 'signature' ? (signature ? signature : undefined) : msg[key]
    if (v !== undefined) fields.push([code, new Variant(sig, v)])
  }
  const w = new Writer()
  w.u8('l'.charCodeAt(0))
  w.u8(msg.type)
  w.u8(msg.flags)
  w.u8(1)
  w.u32(body.length)
  w.u32(msg.serial)
  w.write(HEADER_FIELDS, fields)
  w.align(8)
  w.raw(body)
  return w.result()
}

/** Tampondaki ilk iletinin toplam boyu; başlık henüz tam gelmediyse null. */
export function messageLength(buf: Buffer): number | null {
  if (buf.length < 16) return null
  const little = buf[0] === 'l'.charCodeAt(0)
  const bodyLength = little ? buf.readUInt32LE(4) : buf.readUInt32BE(4)
  const fieldsLength = little ? buf.readUInt32LE(12) : buf.readUInt32BE(12)
  const header = 16 + fieldsLength
  return header + ((8 - (header % 8)) % 8) + bodyLength
}

export function decodeMessage(buf: Buffer): Message {
  const little = buf[0] === 'l'.charCodeAt(0)
  if (!little && buf[0] !== 'B'.charCodeAt(0)) throw new Error('Bad D-Bus endianness marker')
  const r = new Reader(buf, 12, little)
  const fields = r.read(HEADER_FIELDS) as [number, Variant][]
  r.align(8)
  const msg: Message = {
    type: buf[1] as MessageType,
    flags: buf[2],
    serial: little ? buf.readUInt32LE(8) : buf.readUInt32BE(8),
    body: []
  }
  const record = msg as unknown as Record<string, unknown>
  for (const [code, value] of fields) {
    const field = FIELDS.find(([, c]) => c === code)
    if (field) record[field[0]] = value.value
  }
  if (msg.signature) msg.body = parseSignature(msg.signature).map((t) => r.read(t))
  return msg
}
