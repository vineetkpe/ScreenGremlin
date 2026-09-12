export type FriendLanguage = 'en' | 'hi' | 'hinglish'
export type FriendMood = 'calm' | 'happy' | 'teasing' | 'excited' | 'annoyed' | 'sad' | 'sleepy' | 'focused' | 'curious'
export type FriendExpression = 'neutral' | 'happy' | 'laugh' | 'teasing' | 'smug' | 'angry' | 'annoyed' | 'sad' | 'sleepy' | 'shocked' | 'curious' | 'thinking' | 'excited' | 'embarrassed' | 'focused' | 'mischief'

export type FriendReply = {
  text: string
  mood: FriendMood
  expression: FriendExpression
  action?: 'chat' | 'play' | 'note' | 'todo' | 'reminder' | 'quiet'
}

const RECENT_KEY = 'screen-gremlin:friend-recent:v1'

const lineSets: Record<FriendLanguage, Record<string, string[]>> = {
  en: {
    greet: ['Hey. I was waiting for you.', 'Yo. What are we doing?', 'There you are. Talk to me.'],
    work: ['Big work mode, huh? I can stay quiet if you want.', 'Locked in? I’ll behave. Mostly.', 'Okay boss, focus mode or chaos mode?'],
    tired: ['You sound tired. Tiny break?', 'Brain running on 2%?', 'Stretch. Water. Then we continue.'],
    sad: ['I’m here. You can talk, or we can just chill.', 'Want distraction or company?', 'No pressure. Tell me what happened if you want.'],
    bored: ['Perfect. I was born for useless fun.', 'Catch me then.', 'Want a tiny game or a dumb joke?'],
    tease: ['That was your best attempt?', 'Come on, you can do better.', 'I am judging you. Respectfully.'],
    play: ['Catch me if you can!', 'Okay okay, game on.', 'You asked for chaos.'],
    thanks: ['Anytime.', 'Obviously. I’m elite.', 'Got you.'],
    fallback: ['Tell me more.', 'Hmm. Continue.', 'Okay, I’m listening.', 'Wait, that’s actually interesting.', 'And then?'],
  },
  hi: {
    greet: ['Arre, aa gaye! Kya haal hai?', 'Namaste ji. Aaj kya scene hai?', 'Main yahin tha. Bolo kya hua?'],
    work: ['Kaam mode on hai kya? Main shaant reh sakta hoon.', 'Bahut serious typing chal rahi hai.', 'Focus karna hai ya thoda bakchodi break?'],
    tired: ['Thak gaye kya? Do minute ka break le lo.', 'Dimag ka battery low lag raha hai.', 'Paani piyo, thoda stretch karo.'],
    sad: ['Main yahin hoon. Baat karni ho toh karo.', 'Distraction chahiye ya bas company?', 'Theek hai, bina pressure ke bolo.'],
    bored: ['Accha, ab meri baari. Pakdo mujhe!', 'Bore ho? Chalo kuch silly karte hain.', 'Ek chhota game?'],
    tease: ['Bas itna hi?', 'Arre, haar gaye kya?', 'Dar gaye? Main toh chhota sa hoon.'],
    play: ['Pakdo mujhe!', 'Chalo, game shuru!', 'Ab dekhte hain kaun jeetega.'],
    thanks: ['Kabhi bhi.', 'Haan haan, welcome.', 'Main hoon na.'],
    fallback: ['Aur batao.', 'Hmm, sun raha hoon.', 'Accha? Phir?', 'Ye interesting hai.', 'Bolo bolo.'],
  },
  hinglish: {
    greet: ['Ayy, finally! Kya scene hai?', 'Yo, aa gaye. Kya kar rahe ho?', 'Main ready hoon. Bol kya chal raha hai?'],
    work: ['Full work mode? Main disturb nahi karunga... maybe.', 'Kya likh raha hai itna seriously?', 'Focus chahiye toh bol, main corner mein chill karunga.'],
    tired: ['Battery low lag rahi hai bro. Tiny break?', 'Thak gaya kya? Paani + stretch.', 'Brain ko bhi recharge chahiye.'],
    sad: ['Main yahin hoon. Baat karni hai toh kar.', 'Distraction chahiye ya bas company?', 'No pressure. Bolna ho toh bol.'],
    bored: ['Bored? Perfect. Pakad ke dikha.', 'Chal kuch stupidly fun karte hain.', 'Mini game time?'],
    tease: ['Bas? Itna hi skill?', 'Arey haar gaya?', 'Dar gaya kya?'],
    play: ['Pakdo mujhe!', 'Game on, boss.', 'Catch me if you can!'],
    thanks: ['Anytime yaar.', 'Of course.', 'Main hoon na.'],
    fallback: ['Aur bol.', 'Hmm, continue.', 'Accha? Phir kya hua?', 'Interesting... aur?', 'Sun raha hoon.'],
  },
}

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 12) : []
  } catch {
    return []
  }
}

function pickUnique(options: string[]) {
  const recent = readRecent()
  const available = options.filter((line) => !recent.includes(line))
  const source = available.length ? available : options
  const line = source[Math.floor(Math.random() * source.length)] || options[0] || 'Hmm.'
  const next = [line, ...recent.filter((item) => item !== line)].slice(0, 12)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return line
}

function classify(input: string) {
  const text = input.toLowerCase()
  if (/\b(hi|hello|hey|yo|namaste|hola)\b/.test(text)) return 'greet'
  if (/\b(work|working|study|studying|homework|focus|code|coding|project|kaam|padh|likh)\b/.test(text)) return 'work'
  if (/\b(tired|sleepy|exhausted|thak|neend)\b/.test(text)) return 'tired'
  if (/\b(sad|upset|bad day|low|dukhi|bura lag|udaas)\b/.test(text)) return 'sad'
  if (/\b(bored|boring|bore)\b/.test(text)) return 'bored'
  if (/\b(play|game|catch|pakad|pakdo|chase)\b/.test(text)) return 'play'
  if (/\b(thanks|thank you|ty|shukriya)\b/.test(text)) return 'thanks'
  if (/\b(roast|tease|mock|chidh|mazaak)\b/.test(text)) return 'tease'
  return 'fallback'
}

const moodByIntent: Record<string, [FriendMood, FriendExpression]> = {
  greet: ['happy', 'happy'],
  work: ['focused', 'focused'],
  tired: ['calm', 'sleepy'],
  sad: ['calm', 'sad'],
  bored: ['teasing', 'mischief'],
  tease: ['teasing', 'smug'],
  play: ['excited', 'excited'],
  thanks: ['happy', 'happy'],
  fallback: ['curious', 'curious'],
}

export function respondLocally(input: string, language: FriendLanguage): FriendReply {
  const intent = classify(input)
  const [mood, expression] = moodByIntent[intent] || moodByIntent.fallback
  return {
    text: pickUnique(lineSets[language][intent] || lineSets[language].fallback),
    mood,
    expression,
    action: intent === 'play' ? 'play' : intent === 'work' ? 'quiet' : 'chat',
  }
}

export function randomAmbientLine(language: FriendLanguage): FriendReply {
  const buckets = ['fallback', 'tease', 'work']
  const intent = buckets[Math.floor(Math.random() * buckets.length)]
  const [mood, expression] = moodByIntent[intent]
  return { text: pickUnique(lineSets[language][intent]), mood, expression, action: 'chat' }
}
