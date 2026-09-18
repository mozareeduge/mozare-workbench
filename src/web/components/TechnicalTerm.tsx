import { useState } from 'react';

/**
 * TechnicalTerm (TASK-P04-02, SCN-TEC-02, ORACLE-016).
 *
 * A glossary chip: the term renders inline; clicking opens a popover with the
 * plain system meaning, why it matters, and optional exact detail.
 */

export type TechnicalTermProps = {
  term: string;
  plain_system_meaning: string;
  why_it_matters: string;
  exact_detail?: string | null;
};

export function TechnicalTerm({ term, plain_system_meaning, why_it_matters, exact_detail }: TechnicalTermProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className="technical-term">
      <button
        type="button"
        className="term-chip"
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {term}
      </button>
      {open && (
        <div className="term-popover" role="dialog" aria-label={`Term: ${term}`}>
          <p className="term-name">{term}</p>
          <p>
            <strong>Plain meaning:</strong> {plain_system_meaning}
          </p>
          <p>
            <strong>Why it matters:</strong> {why_it_matters}
          </p>
          {exact_detail && (
            <p>
              <strong>Exact detail:</strong> {exact_detail}
            </p>
          )}
          <button type="button" className="text-action" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </span>
  );
}
