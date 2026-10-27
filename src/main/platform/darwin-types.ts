// macOS Core Graphics / Core Foundation yapıları (koffi). Yalnız tür tanımıdır; boyutları birim testinde denetlenir.
import koffi from 'koffi'

export const CGPoint = koffi.struct('UPASTE_CGPoint', { x: 'double', y: 'double' })
export const CGSize = koffi.struct('UPASTE_CGSize', { width: 'double', height: 'double' })
export const CGRect = koffi.struct('UPASTE_CGRect', { origin: CGPoint, size: CGSize })
/** CFRange: CFIndex (64 bit işaretli) konum ve uzunluk. */
export const CFRange = koffi.struct('UPASTE_CFRange', { location: 'int64_t', length: 'int64_t' })
