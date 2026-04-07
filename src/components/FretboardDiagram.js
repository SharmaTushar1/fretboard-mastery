import React from 'react';
import { getNoteAtFret } from '../lib/fretboard';

const STRINGS = [6, 5, 4, 3, 2, 1];

/**
 * @param {Object} props
 * @param {number} props.maxFret
 * @param {function(number, number): { inScale: boolean, isRoot: boolean, inActiveBox: boolean }} props.getCellMeta
 */
function FretboardDiagram({ maxFret, getCellMeta }) {
  const frets = Array.from({ length: maxFret + 1 }, (_, i) => i);

  return (
    <div className="overflow-x-auto pb-2 -mx-1" role="region" aria-label="Fretboard map">
      <table className="border-collapse text-xs min-w-max w-full" role="grid">
        <thead>
          <tr>
            <th className="p-1 w-8 text-white/50 font-normal text-left sticky left-0 bg-slate-900/90 z-10">
              Str
            </th>
            {frets.map((f) => (
              <th key={f} className="p-1 px-1.5 text-white/60 font-semibold min-w-[2.25rem]">
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STRINGS.map((s) => (
            <tr key={s} role="row">
              <td
                className="p-1 text-white/70 font-medium sticky left-0 bg-slate-900/90 z-10 pr-2"
                role="rowheader"
              >
                {s}
              </td>
              {frets.map((f) => {
                const note = getNoteAtFret(s, f);
                const meta = getCellMeta(s, f);
                const { inScale, isRoot, inActiveBox } = meta;

                let cellClass =
                  'p-1 text-center rounded min-w-[2.25rem] border border-white/10 ';
                if (!inScale) {
                  cellClass += 'text-white/30 bg-black/25 ';
                } else if (isRoot) {
                  cellClass +=
                    'bg-amber-500/55 border-amber-400 font-bold text-white ring-2 ring-amber-300 z-[1] relative ';
                } else if (inActiveBox) {
                  cellClass +=
                    'bg-cyan-500/25 text-white border-cyan-400/90 ring-2 ring-cyan-400/90 ring-inset font-semibold ';
                } else {
                  cellClass += 'text-white/75 bg-white/5 ';
                }

                const aria =
                  isRoot
                    ? `Root ${note} string ${s} fret ${f}`
                    : inActiveBox
                      ? `${note} in active box, string ${s} fret ${f}`
                      : `${note} string ${s} fret ${f}`;

                return (
                  <td key={`${s}-${f}`} role="gridcell" aria-label={aria} className={cellClass}>
                    {note}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FretboardDiagram;
