import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const SAFE_URL_PREFIXES = ['https://', 'http://'];
const BOLD_MARKER_LEN = 2;
const BOLD_MIN_LEN = 4;
const INLINE_MARKER_LEN = 1;
const INLINE_MIN_LEN = 2;
const REGEX_GROUP_SECOND = 2;
const DEFAULT_HEADING_LEVEL = 3;

function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return SAFE_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Renders inline Markdown tokens (`**bold**`, `*italic*`, `` `code` ``, `[label](https://...)`)
 * purely as React elements — never uses `dangerouslySetInnerHTML`.
 */
function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > BOLD_MIN_LEN) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(BOLD_MARKER_LEN, -BOLD_MARKER_LEN)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > INLINE_MIN_LEN) {
      return <em key={idx}>{part.slice(INLINE_MARKER_LEN, -INLINE_MARKER_LEN)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > INLINE_MIN_LEN) {
      return (
        <code key={idx} className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(INLINE_MARKER_LEN, -INLINE_MARKER_LEN)}
        </code>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const label = linkMatch[1] ?? '';
      const href = linkMatch[REGEX_GROUP_SECOND] ?? '';
      if (isSafeUrl(href)) {
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {label}
          </a>
        );
      }
      return <Fragment key={idx}>{label}</Fragment>;
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

/**
 * Safe, zero-dependency Markdown renderer for Sales Agent chat bubbles (headings, lists, bold,
 * italic, inline code, safe http/https links, and paragraphs).
 */
export function SafeMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let lineIdx = 0;

  while (lineIdx < lines.length) {
    const line = lines[lineIdx] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      lineIdx += 1;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? DEFAULT_HEADING_LEVEL;
      const content = headingMatch[REGEX_GROUP_SECOND] ?? '';
      blocks.push(
        <p
          key={`h-${lineIdx}`}
          className={cn('font-semibold', level === 1 ? 'text-base' : 'text-sm')}
        >
          {renderInline(content)}
        </p>,
      );
      lineIdx += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      const start = lineIdx;
      while (lineIdx < lines.length && /^[-*•]\s+/.test((lines[lineIdx] ?? '').trim())) {
        const itemText = (lines[lineIdx] ?? '').trim().replace(/^[-*•]\s+/, '');
        items.push(<li key={`ul-${lineIdx}`}>{renderInline(itemText)}</li>);
        lineIdx += 1;
      }
      blocks.push(
        <ul key={`ul-block-${start}`} className="list-disc space-y-1 pl-4">
          {items}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      const start = lineIdx;
      while (lineIdx < lines.length && /^\d+\.\s+/.test((lines[lineIdx] ?? '').trim())) {
        const itemText = (lines[lineIdx] ?? '').trim().replace(/^\d+\.\s+/, '');
        items.push(<li key={`ol-${lineIdx}`}>{renderInline(itemText)}</li>);
        lineIdx += 1;
      }
      blocks.push(
        <ol key={`ol-block-${start}`} className="list-decimal space-y-1 pl-4">
          {items}
        </ol>,
      );
      continue;
    }

    const paraLines: string[] = [];
    const start = lineIdx;
    while (
      lineIdx < lines.length &&
      (lines[lineIdx] ?? '').trim().length > 0 &&
      !/^(#{1,3}\s+|[-*•]\s+|\d+\.\s+)/.test((lines[lineIdx] ?? '').trim())
    ) {
      paraLines.push(lines[lineIdx] ?? '');
      lineIdx += 1;
    }
    blocks.push(
      <p key={`p-${start}`} className="leading-relaxed">
        {paraLines.map((pLine, pIdx) => (
          <Fragment key={pIdx}>
            {pIdx > 0 && <br />}
            {renderInline(pLine)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className={cn('flex flex-col gap-1.5 break-words', className)}>{blocks}</div>;
}
