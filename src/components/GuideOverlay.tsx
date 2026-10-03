import { useRef } from 'react';
import { useGuideStore } from '../store/uiStore';

/**
 * The in-app user guide.
 *
 * Written to be read, not skimmed past: one screenful per section, a jump list
 * on the left at lg, and every key and token shown literally rather than
 * described in prose. Sections are ordered by when a new user needs them —
 * making a list, then adding tasks, then the views that read them back.
 *
 * Mounted outside <Canvas />, like every other overlay: `.canvas-content`
 * carries a transform and would become the containing block for `fixed`.
 */

const SECTIONS = [
  { id: 'start', title: 'Start here' },
  { id: 'quick-add', title: 'Add tasks fast' },
  { id: 'keys', title: 'Keyboard shortcuts' },
  { id: 'views', title: 'The three views' },
  { id: 'tasks', title: 'Lists and tasks' },
  { id: 'status', title: 'Marking progress' },
  { id: 'fields', title: 'Dates and priority' },
  { id: 'board', title: 'The board canvas' },
];

/** A keyboard key. */
const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-block rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-gray-700 shadow-[inset_0_-1px_0_rgb(0,0,0,0.08)]">
    {children}
  </kbd>
);

/** A literal token or snippet the user types. */
const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-blue-50 px-1.5 py-0.5 text-[12.5px] font-medium text-blue-800">
    {children}
  </code>
);

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section id={`guide-${id}`} className="scroll-mt-4 border-t border-gray-100 pt-7 first:border-0 first:pt-0">
    <h3 className="mb-3 text-lg font-semibold text-gray-900">{title}</h3>
    {/* max-w-prose on the body, not the panel: tables want the full width,
        running text does not. */}
    <div className="space-y-3 text-[13.5px] leading-relaxed text-gray-600">{children}</div>
  </section>
);

/** Two-column reference rows. The left column is always something literal. */
const Ref = ({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) => (
  <dl className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
    {rows.map((row, i) => (
      <div key={i} className="grid grid-cols-[minmax(7.5rem,auto)_1fr] gap-x-4 gap-y-1 px-3 py-2 odd:bg-gray-50/60">
        <dt className="flex flex-wrap items-center gap-1 leading-6">{row[0]}</dt>
        <dd className="leading-6 text-gray-600">{row[1]}</dd>
      </div>
    ))}
  </dl>
);

export const GuideOverlay = () => {
  const closeGuide = useGuideStore((s) => s.closeGuide);
  const scrollRef = useRef<HTMLDivElement>(null);

  // scrollIntoView rather than a #hash: the sections live inside this panel's
  // own scroller, and a hash would also push history entries for a dialog.
  const jumpTo = (id: string) => {
    scrollRef.current
      ?.querySelector(`#guide-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={closeGuide} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to use this app"
        tabIndex={-1}
        // Escape is handled here rather than on window: React attaches at the
        // root container, so a window listener could not preempt anything
        // inside the dialog.
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeGuide();
          }
        }}
        className="fixed inset-x-0 bottom-0 top-8 z-[90] mx-auto flex w-[min(60rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:inset-y-10 sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">How to use this app</h2>
            <p className="text-xs text-gray-500">
              Everything in one page. Press <Kbd>?</Kbd> any time to reopen it.
            </p>
          </div>
          <button
            type="button"
            onClick={closeGuide}
            aria-label="Close guide"
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Jump list. Hidden below lg, where it would cost more width than the
              scrolling it saves. */}
          <nav
            aria-label="Guide sections"
            className="hidden w-52 shrink-0 overflow-y-auto border-r border-gray-100 p-3 lg:block"
          >
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(s.id)}
                className="flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="text-[11px] tabular-nums text-gray-400">{i + 1}</span>
                {s.title}
              </button>
            ))}
          </nav>

          <div ref={scrollRef} className="min-w-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            <Section id="start" title="Start here">
              <p>Three things and you are running:</p>
              <ol className="ml-4 list-decimal space-y-2">
                <li>
                  <strong className="font-semibold text-gray-800">Make a list.</strong> On a desktop,
                  right-click anywhere on the empty board and pick{' '}
                  <strong className="font-semibold text-gray-800">New Checklist</strong>. On a phone,
                  tap the <strong className="font-semibold text-gray-800">+</strong> button just above
                  the blue one.
                </li>
                <li>
                  <strong className="font-semibold text-gray-800">Add tasks.</strong> Press{' '}
                  <Kbd>N</Kbd>, type the task, press <Kbd>Enter</Kbd>. The box stays open, so keep
                  typing to add the next one. Every list card also has its own add box at the bottom.
                </li>
                <li>
                  <strong className="font-semibold text-gray-800">Read them back.</strong> Switch
                  between <strong className="font-semibold text-gray-800">Board</strong>,{' '}
                  <strong className="font-semibold text-gray-800">Priority</strong> and{' '}
                  <strong className="font-semibold text-gray-800">Schedule</strong> with the buttons
                  at the top left.
                </li>
              </ol>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                Nothing is ever saved to this device only — your lists live in your account and come
                back on any browser you sign in to.
              </p>
            </Section>

            <Section id="quick-add" title="Add tasks fast">
              <p>
                One line of typing can set the date, the priority and the list. Type the task, then
                add any of the codes below — they can go anywhere in the line and in any order.
              </p>
              <div className="rounded-lg bg-gray-900 px-3.5 py-3 font-mono text-[12.5px] leading-6 text-gray-100">
                call the bank tom !high &amp;quick
              </div>
              <p>
                That makes a task called <em>call the bank</em>, scheduled for tomorrow, high impact,
                quick effort. As you type, each code you have used turns into a small chip under the
                box — click the <strong className="font-semibold text-gray-800">×</strong> on a chip
                to undo it.
              </p>

              <h4 className="pt-2 text-[13px] font-semibold uppercase tracking-wide text-gray-400">
                When to do it
              </h4>
              <Ref
                rows={[
                  [<Code key="t">today</Code>, 'Schedules it for today'],
                  [
                    <><Code key="a">tom</Code><Code key="b">tomorrow</Code></>,
                    'Tomorrow',
                  ],
                  [
                    <><Code key="a">mon</Code><Code key="b">fri</Code><Code key="c">saturday</Code></>,
                    'The next one of that weekday — today, if today is that day',
                  ],
                  [<Code key="n">next week</Code>, 'Seven days from today'],
                  [
                    <><Code key="a">+3d</Code><Code key="b">+2w</Code></>,
                    'Three days / two weeks from today',
                  ],
                  [
                    <><Code key="a">oct 15</Code><Code key="b">oct 15 2028</Code></>,
                    'That date. Without a year it picks the next one still to come',
                  ],
                  [<Code key="i">2027-01-15</Code>, 'An exact date'],
                ]}
              />

              <h4 className="pt-2 text-[13px] font-semibold uppercase tracking-wide text-gray-400">
                When it is due
              </h4>
              <p>
                Put <Code>due</Code> in front of any date above to set a deadline instead of a plan:{' '}
                <Code>due fri</Code>, <Code>due oct 15</Code>. You can use both at once —{' '}
                <Code>tom due fri</Code> means <em>I plan to start tomorrow, it must be done by
                Friday</em>.
              </p>

              <h4 className="pt-2 text-[13px] font-semibold uppercase tracking-wide text-gray-400">
                How much it matters
              </h4>
              <Ref
                rows={[
                  [
                    <><Code key="a">!low</Code><Code key="b">!med</Code><Code key="c">!high</Code></>,
                    'Impact — how much difference finishing it makes',
                  ],
                  [
                    <><Code key="a">&amp;quick</Code><Code key="b">&amp;mod</Code><Code key="c">&amp;heavy</Code></>,
                    'Effort — how much work it is',
                  ],
                  [
                    <><Code key="a">#work</Code><Code key="b">#q1-goals</Code></>,
                    'Which list it goes in, by name. Part of the name is enough',
                  ],
                ]}
              />
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[13px]">
                A code only counts when it starts the line or follows a space, so ordinary writing is
                safe: <Code>R&amp;D</Code> and <Code>Tom &amp; Jerry</Code> stay as text. The one
                exception is the word <em>tom</em> on its own — it is read as tomorrow. If you meant
                the name, click the <strong className="font-semibold text-gray-800">×</strong> on the
                date chip.
              </p>
              <p>
                <strong className="font-semibold text-gray-800">Notes</strong> are the one field with
                no code. Add a task first, then open its details to write a note.
              </p>
            </Section>

            <Section id="keys" title="Keyboard shortcuts">
              <Ref
                rows={[
                  [<Kbd key="n">N</Kbd>, 'Open the quick add box, from any view'],
                  [<Kbd key="q">?</Kbd>, 'Open this guide'],
                  [<Kbd key="e">Enter</Kbd>, 'In the add box: add the task and stay open for the next'],
                  [
                    <Kbd key="esc">Esc</Kbd>,
                    'Clear what you typed. Press it again on an empty box to close',
                  ],
                  [
                    <Kbd key="e2">Enter</Kbd>,
                    'On a task in a list: save it and start a new task underneath',
                  ],
                  [
                    <Kbd key="b">Backspace</Kbd>,
                    'On a task you have not typed anything into yet: remove it',
                  ],
                  [
                    <><Kbd key="c">Ctrl</Kbd>/<Kbd key="m">⌘</Kbd> + scroll</>,
                    'Zoom the board in and out',
                  ],
                ]}
              />
            </Section>

            <Section id="views" title="The three views">
              <p>
                The same tasks, read three ways. Switch at the top left; the app remembers which one
                you were in.
              </p>
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-3.5">
                  <h4 className="mb-1 text-[13.5px] font-semibold text-gray-800">Board</h4>
                  <p>
                    Your lists as cards you can arrange freely. This is where you write things down
                    and tick them off.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3.5">
                  <h4 className="mb-1 text-[13.5px] font-semibold text-gray-800">Priority</h4>
                  <p>
                    Answers <em>what should I do next</em>. Tasks that have both an impact and an
                    effort are placed on a nine-box grid, so the high-impact quick wins sit in one
                    corner. Everything still missing one of the two waits in{' '}
                    <strong className="font-semibold text-gray-800">To triage</strong> on the left,
                    where you can set both from the row itself — click a chip again to clear it.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3.5">
                  <h4 className="mb-1 text-[13.5px] font-semibold text-gray-800">Schedule</h4>
                  <p>
                    Answers <em>what is coming up</em>. Dated tasks are grouped by day on the right,
                    with anything late collected under{' '}
                    <strong className="font-semibold text-gray-800">Overdue</strong> at the top.
                    Undated tasks wait on the left, and each row has{' '}
                    <strong className="font-semibold text-gray-800">Today</strong> and{' '}
                    <strong className="font-semibold text-gray-800">Tomorrow</strong> buttons to move
                    them across.
                  </p>
                </div>
              </div>
              <p>
                Both Priority and Schedule show only work that is still open — finished tasks and
                empty rows are left out. Each has a{' '}
                <strong className="font-semibold text-gray-800">Filter</strong> button for narrowing
                the left column, and the count beside the heading reads{' '}
                <em>3 of 37</em> while a filter is on, so a short list never looks like a finished
                one.
              </p>
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[13px]">
                Priority and Schedule are built for a wide screen. On a phone you get the board as a
                simple scrolling list instead.
              </p>
            </Section>

            <Section id="tasks" title="Lists and tasks">
              <Ref
                rows={[
                  ['Rename a list', 'Click its title. On a phone, double-tap it'],
                  ['Recolour, or delete', 'The ⋮ menu on the card'],
                  [
                    'Hide finished tasks',
                    'Done automatically. Use Show Completed in the ⋮ menu to see them again',
                  ],
                  [
                    'Tick everything off',
                    'Select All in the ⋮ menu, or Deselect All to undo it',
                  ],
                  ['Clear out finished tasks', 'Delete Completed in the ⋮ menu'],
                  ['Edit a task', 'Click its text'],
                  [
                    'Start / finish a task',
                    'Click a segment of the status toggle on its left. See Marking progress below',
                  ],
                  [
                    'Reorder, or move to another list',
                    'Drag it by the dots on its left. On a phone, press and hold first',
                  ],
                  ['Open a task’s details', 'The sliders icon on its right'],
                  ['Delete a task', 'The × on its right'],
                ]}
              />
              <p>
                Marking a task <em>done</em> shows an{' '}
                <strong className="font-semibold text-gray-800">Undo</strong> button for six seconds,
                so a mis-click costs nothing. The other two segments raise no toast — they are one
                click from being reversed, and the toggle shows where you are.
              </p>
            </Section>

            <Section id="status" title="Marking progress">
              <p>
                Every task carries one of three states, and the toggle on its left sets them. Three
                segments, one click each — you can jump straight to any state, in any order.
              </p>

              {/* The real control, at the size the rows render it, so the guide
                  shows the thing rather than describing it. */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-3.5 py-3">
                <span className="inline-flex h-6 shrink-0 divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white">
                  <span className="flex w-7 items-center justify-center bg-gray-200 text-gray-700">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="8" strokeWidth={2} />
                    </svg>
                  </span>
                  <span className="flex w-7 items-center justify-center text-gray-300">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="8" strokeWidth={2} />
                      <path d="M12 4a8 8 0 000 16V4z" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <span className="flex w-7 items-center justify-center text-gray-300">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </span>
                <span className="text-[13px] text-gray-500">
                  Left to right: <strong className="font-semibold text-gray-800">To do</strong>,{' '}
                  <strong className="font-semibold text-gray-800">In progress</strong>,{' '}
                  <strong className="font-semibold text-gray-800">Done</strong>. The lit segment is
                  the current state.
                </span>
              </div>

              <Ref
                rows={[
                  [
                    <span key="a" className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="8" strokeWidth={2} />
                      </svg>
                      <strong className="font-semibold text-gray-800">To do</strong>
                    </span>,
                    'Not started. Where every new task begins',
                  ],
                  [
                    <span key="b" className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="8" strokeWidth={2} />
                        <path d="M12 4a8 8 0 000 16V4z" fill="currentColor" stroke="none" />
                      </svg>
                      <strong className="font-semibold text-gray-800">In progress</strong>
                    </span>,
                    'Half-filled circle. You have started this one',
                  ],
                  [
                    <span key="c" className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <strong className="font-semibold text-gray-800">Done</strong>
                    </span>,
                    'Finished, and out of Priority and Schedule',
                  ],
                ]}
              />

              <p>
                The same toggle sits on every row — on the board, in Priority and in Schedule. A
                task’s <strong className="font-semibold text-gray-800">details</strong> panel has the
                same three states as a labelled row, if you are already in there setting dates.
              </p>

              <p>What an in-progress task does differently:</p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>
                  It carries an <strong className="font-semibold text-gray-800">In progress</strong>{' '}
                  badge everywhere it appears.
                </li>
                <li>
                  It floats to the top of its list, above the tasks you have not started. Its real
                  position is remembered — it drops back when you stop or finish it.
                </li>
                <li>
                  Priority and Schedule both get an{' '}
                  <strong className="font-semibold text-gray-800">In progress</strong> filter chip, so
                  you can narrow either view to just what you have picked up.
                </li>
                <li>
                  It stays in both views. Only <em>Done</em> removes a task from Priority and
                  Schedule.
                </li>
              </ul>

              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[13px]">
                Two bulk actions in the ⋮ menu touch this.{' '}
                <strong className="font-semibold text-gray-800">Select All</strong> marks the whole
                list done, in-progress tasks included.{' '}
                <strong className="font-semibold text-gray-800">Deselect All</strong> only reopens
                what was finished, so it never throws away work you had started.
              </p>
            </Section>

            <Section id="fields" title="Dates and priority">
              <p>
                Every task can carry four things beyond its text. Set them while typing with the codes
                above, or any time afterwards from the sliders icon on the task.
              </p>
              <Ref
                rows={[
                  [
                    <strong key="s" className="font-semibold text-gray-800">Scheduled for</strong>,
                    'The day you plan to do it. This is what puts a task on a day in Schedule',
                  ],
                  [
                    <strong key="d" className="font-semibold text-gray-800">Due date</strong>,
                    'The deadline. A task is Overdue once either date is in the past',
                  ],
                  [
                    <strong key="i" className="font-semibold text-gray-800">Impact</strong>,
                    'How much finishing it matters — low, medium or high',
                  ],
                  [
                    <strong key="e" className="font-semibold text-gray-800">Effort</strong>,
                    'How much work it is — quick, moderate or heavy',
                  ],
                ]}
              />
              <p>
                A task needs <em>both</em> impact and effort to appear on the Priority grid; with only
                one it stays in To triage. And a task with a deadline but no planned day stays in{' '}
                <strong className="font-semibold text-gray-800">Unscheduled</strong> — which is the
                point, because something due Friday with no plan is exactly what needs your attention.
              </p>
            </Section>

            <Section id="board" title="The board canvas">
              <p>On a desktop the board is a large open canvas rather than a fixed page.</p>
              <Ref
                rows={[
                  ['Move around', 'Drag any empty part of the background'],
                  [
                    <>Zoom <Kbd key="c">Ctrl</Kbd>/<Kbd key="m">⌘</Kbd> + scroll</>,
                    'Or pinch, on a trackpad or touchscreen',
                  ],
                  ['Move a card', 'Drag it by the dotted strip along its top'],
                  ['Add a list or a note', 'Right-click the background'],
                  [
                    <strong key="a" className="font-semibold text-gray-800">Auto-arrange</strong>,
                    'Bottom left — tidies every card into a grid and resets the zoom, which is also how you find a card you have lost off-screen',
                  ],
                ]}
              />
              <p>
                <strong className="font-semibold text-gray-800">Text notes</strong> are free-floating
                labels for grouping cards — right-click the background to add one, drag the handle at
                its corner to resize. They are a desktop feature and stay hidden on phones.
              </p>
              <p>Your zoom and position are remembered for next time.</p>
            </Section>

            <p className="border-t border-gray-100 pt-6 text-[13px] text-gray-400">
              That is the whole app. Press <Kbd>Esc</Kbd> to get back to work.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
