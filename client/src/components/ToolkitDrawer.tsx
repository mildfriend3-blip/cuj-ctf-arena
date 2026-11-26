import { useState } from 'react';
import { ArrowRightLeft, Copy, Check, Wrench, X } from 'lucide-react';

type ToolMode = 'base64' | 'hex' | 'le64' | 'rot13' | 'xor' | 'sha256';

function decodeRot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function decodeLeHexChunks(raw: string): string {
  const tokens = raw
    .trim()
    .split(/[\s.,;|]+/)
    .filter(Boolean);
  return tokens
    .map((tok) => {
      const clean = tok.replace(/^0x/i, '');
      const padded = clean.length % 2 === 1 ? '0' + clean : clean;
      const bytes: number[] = [];
      for (let i = padded.length - 2; i >= 0; i -= 2) {
        const b = parseInt(padded.slice(i, i + 2), 16);
        if (!Number.isNaN(b) && b !== 0) bytes.push(b);
      }
      return bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    })
    .join('');
}

export function ToolkitDrawer({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<ToolMode>('base64');
  const [input, setInput] = useState('');
  const [xorKey, setXorKey] = useState('CUJ!');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  async function runTransform(direction: 'decode' | 'encode') {
    try {
      if (mode === 'base64') {
        if (direction === 'decode') {
          setOutput(new TextDecoder().decode(Uint8Array.from(atob(input.trim()), (c) => c.charCodeAt(0))));
        } else {
          const bytes = new TextEncoder().encode(input);
          setOutput(btoa(String.fromCharCode(...bytes)));
        }
      } else if (mode === 'hex') {
        if (direction === 'decode') {
          const clean = input.replace(/[^0-9a-fA-F]/g, '');
          const bytes = [];
          for (let i = 0; i < clean.length; i += 2) {
            bytes.push(parseInt(clean.slice(i, i + 2), 16));
          }
          setOutput(new TextDecoder().decode(new Uint8Array(bytes)));
        } else {
          const bytes = new TextEncoder().encode(input);
          setOutput(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''));
        }
      } else if (mode === 'le64') {
        setOutput(decodeLeHexChunks(input));
      } else if (mode === 'rot13') {
        setOutput(decodeRot13(input));
      } else if (mode === 'xor') {
        const keyBytes = new TextEncoder().encode(xorKey || 'A');
        const raw =
          direction === 'decode'
            ? Uint8Array.from(atob(input.trim()), (c) => c.charCodeAt(0))
            : new TextEncoder().encode(input);
        const res = raw.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
        setOutput(
          direction === 'decode'
            ? new TextDecoder().decode(res)
            : btoa(String.fromCharCode(...res))
        );
      } else if (mode === 'sha256') {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        setOutput(Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''));
      }
    } catch (err) {
      setOutput(`[Transform Error] ${err instanceof Error ? err.message : 'Invalid input for selected codec'}`);
    }
  }

  function copyOut() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.08] bg-[#080c14]/95 shadow-2xl backdrop-blur-xl animate-modal-in">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-300">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">CyberOps Decoder Toolkit</h3>
            <p className="text-[11px] text-slate-400">Local browser scratchpad for flags &amp; leaks</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'base64', label: 'Base64' },
            { id: 'hex', label: 'Hex ↔ Text' },
            { id: 'le64', label: 'LE Stack Hex' },
            { id: 'rot13', label: 'ROT13' },
            { id: 'xor', label: 'XOR + B64' },
            { id: 'sha256', label: 'SHA-256' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id as ToolMode);
                setOutput('');
              }}
              className={`rounded-lg px-2.5 py-2 text-xs font-mono transition ${
                mode === m.id
                  ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border border-white/[0.06] bg-[#0c121d] text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'le64' && (
          <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-200/90">
            Paste little-endian stack leak hex words separated by dots or spaces (e.g.{' '}
            <code className="font-mono">0x30667b4654434a55.0x...</code>) to unpack ASCII directly.
          </p>
        )}

        {mode === 'xor' && (
          <div>
            <label className="mb-1 block text-xs font-mono text-slate-400">Repeating Key (ASCII)</label>
            <input
              value={xorKey}
              onChange={(e) => setXorKey(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-[#05070b] px-3 py-2 text-xs font-mono text-amber-300 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Input</label>
          <textarea
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste ciphertext, hex dump, Base64, or stack pointer leak..."
            className="w-full rounded-xl border border-slate-700/80 bg-[#05070b] p-3 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => runTransform('decode')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {mode === 'sha256' ? 'Compute SHA-256' : mode === 'le64' ? 'Unpack Little-Endian' : 'Decode'}
          </button>
          {(mode === 'base64' || mode === 'hex' || mode === 'xor') && (
            <button
              type="button"
              onClick={() => runTransform('encode')}
              className="rounded-xl border border-slate-700 bg-[#0c121d] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
            >
              Encode
            </button>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400">Output</label>
            {output && (
              <button
                type="button"
                onClick={copyOut}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <pre className="min-h-[120px] max-h-60 overflow-auto rounded-xl border border-white/[0.07] bg-[#04060a] p-3 text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all">
            {output || '// Output will appear here'}
          </pre>
        </div>
      </div>
    </div>
  );
}
