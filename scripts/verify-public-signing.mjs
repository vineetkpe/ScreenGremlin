const publicRelease = process.env.SCREEN_GREMLIN_PUBLIC_RELEASE === '1'

if (!publicRelease) {
  console.log('Private/test build: code-signing guard not required.')
  process.exit(0)
}

const hasWindowsSigning = Boolean(
  process.env.WIN_CSC_LINK ||
  process.env.CSC_LINK ||
  (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET),
)

if (!hasWindowsSigning) {
  console.error([
    'Refusing to create a public Windows release without trusted code signing.',
    'Configure WIN_CSC_LINK + WIN_CSC_KEY_PASSWORD (or an approved Azure signing setup) in CI secrets.',
    'Do not publish an unsigned installer and tell customers to click “Run anyway”.',
  ].join('\n'))
  process.exit(1)
}

console.log('Public Windows release signing credentials are configured.')
