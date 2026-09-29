export const lightenColor = (color: any, amount: any) => {
  if (!/^#([0-9a-f]{3}){1,2}$/i.test(color)) return color
  const rgb = color.replace(/^#/, '').match(/[a-f0-9]{2}/gi)
  for (let i = 0; i < 3; i++) {
    rgb[i] = parseInt(rgb[i], 16)
  }
  for (let i = 0; i < 3; i++) {
    rgb[i] = Math.min(255, Math.round(rgb[i] + rgb[i] * (amount / 100)))
  }
  return `#${rgb.map((v: any) => v.toString(16).padStart(2, '0')).join('')}`
}
