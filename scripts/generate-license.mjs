import crypto from 'node:crypto'
import fs from 'node:fs'

function argValue(name) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : ''
}

function required(name, value) {
  if (!value) {
    console.error(`Missing ${name}.`)
    process.exit(1)
  }
  return value
}

const owner = required('--owner', argValue('owner'))
const id = argValue('id') || crypto.randomUUID()
const expiresAt = argValue('expires') || null

const privateKeyPath = process.env.SCREEN_GREMLIN_LICENSE_PRIVATE_KEY_FILE
const privateKeyInline = process.env.SCREEN_GREMLIN_LICENSE_PRIVATE_KEY

let privateKey = privateKeyInline

if (!privateKey && privateKeyPath) {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8')
}

if (!privateKey) {
  console.error(
    'Set SCREEN_GREMLIN_LICENSE_PRIVATE_KEY or SCREEN_GREMLIN_LICENSE_PRIVATE_KEY_FILE before generating licenses.',
  )
  process.exit(1)
}

if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
  console.error('--expires must be an ISO date, for example 2027-09-12T00:00:00Z')
  process.exit(1)
}

const payload = {
  v: 1,
  product: 'screen-gremlin',
  tier: 'pro',
  id,
  owner,
  issuedAt: new Date().toISOString(),
  expiresAt,
}

const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8')
const signature = crypto.sign(null, payloadBytes, privateKey)

const key = [
  'SG1',
  payloadBytes.toString('base64url'),
  signature.toString('base64url'),
].join('.')

console.log(key)
