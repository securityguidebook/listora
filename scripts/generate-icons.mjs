// Run: node scripts/generate-icons.mjs
// Generates placeholder SVG icons — replace with real PNG icons before production
import { writeFileSync, mkdirSync } from 'fs'

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#7c3aed"/>
  <text x="50%" y="54%" font-size="${size * 0.5}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">🛒</text>
</svg>`

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.svg', svg(192))
writeFileSync('public/icons/icon-512.svg', svg(512))
console.log('Icons generated. Convert SVG→PNG using your preferred tool for production.')
