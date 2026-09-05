import { PromptInspiration } from '../types';

export const PROMPT_INSPIRATIONS: PromptInspiration[] = [
  {
    id: 'gratitude-shift',
    title: 'Perspective & Gratitude',
    category: 'Gratitude',
    description: 'Reflect on subtle moments of joy or strength from today.',
    prompt: 'What was a small moment today that brought you a sense of calm, peace, or unexpected joy? What made it meaningful?',
  },
  {
    id: 'overcoming-hurdle',
    title: 'Navigating a Dilemma',
    category: 'Problem-Solving',
    description: 'Unpack a difficult decision or feeling of friction with clarity.',
    prompt: "I am facing a challenging situation or decision right now. Here is what is happening and the emotions I'm noticing: ",
  },
  {
    id: 'brainstorm-spark',
    title: 'Creative Brainstorming',
    category: 'Creativity',
    description: 'Explore an ambitious idea and unlock new creative angles.',
    prompt: "I have an exciting project or idea I want to develop. Let's brainstorm angles, unexpected connections, and next steps: ",
  },
  {
    id: 'evening-reflection',
    title: 'Mindful Evening Wind-Down',
    category: 'Mindfulness',
    description: 'Review your mental landscape and let go of lingering tension.',
    prompt: 'How did today feel overall? What drained your energy, what revitalized you, and what are you ready to release before resting?',
  },
  {
    id: 'future-vision',
    title: 'Intentional Clarity',
    category: 'Productivity',
    description: 'Align your actions with what matters most this week.',
    prompt: 'If you could achieve one deeply fulfilling goal this upcoming week, what would it be, and what is the very first step?',
  },
];

export const MOOD_OPTIONS = [
  { label: 'Calm', emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Energized', emoji: '⚡', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Contemplative', emoji: '🌊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Grateful', emoji: '✨', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { label: 'Challenged', emoji: '🏔️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Optimistic', emoji: '🌅', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];
