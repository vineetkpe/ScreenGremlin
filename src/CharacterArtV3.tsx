import type { CSSProperties } from 'react'
import type { Accessory } from './gremlin'
import type { CharacterId, CustomEyes, CustomShape, Expression } from './companion-store'

type Props = {
  character: CharacterId
  expression: Expression
  accessory: Accessory
  customPrimary: string
  customSecondary: string
  customShape: CustomShape
  customEyes: CustomEyes
  eyeX?: number
  eyeY?: number
  second?: boolean
}

type EyeKind = 'dot' | 'happy' | 'wide' | 'sleepy' | 'angry' | 'side'
type MouthKind = 'smile' | 'open' | 'flat' | 'frown' | 'o' | 'smirk' | 'tongue'
type ExtraKind = 'none' | 'blush' | 'tear' | 'sweat' | 'anger' | 'heart' | 'sleep' | 'sparkle' | 'question' | 'dizzy' | 'drool' | 'facepalm'

type FaceSpec = { eye: EyeKind; mouth: MouthKind; extra?: ExtraKind }

const FACE: Record<Expression, FaceSpec> = {
  neutral: { eye: 'dot', mouth: 'smile' },
  happy: { eye: 'happy', mouth: 'smile', extra: 'blush' },
  laugh: { eye: 'happy', mouth: 'open', extra: 'sparkle' },
  annoyed: { eye: 'side', mouth: 'flat' },
  angry: { eye: 'angry', mouth: 'frown', extra: 'anger' },
  sleepy: { eye: 'sleepy', mouth: 'flat', extra: 'sleep' },
  shocked: { eye: 'wide', mouth: 'o', extra: 'sweat' },
  scared: { eye: 'wide', mouth: 'frown', extra: 'sweat' },
  confused: { eye: 'side', mouth: 'o', extra: 'question' },
  curious: { eye: 'wide', mouth: 'smile', extra: 'question' },
  proud: { eye: 'happy', mouth: 'smirk', extra: 'sparkle' },
  excited: { eye: 'wide', mouth: 'open', extra: 'sparkle' },
  bored: { eye: 'sleepy', mouth: 'flat' },
  sneaky: { eye: 'side', mouth: 'smirk' },
  dizzy: { eye: 'wide', mouth: 'o', extra: 'dizzy' },
  sad: { eye: 'dot', mouth: 'frown', extra: 'tear' },
  thinking: { eye: 'side', mouth: 'smirk', extra: 'question' },
  hungry: { eye: 'wide', mouth: 'open', extra: 'drool' },
  celebrate: { eye: 'happy', mouth: 'open', extra: 'sparkle' },
  dance: { eye: 'happy', mouth: 'smile', extra: 'sparkle' },
  facepalm: { eye: 'sleepy', mouth: 'flat', extra: 'facepalm' },
  embarrassed: { eye: 'dot', mouth: 'smile', extra: 'blush' },
  focused: { eye: 'angry', mouth: 'flat' },
  mischief: { eye: 'side', mouth: 'smirk', extra: 'sparkle' },
  love: { eye: 'happy', mouth: 'smile', extra: 'heart' },
  determined: { eye: 'angry', mouth: 'smirk' },
}

function Eyes({ kind, eyeX = 0, eyeY = 0 }: { kind: EyeKind; eyeX?: number; eyeY?: number }) {
  const transform = `translate(${eyeX} ${eyeY})`
  if (kind === 'happy') return <g className="v3-face-eyes"><path d="M40 58 Q46 51 52 58"/><path d="M76 58 Q82 51 88 58"/></g>
  if (kind === 'sleepy') return <g className="v3-face-eyes"><path d="M39 58 Q46 61 53 58"/><path d="M75 58 Q82 61 89 58"/></g>
  if (kind === 'angry') return <g className="v3-face-eyes"><path d="M39 52 L53 57"/><circle cx="47" cy="61" r="4"/><path d="M89 52 L75 57"/><circle cx="81" cy="61" r="4"/></g>
  if (kind === 'side') return <g transform={transform}><ellipse className="v3-eye-white" cx="47" cy="59" rx="7" ry="6"/><circle className="v3-eye" cx="50" cy="60" r="4"/><ellipse className="v3-eye-white" cx="81" cy="59" rx="7" ry="6"/><circle className="v3-eye" cx="84" cy="60" r="4"/></g>
  const r = kind === 'wide' ? 7 : 5
  return <g transform={transform}><circle className="v3-eye-white" cx="47" cy="59" r={r + 2}/><circle className="v3-eye" cx="47" cy="59" r={r}/><circle className="v3-eye-glint" cx="45" cy="56" r="1.8"/><circle className="v3-eye-white" cx="81" cy="59" r={r + 2}/><circle className="v3-eye" cx="81" cy="59" r={r}/><circle className="v3-eye-glint" cx="79" cy="56" r="1.8"/></g>
}

function Mouth({ kind }: { kind: MouthKind }) {
  if (kind === 'open') return <g><path className="v3-mouth-fill" d="M54 76 Q64 87 74 76 Q72 91 64 92 Q56 91 54 76Z"/><path d="M54 76 Q64 87 74 76"/></g>
  if (kind === 'flat') return <path d="M57 80 Q64 78 71 80"/>
  if (kind === 'frown') return <path d="M56 84 Q64 76 72 84"/>
  if (kind === 'o') return <ellipse className="v3-mouth-fill" cx="64" cy="81" rx="6" ry="8"/>
  if (kind === 'smirk') return <path d="M56 80 Q65 86 73 78"/>
  if (kind === 'tongue') return <g><path className="v3-mouth-fill" d="M54 77 Q64 88 74 77 Q72 92 64 93 Q56 92 54 77Z"/><path className="v3-tongue" d="M59 87 Q64 83 69 87 Q68 93 64 94 Q60 93 59 87Z"/></g>
  return <path d="M55 78 Q64 88 73 78"/>
}

function Extra({ kind }: { kind: ExtraKind | undefined }) {
  if (!kind || kind === 'none') return null
  if (kind === 'blush') return <g className="v3-blush"><ellipse cx="35" cy="72" rx="8" ry="4"/><ellipse cx="93" cy="72" rx="8" ry="4"/><path d="M29 70 l6 -2 M34 75 l6 -2 M87 70 l6 2 M88 75 l6 2"/></g>
  if (kind === 'tear') return <g className="v3-emotion-mark"><path className="v3-tear" d="M92 65 Q99 75 92 80 Q85 75 92 65Z"/><path className="v3-tear" d="M36 66 Q42 74 36 79 Q30 74 36 66Z"/></g>
  if (kind === 'sweat') return <g className="v3-emotion-mark"><path className="v3-sweat" d="M99 45 Q106 55 99 60 Q92 55 99 45Z"/></g>
  if (kind === 'anger') return <g className="v3-emotion-mark v3-anger"><path d="M94 35 v10 M89 40 h10 M101 29 v9 M97 33 h9"/></g>
  if (kind === 'heart') return <g className="v3-emotion-mark v3-heart"><path d="M95 37 C95 29 107 29 107 38 C107 47 95 52 95 52 C95 52 83 47 83 38 C83 29 95 29 95 37Z"/></g>
  if (kind === 'sleep') return <g className="v3-emotion-mark v3-sleep"><path d="M88 39 h12 l-12 12 h12 M99 28 h10 l-10 10 h10"/></g>
  if (kind === 'sparkle') return <g className="v3-emotion-mark v3-sparkle"><path d="M100 36 l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="M31 37 l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>
  if (kind === 'question') return <g className="v3-emotion-mark v3-question"><path d="M94 34 Q105 24 108 34 Q110 42 101 45 V49"/><circle cx="101" cy="55" r="2"/></g>
  if (kind === 'dizzy') return <g className="v3-emotion-mark v3-dizzy"><path d="M30 31 l9 9 M39 31 l-9 9 M91 30 l9 9 M100 30 l-9 9"/></g>
  if (kind === 'drool') return <path className="v3-drool" d="M73 84 Q79 91 73 96 Q67 91 73 84Z"/>
  return <g className="v3-facepalm"><path d="M89 73 Q107 65 108 78 Q107 91 90 88 Q84 83 89 73Z"/><path d="M90 73 L76 64"/></g>
}

function Face({ expression, eyeX, eyeY }: { expression: Expression; eyeX?: number; eyeY?: number }) {
  const face = FACE[expression] ?? FACE.neutral
  return <g className="v3-face">
    <Eyes kind={face.eye} eyeX={eyeX} eyeY={eyeY}/>
    <Mouth kind={expression === 'mischief' ? 'tongue' : face.mouth}/>
    <Extra kind={face.extra}/>
  </g>
}

function AccessoryArt({ accessory }: { accessory: Accessory }) {
  if (accessory === 'cap') return <g className="v3-accessory"><path d="M38 31 Q62 16 86 31 L82 41 L40 41Z"/><path d="M82 36 Q98 36 103 43 Q91 45 79 43Z"/></g>
  if (accessory === 'glasses') return <g className="v3-accessory v3-glasses"><rect x="34" y="50" width="26" height="19" rx="7"/><rect x="68" y="50" width="26" height="19" rx="7"/><path d="M60 58 H68"/></g>
  if (accessory === 'headphones') return <g className="v3-accessory"><path d="M31 57 Q31 27 64 27 Q97 27 97 57"/><rect x="25" y="53" width="13" height="28" rx="6"/><rect x="90" y="53" width="13" height="28" rx="6"/></g>
  if (accessory === 'crown') return <g className="v3-crown"><path d="M41 37 L45 19 L57 30 L65 15 L76 30 L88 18 L86 39Z"/><circle cx="65" cy="22" r="3"/></g>
  return null
}

export default function CharacterArtV3({ character, expression, accessory, customPrimary, customSecondary, customShape, customEyes, eyeX = 0, eyeY = 0, second = false }: Props) {
  const style = {
    '--v3-primary': customPrimary,
    '--v3-secondary': customSecondary,
  } as CSSProperties
  const faceExpression = character === 'custom' && customEyes === 'sleepy' && expression === 'neutral' ? 'sleepy' : expression

  return <svg className={`character-art-v3 character-art-v3--${character} ${second ? 'is-second' : ''} custom-shape-${customShape} custom-eyes-${customEyes}`} style={style} viewBox="0 0 128 128" aria-hidden="true">
    <defs>
      <filter id={`v3shadow-${second ? 'b' : 'a'}`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodOpacity=".25"/></filter>
      <linearGradient id={`v3glow-${second ? 'b' : 'a'}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
    </defs>
    <g filter={`url(#v3shadow-${second ? 'b' : 'a'})`}>
      {character === 'gremlin' && <g className="v3-body v3-body--cute-friend">
        <path className="v3-hair-back" d="M29 46 Q29 18 64 16 Q99 18 99 47 L92 82 Q83 104 64 108 Q44 104 35 82Z"/>
        <path className="v3-primary" d="M35 49 Q34 28 64 26 Q94 28 93 50 Q102 65 94 88 Q86 108 64 111 Q42 108 34 88 Q25 66 35 49Z"/>
        <path className="v3-hair" d="M33 49 Q32 25 53 22 Q66 12 84 23 Q99 30 94 51 Q84 41 76 34 Q72 45 56 37 Q48 47 33 49Z"/>
        <path className="v3-hair" d="M31 45 Q19 54 25 70 Q30 58 40 54Z"/><path className="v3-hair" d="M97 45 Q109 54 103 70 Q98 58 88 54Z"/>
        <path className="v3-hoodie" d="M39 91 Q64 101 89 91 L94 113 H34Z"/>
        <path className="v3-hoodie-detail" d="M55 97 L64 105 L73 97 M61 103 V116 M67 103 V116"/>
        <path className="v3-arm" d="M38 96 Q23 98 21 109 Q29 115 42 105Z"/><path className="v3-arm" d="M90 96 Q105 98 107 109 Q99 115 86 105Z"/>
        <Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/>
      </g>}
      {character === 'pebblebot' && <g className="v3-body v3-body--cool-friend">
        <path className="v3-jacket-back" d="M35 79 Q38 52 64 48 Q90 52 93 79 L102 113 H26Z"/>
        <path className="v3-skin" d="M35 50 Q35 26 64 24 Q93 26 93 50 Q99 70 91 87 Q82 102 64 104 Q46 102 37 87 Q29 70 35 50Z"/>
        <path className="v3-cool-hair" d="M33 51 Q29 27 48 22 Q59 12 77 19 Q94 21 98 41 Q88 35 83 29 Q79 42 60 32 Q53 44 33 51Z"/>
        <path className="v3-cool-hair" d="M68 22 Q83 10 99 20 Q88 24 82 33Z"/>
        <path className="v3-jacket" d="M39 88 Q64 99 89 88 L98 114 H30Z"/>
        <path className="v3-jacket-lapel" d="M46 91 L60 106 L54 114 H40 M82 91 L68 106 L74 114 H88"/>
        <path className="v3-shirt" d="M57 94 H71 L69 116 H59Z"/>
        <path className="v3-arm" d="M34 96 Q20 100 21 111 Q30 116 42 106Z"/><path className="v3-arm" d="M94 96 Q108 100 107 111 Q98 116 86 106Z"/>
        <Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/>
      </g>}
      {character === 'mossling' && <g className="v3-body"><path className="v3-primary" d="M32 51 Q26 29 48 29 Q47 15 59 20 Q67 8 72 23 Q90 16 88 35 Q103 37 96 55 Q107 72 95 94 Q86 111 64 113 Q41 111 32 94 Q20 72 32 51Z"/><path className="v3-leaf" d="M58 28 Q48 10 33 13 Q39 31 58 33Z"/><path className="v3-leaf" d="M70 27 Q78 8 94 13 Q90 31 70 33Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'bloop' && <g className="v3-body"><path className="v3-primary" d="M23 83 Q20 49 43 38 Q58 28 76 37 Q103 42 104 78 Q105 106 79 111 Q54 117 34 105 Q25 99 23 83Z"/><path className="v3-gloss" d="M37 50 Q47 40 59 43 Q48 50 42 63Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'nimbus' && <g className="v3-body"><path className="v3-primary" d="M24 74 Q19 58 34 52 Q33 36 49 35 Q56 19 72 32 Q88 29 91 46 Q108 50 102 67 Q112 82 96 91 Q78 101 39 95 Q26 91 24 74Z"/><path className="v3-lightning" d="M62 93 L53 111 L65 106 L61 123 L79 99 L67 102 L73 93Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'bytebug' && <g className="v3-body"><path className="v3-secondary" d="M42 36 L29 23 M86 36 L99 23"/><circle className="v3-primary" cx="27" cy="21" r="5"/><circle className="v3-primary" cx="101" cy="21" r="5"/><rect className="v3-primary" x="28" y="36" width="72" height="71" rx="25"/><path className="v3-secondary" d="M28 63 H16 M100 63 H112 M41 105 L31 118 M87 105 L97 118"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'wisp' && <g className="v3-body"><path className="v3-primary" d="M64 18 Q89 28 94 53 Q99 78 79 91 Q72 96 68 112 Q60 101 57 92 Q37 87 32 69 Q25 45 42 29 Q51 20 64 18Z"/><path className="v3-gloss" d="M48 33 Q59 24 70 27 Q56 33 49 47Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'mooncat' && <g className="v3-body"><path className="v3-primary" d="M34 46 L32 20 L51 37 Q64 31 78 37 L96 20 L94 49 Q104 66 96 91 Q88 111 64 114 Q40 112 32 91 Q24 66 34 46Z"/><path className="v3-secondary" d="M92 88 Q111 88 108 104 Q104 115 94 106 Q103 105 101 98 Q99 94 91 96Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'custom' && <g className="v3-body"><path className="v3-primary v3-custom-body" d="M30 47 Q26 31 44 34 Q62 25 84 34 Q102 38 99 61 L96 92 Q88 112 64 114 Q40 112 32 92Z"/><path className="v3-secondary" d="M44 100 Q64 109 84 100 Q79 116 64 119 Q49 116 44 100Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      <AccessoryArt accessory={accessory}/>
    </g>
  </svg>
}