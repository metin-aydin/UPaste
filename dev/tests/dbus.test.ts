import {
  decodeMessage,
  encodeMessage,
  MessageType,
  parseSignature,
  unwrap,
  Variant
} from '../../src/main/dbus/wire'
import { connectSessionBus, socketPath } from '../../src/main/dbus/connection'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { eq, ok, run, test } from './harness'

const execFileAsync = promisify(execFile)

const roundTrip = (signature: string, body: unknown[]): unknown[] =>
  decodeMessage(
    encodeMessage({
      type: MessageType.MethodCall,
      flags: 0,
      serial: 7,
      path: '/a',
      member: 'M',
      signature,
      body
    })
  ).body

test('imza ayrıştırma', () => {
  eq(
    parseSignature('a{sv}(iu)as').map((t) => t.code),
    ['a', '(', 'a']
  )
})

test('temel türler gidip gelir', () => {
  const body = [
    255,
    true,
    -3,
    65000,
    -70000,
    4000000000,
    -5n,
    2n ** 60n,
    1.5,
    'şçğ ü',
    '/o/p',
    'a{sv}'
  ]
  eq(roundTrip('ybnqiuxtdsog', body), body)
})

test('dizi, yapı, sözlük ve variant', () => {
  const [arr, struct, dict] = roundTrip('ai(sai)a{sv}', [
    [1, 2, 3],
    ['x', [4, 5]],
    { a: new Variant('s', 'b'), n: new Variant('ai', [7, 8]), t: new Variant('t', 9n) }
  ])
  eq(arr, [1, 2, 3])
  eq(struct, ['x', [4, 5]])
  eq(unwrap(dict), Object.assign(Object.create(null), { a: 'b', n: [7, 8], t: 9n }))
})

test('ay Buffer olarak döner', () => {
  const [bytes] = roundTrip('ay', [Buffer.from([1, 2, 250])])
  eq(Buffer.isBuffer(bytes), true)
  eq([...(bytes as Buffer)], [1, 2, 250])
})

test('hizalama: struct içinde 8 baytlık alan', () => {
  eq(roundTrip('y(yt)', [1, [2, 3n]]), [1, [2, 3n]])
})

test('adres çözümü', () => {
  eq(socketPath('unix:path=/run/user/1000/bus'), '/run/user/1000/bus')
  eq(socketPath('unix:abstract=/tmp/dbus-x,guid=1'), '\0/tmp/dbus-x')
})

const hasBus = !!process.env['DBUS_SESSION_BUS_ADDRESS']

if (hasBus) {
  test('oturum veri yolu: Hello, ListNames', async () => {
    const bus = await connectSessionBus()
    ok(bus.uniqueName.startsWith(':'))
    const [names] = await bus.call({
      destination: 'org.freedesktop.DBus',
      path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus',
      member: 'ListNames'
    })
    ok((names as string[]).includes('org.freedesktop.DBus'))
    bus.close()
  })

  test('yayımlanan nesne gdbus ile çağrılır', async () => {
    const bus = await connectSessionBus()
    bus.exportInterface('/test/upaste', {
      name: 'test.upaste.Echo',
      methods: {
        Echo: {
          in: 'sa{sv}',
          out: 's',
          handler: ([s, d]) => [`${s}:${(unwrap(d) as Record<string, unknown>)['k']}`]
        }
      }
    })
    const { stdout } = await execFileAsync(
      'gdbus',
      [
        'call',
        '--session',
        '--dest',
        bus.uniqueName,
        '--object-path',
        '/test/upaste',
        '--method',
        'test.upaste.Echo.Echo',
        'merhaba',
        "{'k': <42>}"
      ],
      { timeout: 5000 }
    )
    const { stdout: xml } = await execFileAsync(
      'gdbus',
      ['introspect', '--session', '--dest', bus.uniqueName, '--object-path', '/test/upaste'],
      { timeout: 5000 }
    )
    bus.close()
    eq(stdout.trim(), "('merhaba:42',)")
    ok(xml.includes('test.upaste.Echo') && xml.includes('Echo('), xml)
  })
}

void run('dbus')
