import { useState } from 'react';
import { TechnicalTerm } from './TechnicalTerm';

/**
 * SystemLadder (TASK-P04-02, ORACLE-016, SCN-TEC-01/05).
 *
 * Technical output is progressive: Intent → Behavior → Architecture →
 * Implementation → Verification. Plain system behavior comes first;
 * implementation detail and logs are disclosed on demand. Raw logs never
 * stream into the primary surface — they render collapsed/lazy (ORACLE-026).
 */

export type LadderSection = {
  title: 'Intent' | 'Behavior' | 'Architecture' | 'Implementation' | 'Verification';
  /** Plain-language content; lines are kept ≤70 chars by the producer. */
  lines: string[];
  /** Verification-only: an oversized log rendered lazily on expand. */
  log?: string[];
};

export type SystemLadderProps = {
  sections: LadderSection[];
  /** Terms available as glossary chips inside section text. */
  terms?: Array<{ term: string; plain_system_meaning: string; why_it_matters: string; exact_detail?: string | null }>;
};

const SECTION_ORDER: LadderSection['title'][] = ['Intent', 'Behavior', 'Architecture', 'Implementation', 'Verification'];

export function SystemLadder({ sections, terms = [] }: SystemLadderProps) {
  const ordered = [...sections].sort((a, b) => SECTION_ORDER.indexOf(a.title) - SECTION_ORDER.indexOf(b.title));
  return (
    <section className="system-ladder" aria-label="System view">
      {ordered.map((section) => (
        <SystemLadderSection key={section.title} section={section} terms={terms} />
      ))}
    </section>
  );
}

function SystemLadderSection({ section, terms }: { section: LadderSection; terms: SystemLadderProps['terms'] }) {
  const [logOpen, setLogOpen] = useState(false);
  return (
    <div className="ladder-section">
      <h4>{section.title}</h4>
      {section.title === 'Intent' && (
        <p data-testid="ladder-intent">
          {section.lines.map((line, i) => (
            <span key={i}>
              {line}
              {'\n'}
            </span>
          ))}
        </p>
      )}
      {section.title !== 'Intent' && (
        <ul>
          {section.lines.map((line, i) => (
            <li key={i}>
              <TermChipText line={line} terms={terms ?? []} />
            </li>
          ))}
        </ul>
      )}
      {section.log && (
        <>
          <button type="button" className="text-action" onClick={() => setLogOpen(true)}>
            Verification log ({section.log.length} lines, collapsed)
          </button>
          {logOpen && (
            <pre data-testid="ladder-log" className="ladder-log">
              {section.log.join('\n')}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

/** Renders glossary chips for known terms inside a line; plain text otherwise. */
function TermChipText({ line, terms }: { line: string; terms: NonNullable<SystemLadderProps['terms']> }) {
  type TermEntry = NonNullable<SystemLadderProps['terms']>[number];
  let segments: Array<{ text: string; term?: TermEntry }> = [{ text: line }];
  for (const t of terms) {
    segments = segments.flatMap((seg) => {
      if (seg.term || !seg.text.includes(t.term)) return [seg];
      const parts = seg.text.split(t.term);
      const out: Array<{ text: string; term?: TermEntry }> = [];
      parts.forEach((part, i) => {
        if (part) out.push({ text: part });
        if (i < parts.length - 1) out.push({ text: t.term, term: t });
      });
      return out;
    });
  }
  return (
    <>
      {segments.map((seg, i) =>
        seg.term ? (
          <TechnicalTerm
            key={i}
            term={seg.term.term}
            plain_system_meaning={seg.term.plain_system_meaning}
            why_it_matters={seg.term.why_it_matters}
            exact_detail={seg.term.exact_detail ?? null}
          />
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
