// SVG'yi istenen boyutlarda PNG'ye çevirir: electron dev/render-svg.cjs <svg> <çıktı-öneki> [boyutlar,...]
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const args = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('-') && !a.endsWith('render-svg.cjs'))
const [svgPath, outPrefix, sizesArg] = args
const sizes = (sizesArg || '1024,256,64,32,16').split(',').map(Number)
app.whenReady().then(async () => {
  const source = fs.readFileSync(svgPath, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<html><body></body></html>')
  for (const s of sizes) {
    // Vektör hedef boyutta çizilsin diye kök width/height hedefe ayarlanır; büyük çizimi küçültmek bulanıklaştırır.
    const svg = source.replace(
      /<svg([^>]*?)\swidth="[^"]*"([^>]*?)\sheight="[^"]*"/,
      `<svg$1 width="${s}"$2 height="${s}"`
    )
    const dataUrl = await win.webContents.executeJavaScript(`new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = ${s}; c.height = ${s}
        const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, ${s}, ${s}); resolve(c.toDataURL('image/png'))
      }
      img.src = 'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}'
    })`)
    fs.writeFileSync(`${outPrefix}-${s}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'))
  }
  app.quit()
})
