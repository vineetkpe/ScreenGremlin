# Selling ScreenGremlin

The app is intentionally designed so the first sales do not require a custom backend.

## 1. Connect checkout

Use a merchant-of-record or payment provider that can sell globally.

Put the live checkout URL in:

- `electron/product-config.cjs` for the desktop app.
- GitHub Actions repository variable `VITE_CHECKOUT_URL` for the landing page.

The current price in the product is **$2.99 USD**.

## 2. Keep the license private key outside GitHub

ScreenGremlin uses Ed25519 signatures.

The app contains only the public key. A buyer cannot create a valid Pro license without your private key.

Set either:

```bash
export SCREEN_GREMLIN_LICENSE_PRIVATE_KEY_FILE=/secure/path/screen-gremlin-private-key.pem
```

or:

```bash
export SCREEN_GREMLIN_LICENSE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----...'
```

Never commit the private key.

## 3. Issue a Pro key

```bash
npm run license:generate -- --owner="buyer@example.com"
```

Optional custom ID:

```bash
npm run license:generate -- --owner="buyer@example.com" --id="ORDER-123"
```

Optional expiry:

```bash
npm run license:generate -- --owner="buyer@example.com" --expires="2027-12-31T23:59:59Z"
```

Send the generated `SG1....` key to the buyer. They paste it into **Settings → ScreenGremlin Pro**.

## 4. Creator unlocks

If you offer a free key for a public Instagram/Reels/YouTube Short post, verify the post manually at first and issue the creator a normal Pro key. This avoids building a social-platform verification system before demand exists.

You can add instructions or a form URL to `creatorUnlockUrl` in `electron/product-config.cjs`.

## 5. Release installers

Tag a version:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow builds Windows, macOS, and Linux packages and publishes them to the GitHub Release for that tag.

Code signing is not included because Apple Developer and Windows signing credentials are account-specific. Unsigned builds can show operating-system trust warnings. Add signing before a larger public launch.

## 6. Deploy landing page

Enable GitHub Pages with **GitHub Actions** as the source, then run the `Pages` workflow or push the finished product to `main`.

The landing page download button points to the latest GitHub Release.
