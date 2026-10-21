/**
 * One screen: what there is to do today, and how the course stands.
 *
 * The plan comes from the engine — reviews the ladder wants back, then material not met yet, under
 * a budget of minutes. This file only renders it and reports answers back.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  planDay, planMinutes, READ_SCOPE, resolve, seededRandom, topicStandings,
  type Activity, type ChoicePayload, type ClozePayload, type Item, type NotePayload,
} from 'quiz-engine';
import { Choice, Cloze, Note } from 'quiz-engine/react';
import { course, progress, registry } from './engine.ts';

const BUDGET_MINUTES = 20;
const LOCALE = 'de';

/** A fresh option order per item per day: stable within a sitting, different tomorrow. */
const seededFor = (itemId: string) => seededRandom(`${itemId}:${new Date().toISOString().slice(0, 10)}`);

const byId = new Map(course.items.map(item => [item.id, item]));
const topicTitle = (id: string): string => {
  const topic = course.topics.find(candidate => candidate.id === id);
  return topic === undefined ? id : resolve(topic.title, LOCALE, course.defaultLocale);
};

export function App() {
  // The store is the source of truth; this counter is only how React is told it moved.
  const [version, setVersion] = useState(0);
  const touched = useCallback(() => setVersion(current => current + 1), []);

  const state = progress.state();
  const now = Date.now();

  const plan = useMemo(
    () => planDay(course, registry, state, { now, budgetMinutes: BUDGET_MINUTES }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const standings = useMemo(
    () => [...topicStandings(course, registry, state, { now }).values()].filter(standing => standing.items > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const [at, setAt] = useState(0);
  const activity = plan[at];

  const next = () => setAt(index => index + 1);
  const answered = (itemId: string, correct: boolean) => {
    const item = byId.get(itemId);
    if (item === undefined) return;
    progress.answer({ item: itemId, version: item.version, correct });
    touched();
    globalThis.setTimeout(next, correct ? 700 : 2500);
  };
  const read = (itemId: string) => {
    progress.setFact(READ_SCOPE, itemId, new Date().toISOString());
    touched();
    next();
  };

  return (
    <main className="app">
      <header className="app__head">
        <h1>{resolve(course.title, LOCALE, course.defaultLocale)}</h1>
        <p className="app__sub">
          {plan.length === 0
            ? 'Für heute ist alles erledigt.'
            : `Heute: ${plan.length} Aufgaben, etwa ${Math.round(planMinutes(plan))} Minuten.`}
        </p>
      </header>

      {activity === undefined
        ? <Done planned={plan.length} />
        : <Stage key={activity.item} activity={activity} item={byId.get(activity.item)} onAnswer={answered} onRead={read} />}

      <section className="standings">
        <h2>Stand</h2>
        <ul>
          {standings.map(standing => (
            <li key={standing.topic}>
              <span className="standings__name">{topicTitle(standing.topic)}</span>
              <span className="standings__bar" aria-hidden="true">
                <span className="standings__fill" style={{ inlineSize: `${Math.round(standing.share * 100)}%` }} />
              </span>
              <span className="standings__count">
                {standing.mastered}/{standing.items}
                {standing.due > 0 && <em> · {standing.due} fällig</em>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Done({ planned }: { planned: number }) {
  return (
    <section className="stage stage--done">
      <p>{planned === 0 ? 'Heute steht nichts an. Morgen wieder.' : 'Fertig für heute.'}</p>
    </section>
  );
}

interface StageProps {
  activity: Activity;
  item: Item | undefined;
  onAnswer: (itemId: string, correct: boolean) => void;
  onRead: (itemId: string) => void;
}

function Stage({ activity, item, onAnswer, onRead }: StageProps) {
  if (item === undefined) return null;
  const shared = { locale: LOCALE, defaultLocale: course.defaultLocale };
  return (
    <section className="stage">
      <p className="stage__meta">
        {activity.source === 'review' ? 'Wiederholung' : 'Neu'} · {topicTitle(activity.topic)}
      </p>
      {/* An item's payload is `unknown` until its type says otherwise — the engine cannot know
          which shape goes with which id, but this app does. */}
      {item.type === 'note' && (
        <Note
          {...shared}
          payload={item.payload as NotePayload}
          onRead={() => onRead(item.id)}
          readLabel="Verstanden"
        />
      )}
      {item.type === 'choice' && (
        <Choice
          {...shared}
          payload={item.payload as ChoicePayload}
          random={seededFor(item.id)}
          onAnswer={correct => onAnswer(item.id, correct)}
        />
      )}
      {item.type === 'cloze' && (
        <Cloze
          {...shared}
          payload={item.payload as ClozePayload}
          check={answer => registry.check(item, answer)?.correct ?? false}
          onAnswer={correct => onAnswer(item.id, correct)}
        />
      )}
    </section>
  );
}


