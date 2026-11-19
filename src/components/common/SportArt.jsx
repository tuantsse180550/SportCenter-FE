// Flat sport illustrations in the ActiveHub (Figma) style, used as default class covers.
// Each art fills a 320×180 box; covers crop it with preserveAspectRatio="slice".

import { sportKey } from '../../utils/sport';

const Sparkles = ({ color = '#F0925B' }) => (
  <>
    <path d="M38 40h12m-6-6v12 M276 150h10m-5-5v10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="70" cy="140" r="4" fill={color} opacity=".55" />
    <circle cx="292" cy="38" r="3" fill={color} />
  </>
);

const ARTS = {
  tabletennis: (
    <>
      <rect width="320" height="180" fill="#FFF0E1" />
      <circle cx="210" cy="86" r="78" fill="#FCE3D0" />
      <path d="m62 132 116-52 100 50-118 52z" fill="#3E6E5A" stroke="#fff" strokeWidth="2.5" />
      <path d="m110 154 116-52v-16l-116 52z" fill="#FCF7EB" fillOpacity=".75" stroke="#fff" strokeWidth="1.5" />
      <path d="M78 140v22m186-28v22" stroke="#345B4B" strokeWidth="5" />
      <ellipse cx="236" cy="52" rx="20" ry="26" transform="rotate(35 236 52)" fill="#F05A28" />
      <path d="m221 72-15 20" stroke="#513A2D" strokeWidth="8" strokeLinecap="round" />
      <circle cx="186" cy="44" r="6" fill="#fff" />
      <Sparkles />
    </>
  ),
  badminton: (
    <>
      <rect width="320" height="180" fill="#E6F5EC" />
      <circle cx="170" cy="92" r="76" fill="#CFEBD9" />
      <ellipse cx="128" cy="70" rx="26" ry="34" transform="rotate(-30 128 70)" fill="none" stroke="#2C7A4F" strokeWidth="6" />
      <path d="M118 64l22 12M112 76l22 12M124 52l22 12M120 86l16-28M110 80l16-28M130 92l16-28" stroke="#7FC29A" strokeWidth="1.5" />
      <path d="m146 100 32 52" stroke="#513A2D" strokeWidth="7" strokeLinecap="round" />
      <path d="M226 62l20 34-34 4z" fill="#fff" stroke="#BFDCCB" strokeWidth="1.5" />
      <path d="M216 66l14 26M236 60l2 32" stroke="#D5E9DD" />
      <circle cx="224" cy="104" r="8" fill="#F05A28" />
      <Sparkles color="#3FA36B" />
    </>
  ),
  tennis: (
    <>
      <rect width="320" height="180" fill="#F2F8E3" />
      <circle cx="170" cy="92" r="76" fill="#E1EFC4" />
      <ellipse cx="140" cy="72" rx="30" ry="38" transform="rotate(-25 140 72)" fill="#fff" stroke="#3E6E5A" strokeWidth="7" />
      <path d="M126 50l30 18M120 64l30 18M118 80l30 18M132 42l-12 52M146 46l-12 52M160 54l-12 52" stroke="#C9DDB2" strokeWidth="1.5" />
      <path d="m160 106 26 46" stroke="#513A2D" strokeWidth="8" strokeLinecap="round" />
      <circle cx="228" cy="96" r="20" fill="#D7E84B" />
      <path d="M212 86c10 4 22 4 32-6M212 106c10-4 22-4 32 6" stroke="#fff" strokeWidth="2.5" fill="none" />
      <Sparkles color="#8DB33A" />
    </>
  ),
  yoga: (
    <>
      <rect width="320" height="180" fill="#EEEBFB" />
      <circle cx="160" cy="88" r="78" fill="#DCD5F7" />
      <path d="M70 150h180" stroke="#B9AEEB" strokeWidth="2" strokeDasharray="4 6" />
      <rect x="92" y="138" width="136" height="12" rx="6" fill="#8B6FD6" />
      <circle cx="160" cy="54" r="12" fill="#5B47B0" />
      <path d="M160 68v34" stroke="#5B47B0" strokeWidth="10" strokeLinecap="round" />
      <path d="M160 76 126 58M160 76l34-18" stroke="#5B47B0" strokeWidth="7" strokeLinecap="round" />
      <path d="M160 102c-18 4-34 14-40 30h80c-6-16-22-26-40-30z" fill="#7D66D0" />
      <circle cx="236" cy="60" r="14" fill="#F9C9A4" />
      <path d="M232 46c4-10 12-12 18-8" stroke="#F09B66" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Sparkles color="#8B6FD6" />
    </>
  ),
  pilates: (
    <>
      <rect width="320" height="180" fill="#FCEBF1" />
      <circle cx="170" cy="90" r="76" fill="#F7D3E0" />
      <rect x="70" y="136" width="150" height="12" rx="6" fill="#D46A8F" />
      <circle cx="226" cy="108" r="34" fill="#F29DBA" />
      <path d="M196 98c18-10 40-10 60 0M198 120c18 8 38 8 56 0" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" />
      <rect x="96" y="70" width="14" height="40" rx="7" fill="#7A3552" />
      <rect x="120" y="58" width="14" height="52" rx="7" fill="#9B4A6B" />
      <path d="M90 112h56" stroke="#7A3552" strokeWidth="4" strokeLinecap="round" />
      <Sparkles color="#D46A8F" />
    </>
  ),
  baseball: (
    <>
      <rect width="320" height="180" fill="#E6F2F5" />
      <circle cx="166" cy="90" r="78" fill="#CBE3EA" />
      <path d="M96 150 160 92l64 58z" fill="#C98F5E" opacity=".45" />
      <path d="M150 140l10-8 10 8-10 8z" fill="#fff" />
      <path d="m84 40 92 92" stroke="#B7814F" strokeWidth="12" strokeLinecap="round" />
      <path d="m84 40 30 30" stroke="#8C5A31" strokeWidth="14" strokeLinecap="round" />
      <circle cx="226" cy="70" r="22" fill="#fff" stroke="#DDE7EA" strokeWidth="2" />
      <path d="M210 56c8 8 8 20 0 28M242 56c-8 8-8 20 0 28" stroke="#E0533A" strokeWidth="2" fill="none" strokeDasharray="3 3" />
      <Sparkles color="#3F86D6" />
    </>
  ),
  boxing: (
    <>
      <rect width="320" height="180" fill="#FDECEA" />
      <circle cx="160" cy="88" r="78" fill="#F9D4CF" />
      <path d="M104 64c0-20 16-32 36-32s34 12 34 34v36c0 10-8 18-18 18h-34c-10 0-18-8-18-18z" fill="#D9473A" />
      <path d="M100 82c-12 0-18 8-18 18s8 16 18 16" fill="#B83A2F" />
      <rect x="112" y="118" width="54" height="20" rx="6" fill="#fff" />
      <path d="M180 74c0-20 16-32 36-32s32 14 32 34v34c0 10-8 18-18 18h-32c-10 0-18-8-18-18z" fill="#E85D4F" />
      <rect x="188" y="126" width="52" height="20" rx="6" fill="#fff" />
      <path d="M124 48c8-6 22-8 32-2M200 58c8-6 22-8 32-2" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" fill="none" />
      <Sparkles color="#E0533A" />
    </>
  ),
  football: (
    <>
      <rect width="320" height="180" fill="#E8F5E9" />
      <path d="M0 132h320v48H0z" fill="#9BCF8E" />
      <path d="M0 132h320" stroke="#fff" strokeWidth="3" />
      <path d="M180 132V60h100v72" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M186 66h88v66M196 66v66M212 66v66M228 66v66M244 66v66M260 66v66M186 84h88M186 102h88M186 120h88" stroke="#fff" strokeOpacity=".55" />
      <circle cx="110" cy="112" r="28" fill="#fff" stroke="#2D3B33" strokeWidth="2" />
      <path d="m110 98 12 9-5 14h-14l-5-14z" fill="#2D3B33" />
      <path d="M110 84v14M122 107l14-4M117 121l8 12M103 121l-8 12M98 107l-14-4" stroke="#2D3B33" strokeWidth="2" />
      <Sparkles color="#3FA36B" />
    </>
  ),
  basketball: (
    <>
      <rect width="320" height="180" fill="#FFF0E1" />
      <circle cx="170" cy="92" r="78" fill="#FCE3D0" />
      <rect x="200" y="30" width="80" height="54" rx="4" fill="#fff" stroke="#E9BA98" strokeWidth="3" />
      <rect x="226" y="52" width="28" height="20" fill="none" stroke="#F05A28" strokeWidth="3" />
      <path d="M222 84h36" stroke="#F05A28" strokeWidth="5" strokeLinecap="round" />
      <path d="M226 88l6 26 10-26 10 26 6-26" stroke="#E9BA98" strokeWidth="2" fill="none" />
      <circle cx="126" cy="112" r="32" fill="#F07A2E" />
      <path d="M94 112h64M126 80v64M104 88c14 14 14 34 0 48M148 88c-14 14-14 34 0 48" stroke="#5A2E14" strokeWidth="2.5" fill="none" />
      <Sparkles />
    </>
  ),
  swimming: (
    <>
      <rect width="320" height="180" fill="#E7F0FB" />
      <circle cx="166" cy="80" r="70" fill="#CFE0F6" />
      <path d="M0 116c26-12 52-12 80 0s54 12 80 0 54-12 80 0 54 12 80 0v64H0z" fill="#3F86D6" />
      <path d="M0 136c26-12 52-12 80 0s54 12 80 0 54-12 80 0 54 12 80 0" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" />
      <path d="M0 156c26-12 52-12 80 0s54 12 80 0 54-12 80 0 54 12 80 0" stroke="#fff" strokeWidth="2" fill="none" opacity=".45" />
      <rect x="116" y="56" width="34" height="24" rx="12" fill="#2F66A8" />
      <rect x="170" y="56" width="34" height="24" rx="12" fill="#2F66A8" />
      <circle cx="133" cy="68" r="7" fill="#9EC5F1" />
      <circle cx="187" cy="68" r="7" fill="#9EC5F1" />
      <path d="M150 68h20M116 66c-10 0-18 4-22 10M204 66c10 0 18 4 22 10" stroke="#2F66A8" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Sparkles color="#3F86D6" />
    </>
  ),
  gym: (
    <>
      <rect width="320" height="180" fill="#F1EFEA" />
      <circle cx="160" cy="88" r="76" fill="#E3DED4" />
      <path d="M100 96h120" stroke="#6B6157" strokeWidth="8" strokeLinecap="round" />
      <rect x="78" y="62" width="18" height="68" rx="5" fill="#3D3631" />
      <rect x="96" y="72" width="12" height="48" rx="4" fill="#F05A28" />
      <rect x="224" y="62" width="18" height="68" rx="5" fill="#3D3631" />
      <rect x="212" y="72" width="12" height="48" rx="4" fill="#F05A28" />
      <path d="M130 140h60" stroke="#C9BFB2" strokeWidth="4" strokeLinecap="round" />
      <Sparkles />
    </>
  ),
  generic: (
    <>
      <rect width="320" height="180" fill="#FFF6EE" />
      <circle cx="160" cy="90" r="76" fill="#FCE3D0" />
      <circle cx="150" cy="96" r="38" fill="#fff" stroke="#E9BA98" strokeWidth="5" />
      <path d="M150 96V72M150 96l16 10" stroke="#F05A28" strokeWidth="5" strokeLinecap="round" />
      <rect x="140" y="46" width="20" height="10" rx="3" fill="#E9BA98" />
      <path d="M206 64l26-14M214 80l30-4" stroke="#F0925B" strokeWidth="4" strokeLinecap="round" />
      <Sparkles />
    </>
  ),
};

/** Default class/course cover for a sport. `subject` is the subject (môn) name. */
export default function SportArt({ subject, className = '', fit = 'cover' }) {
  return (
    <svg viewBox="0 0 320 180" className={`sport-art ${className}`} preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'} fill="none" aria-hidden="true">
      {ARTS[sportKey(subject)]}
    </svg>
  );
}
