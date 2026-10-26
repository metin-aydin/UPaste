// `UPASTE_DEBUG=1` ile olay akışı (kısayol, pano bildirimi, yakalama, yapıştırma) standart çıktıya yazılır.
const enabled = process.env['UPASTE_DEBUG'] === '1'

export function debug(...args: unknown[]): void {
  if (enabled) console.log('[upaste]', ...args)
}
