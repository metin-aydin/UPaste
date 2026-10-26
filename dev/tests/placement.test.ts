import { areaFor, insideFrame, knownCaret, placePopup } from '../../src/shared/placement'
import { eq, ok, run, test } from './harness'

// Farklı dikey kaymalarla dizilmiş üç ekran (sol, orta, sağ).
const areas = [
  { x: 0, y: 25, width: 1920, height: 1080 },
  { x: 1920, y: 101, width: 1920, height: 1080 },
  { x: 3840, y: 0, width: 1920, height: 1080 }
]
const size = { width: 400, height: 500 }

test('metin alanının altında, sol kenarı hizalı', () => {
  const p = placePopup({ x: 2100, y: 300, width: 1, height: 20 }, areas, size, 4)
  eq([p.x, p.y, p.above], [2100, 324, false])
})

test('altta yer yoksa üstte açılır', () => {
  const p = placePopup({ x: 2100, y: 1000, width: 1, height: 20 }, areas, size, 4)
  eq([p.above, p.y + p.height], [true, 996])
})

test('ekranın sağ kenarını aşmaz', () => {
  const p = placePopup({ x: 3800, y: 300, width: 1, height: 20 }, areas, size, 4)
  eq(p.x + p.width <= 1920 + 1920, true)
  eq(p.x, 3840 - 400)
})

test('metin alanının bulunduğu ekranda kalır (sağ ekran)', () => {
  const p = placePopup({ x: 3850, y: 900, width: 1, height: 20 }, areas, size, 4)
  ok(p.x >= 3840)
  ok(p.y >= 0 && p.y + p.height <= 1080)
})

test('iki tarafta da tam boy sığmazsa geniş taraf kısaltılır', () => {
  const small = [{ x: 0, y: 0, width: 800, height: 600 }]
  const p = placePopup({ x: 100, y: 280, width: 1, height: 20 }, small, size, 4)
  eq(p.above, false)
  eq(p.height, 600 - 304)
})

test('nokta hiçbir ekranda değilse en yakın ekran', () => {
  eq(areaFor({ x: 1900, y: 10 }, areas), areas[0])
  eq(areaFor({ x: 6000, y: 500 }, areas), areas[2])
})

test('çerçeve içi denetimi', () => {
  ok(insideFrame({ x: 10, y: 10, width: 5, height: 5 }, { x: 0, y: 0, width: 100, height: 100 }))
  ok(!insideFrame({ x: 200, y: 10, width: 5, height: 5 }, { x: 0, y: 0, width: 100, height: 100 }))
})

test('imleç: yüksekliği olan ve pencere içindeki dikdörtgen kullanılır', () => {
  const frame = { x: 1920, y: 133, width: 1920, height: 1002 }
  const caret = { x: 2400, y: 600, width: 0, height: 18 }
  eq(knownCaret(caret, frame), caret)
})

test('imleç: konumunu bildirmeyen uygulamanın 0×0 köşe dikdörtgeni bilinmiyor sayılır', () => {
  const frame = { x: 1920, y: 133, width: 1920, height: 1002 }
  eq(knownCaret({ x: 1920, y: 133, width: 0, height: 0 }, frame), null)
  eq(knownCaret(undefined, frame), null)
})

test('imleç: pencerenin dışında kalan dikdörtgen bilinmiyor sayılır', () => {
  const frame = { x: 1920, y: 133, width: 1920, height: 1002 }
  eq(knownCaret({ x: 100, y: 100, width: 0, height: 18 }, frame), null)
})

void run('placement')
