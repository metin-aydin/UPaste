/** Uygulamanın kendini güncelleyebildiği kurulum türleri. */
export type UpdateInstaller = 'appimage' | 'deb'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'

/** Güncelleme durumu: ana süreç tutar, ayarlar ekranı ve bildirimler gösterir. */
export interface UpdateState {
  currentVersion: string
  /**
   * Uygulama içinden kurulabilen paket türü. null ise (geliştirme sürümü, elle açılan paket) yeni sürüm bulunur ama
   * yalnız indirme sayfası açılır.
   */
  installer: UpdateInstaller | null
  status: UpdateStatus
  /** Bulunan yeni sürüm. */
  version?: string
  /** Yeni sürümün yayın sayfası. */
  releaseUrl?: string
  /** İndirme yüzdesi (0–100). */
  percent?: number
  error?: string
  /** Son denetimin zamanı (ms). */
  checkedAt?: number
  /** Açılışta ve belirli aralıklarla kendiliğinden denetlenir. */
  autoCheck: boolean
}

/** `x.y.z` biçimindeki sürümleri karşılaştırır (önündeki `v` ve `-` sonrası yok sayılır); a > b ise pozitif. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string): number[] =>
    v
      .replace(/^v/, '')
      .split('-')[0]
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0)
  const pa = parts(a)
  const pb = parts(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
