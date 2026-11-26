import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-slate-900/90 border border-slate-700/70 px-1.5 py-0.5 text-[12px] font-mono text-cyan-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function MarkdownLite({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      {blocks.map((block, idx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const inner = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-lg border border-slate-800 bg-[#05080d] p-3 text-xs font-mono text-emerald-300"
            >
              {inner}
            </pre>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-line">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
