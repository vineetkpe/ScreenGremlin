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

const FACE: Record<Expression, { eye: 'dot' | 'happy' | 'wide' | 'sleepy' | 'angry'; mouth: 'smile' | 'open' | 'flat' | 'frown' | 'o' | 'smirk'; blush?: boolean }> = {
  neutral: { eye: 'dot', mouth: 'smile' }, happy: { eye: 'happy', mouth: 'smile', blush: true }, laugh: { eye: 'happy', mouth: 'open', blush: true },
  annoyed: { eye: 'sleepy', mouth: 'flat' }, angry: { eye: 'angry', mouth: 'frown' }, sleepy: { eye: 'sleepy', mouth: 'flat' },
  shocked: { eye: 'wide', mouth: 'o' }, scared: { eye: 'wide', mouth: 'frown' }, confused: { eye: 'dot', mouth: 'o' }, curious: { eye: 'wide', mouth: 'smile' },
  proud: { eye: 'happy', mouth: 'smirk' }, excited: { eye: 'wide', mouth: 'open', blush: true }, bored: { eye: 'sleepy', mouth: 'flat' },
  sneaky: { eye: 'sleepy', mouth: 'smirk' }, dizzy: { eye: 'wide', mouth: 'o' }, sad: { eye: 'dot', mouth: 'frown' }, thinking: { eye: 'dot', mouth: 'smirk' },
  hungry: { eye: 'wide', mouth: 'open' }, celebrate: { eye: 'happy', mouth: 'open', blush: true }, dance: { eye: 'happy', mouth: 'smile' },
  facepalm: { eye: 'sleepy', mouth: 'flat' }, embarrassed: { eye: 'dot', mouth: 'smile', blush: true }, focused: { eye: 'angry', mouth: 'flat' },
  mischief: { eye: 'sleepy', mouth: 'smirk' }, love: { eye: 'happy', mouth: 'smile', blush: true }, determined: { eye: 'angry', mouth: 'smirk' },
}

function Eyes({ kind, eyeX = 0, eyeY = 0 }: { kind: 'dot' | 'happy' | 'wide' | 'sleepy' | 'angry'; eyeX?: number; eyeY?: number }) {
  const transform = `translate(${eyeX} ${eyeY})`
  if (kind === 'happy') return <g className="v3-face-eyes"><path d="M40 58 Q46 51 52 58"/><path d="M76 58 Q82 51 88 58"/></g>
  if (kind === 'sleepy') return <g className="v3-face-eyes"><path d="M39 58 Q46 61 53 58"/><path d="M75 58 Q82 61 89 58"/></g>
  if (kind === 'angry') return <g className="v3-face-eyes"><path d="M39 53 L53 58"/><circle cx="47" cy="61" r="4"/><path d="M89 53 L75 58"/><circle cx="81" cy="61" r="4"/></g>
  const r = kind === 'wide' ? 7 : 5
  return <g transform={transform}><circle className="v3-eye-white" cx="47" cy="59" r={r + 2}/><circle className="v3-eye" cx="47" cy="59" r={r}/><circle className="v3-eye-glint" cx="45" cy="56" r="1.8"/><circle className="v3-eye-white" cx="81" cy="59" r={r + 2}/><circle className="v3-eye" cx="81" cy="59" r={r}/><circle className="v3-eye-glint" cx="79" cy="56" r="1.8"/></g>
}

function Mouth({ kind }: { kind: 'smile' | 'open' | 'flat' | 'frown' | 'o' | 'smirk' }) {
  if (kind === 'open') return <g><path className="v3-mouth-fill" d="M54 76 Q64 87 74 76 Q72 91 64 92 Q56 91 54 76Z"/><path d="M54 76 Q64 87 74 76"/></g>
  if (kind === 'flat') return <path d="M57 80 Q64 78 71 80"/>
  if (kind === 'frown') return <path d="M56 84 Q64 76 72 84"/>
  if (kind === 'o') return <ellipse className="v3-mouth-fill" cx="64" cy="81" rx="6" ry="8"/>
  if (kind === 'smirk') return <path d="M56 80 Q65 86 73 78"/>
  return <path d="M55 78 Q64 88 73 78"/>
}

function Face({ expression, eyeX, eyeY }: { expression: Expression; eyeX?: number; eyeY?: number }) {
  const face = FACE[expression] ?? FACE.neutral
  return <g className="v3-face">
    <Eyes kind={face.eye} eyeX={eyeX} eyeY={eyeY}/>
    <Mouth kind={face.mouth}/>
    {face.blush && <g className="v3-blush"><ellipse cx="35" cy="72" rx="8" ry="4"/><ellipse cx="93" cy="72" rx="8" ry="4"/></g>}
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
      {character === 'gremlin' && <g className="v3-body"><path className="v3-primary" d="M30 47 Q20 36 29 23 Q43 29 48 38 Q63 31 80 38 Q87 26 100 22 Q108 37 97 48 Q106 65 97 91 Q90 111 64 114 Q37 112 30 92 Q20 67 30 47Z"/><path className="v3-secondary" d="M43 100 Q64 112 85 100 Q79 117 64 120 Q49 117 43 100Z"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
      {character === 'pebblebot' && <g className="v3-body"><rect className="v3-secondary" x="36" y="28" width="56" height="72" rx="22"/><rect className="v3-primary" x="29" y="39" width="70" height="57" rx="20"/><path className="v3-secondary" d="M64 28 V17"/><circle className="v3-primary" cx="64" cy="14" r="6"/><rect className="v3-secondary" x="47" y="97" width="12" height="17" rx="5"/><rect className="v3-secondary" x="69" y="97" width="12" height="17" rx="5"/><Face expression={faceExpression} eyeX={eyeX} eyeY={eyeY}/></g>}
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
