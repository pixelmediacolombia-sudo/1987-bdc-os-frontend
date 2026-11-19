import { randomBytes, scryptSync } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const email = 'admin@bdc-os.local'
const displayName = 'Admin BDC OS local'
const password = randomBytes(24).toString('base64url')
const salt = randomBytes(16)
const derived = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
const hash = `scrypt$32768$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`
const composeEscapedHash = hash.replaceAll('$', '$$')

try {
  writeFileSync('.env', `BDC_ADMIN_EMAIL=${email}\nBDC_ADMIN_NAME=${displayName}\nBDC_ADMIN_PASSWORD_HASH=${composeEscapedHash}\n`, { flag: 'wx', mode: 0o600 })
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
    console.error('Ya existe .env; no lo sobrescribí. Conserva tu configuración local.')
    process.exit(1)
  }
  throw error
}

console.log(`Correo de prueba: ${email}`)
console.log(`Contraseña temporal (solo se muestra ahora): ${password}`)
console.log('El archivo .env contiene únicamente el hash y está excluido de Git.')
