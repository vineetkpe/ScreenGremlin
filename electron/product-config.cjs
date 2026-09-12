module.exports = {
  // Set this to your live checkout URL before launch, or inject
  // VITE_CHECKOUT_URL for the web landing page build.
  checkoutUrl: '',
  priceUsd: '2.99',

  downloadUrl: 'https://github.com/vineetkpe/ScreenGremlin/releases/latest',

  // Optional page explaining how creators can earn a free Pro key.
  creatorUnlockUrl: '',

  // Optional HTTPS endpoint for the v2 AI friend. Keep model/provider secrets
  // on that server. Never ship an OpenAI/LLM API key inside this desktop app.
  // When empty or unavailable, the app uses its local lightweight friend brain.
  friendApiUrl: '',
}