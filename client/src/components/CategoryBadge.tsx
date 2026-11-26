import {
  Binary,
  Cpu,
  Eye,
  Globe,
  KeyRound,
  Radar,
  Search,
  Sparkles,
} from 'lucide-react';

export const CATEGORY_META: Record<
  string,
  { color: string; bg: string; border: string; accentHex: string; label: string }
> = {
  Crypto: {
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    accentHex: '#f59e0b',
    label: 'Cryptography',
  },
  Stego: {
    color: 'text-fuchsia-300',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    accentHex: '#d946ef',
    label: 'Steganography',
  },
  OSINT: {
    color: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    accentHex: '#38bdf8',
    label: 'OSINT',
  },
  Web: {
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    accentHex: '#10b981',
    label: 'Web Exploitation',
  },
  Rev: {
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    accentHex: '#8b5cf6',
    label: 'Reverse Eng',
  },
  Pwn: {
    color: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    accentHex: '#f43f5e',
    label: 'Binary Pwn',
  },
  Forensics: {
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    accentHex: '#06b6d4',
    label: 'Digital Forensics',
  },
  Misc: {
    color: 'text-lime-300',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/30',
    accentHex: '#84cc16',
    label: 'Misc / PPC',
  },
};

export function CategoryIcon({ category, className = 'w-4 h-4' }: { category: string; className?: string }) {
  switch (category) {
    case 'Crypto':
      return <KeyRound className={className} />;
    case 'Stego':
      return <Eye className={className} />;
    case 'OSINT':
      return <Radar className={className} />;
    case 'Web':
      return <Globe className={className} />;
    case 'Rev':
      return <Cpu className={className} />;
    case 'Pwn':
      return <Binary className={className} />;
    case 'Forensics':
      return <Search className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    Easy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    Medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    Hard: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    Insane: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider ${
        styles[difficulty] || styles.Medium
      }`}
    >
      {difficulty}
    </span>
  );
}
