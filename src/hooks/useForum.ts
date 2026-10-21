// Community forum of the "Partager" tab.
// ⚠ Local only: messages live in React state and disappear on reload; the two seed messages are demo content.
import { useState } from 'react';

export interface ForumMessage {
  id: number;
  author: string;
  initials: string;
  avatarBg: string;
  time: string;
  badge: string;
  bubbleStyle: string;
  content: string;
}

const SEED_MESSAGES: ForumMessage[] = [
  {
    id: 1,
    author: 'Ifremer_Toulon',
    initials: 'IF',
    avatarBg: 'bg-sky-200 text-sky-700',
    time: 'Il y a 2 heures',
    badge: '',
    bubbleStyle: 'bg-white border-slate-200',
    content:
      'Le pic est particulièrement sévère. Nos capteurs in-situ COAST-HF relèvent une plongée de la thermocline à -35m. Risque imminent de nécrose pour les gorgones de la zone.',
  },
  {
    id: 2,
    author: 'Noah (Admin)',
    initials: 'NG',
    avatarBg: 'bg-amber-200 text-amber-700',
    time: 'Il y a 45 min',
    badge: 'Mod',
    bubbleStyle: 'bg-blue-50 border-blue-100',
    content:
      "Merci pour l'alerte ! Les données Copernicus NRT d'aujourd'hui confirment un écart critique au P90. Le JSON a été mis à jour sur l'API.",
  },
];

export function useForum() {
  const [messages, setMessages] = useState<ForumMessage[]>(SEED_MESSAGES);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: 'Vous (Observateur)',
        initials: 'VO',
        avatarBg: 'bg-emerald-200 text-emerald-700',
        time: "À l'instant",
        badge: '',
        bubbleStyle: 'bg-white border-slate-200',
        content: input,
      },
    ]);
    setInput('');
  };

  return { messages, input, setInput, send };
}

export type ForumState = ReturnType<typeof useForum>;
