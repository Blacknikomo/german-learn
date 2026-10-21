/**
 * What this app owns: its spelling rules, its content, and the wiring between them and the engine.
 * The engine's own behaviour is tested in the engine.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fixedClock, memoryStorage, openProgress, planDay, seededRandom, standingOf, topicStandings,
  validateCourse, type Item,
} from 'quiz-engine';
import { course, registry } from '../src/engine.ts';
import { germanNormalizer } from '../src/normalize.ts';

test('the course is valid against the types this app registers', () => {
  assert.deepEqual(validateCourse(course, registry), []);
});

test('umlauts and ß may be typed either way', () => {
  assert.equal(germanNormalizer('Fußball'), germanNormalizer('Fussball'));
  assert.equal(germanNormalizer('Grüße'), germanNormalizer('Gruesse'));
  assert.equal(germanNormalizer('ÄHNLICH'), germanNormalizer('aehnlich'));
  assert.notEqual(germanNormalizer('Fußball'), germanNormalizer('Fussbal'), 'and a misspelling is still wrong');
});

test('a learner may type the transliterated spelling and be counted right', () => {
  const item = course.items.find(candidate => candidate.id === 'fugen-fussball')!;
  assert.equal(registry.check(item, 'Fußball')?.correct, true);
  assert.equal(registry.check(item, 'fussball')?.correct, true, 'which is the point of the app-side normalizer');
  assert.equal(registry.check(item, 'Fußbal')?.correct, false);
});

test('every content item has a renderer in this app', () => {
  const rendered = new Set(['note', 'choice', 'cloze']);
  for (const item of course.items) {
    assert.ok(rendered.has(item.type), `${item.id} is a "${item.type}", which App.tsx does not render`);
  }
});

test('a day can be planned, worked through, and shows up as progress', () => {
  const clock = fixedClock(Date.UTC(2026, 10, 2));
  const progress = openProgress({
    key: 'test', storage: memoryStorage(), clock, random: seededRandom('t'),
  });

  const firstDay = planDay(course, registry, progress.state(), { now: clock.now(), budgetMinutes: 20 });
  assert.ok(firstDay.length > 0, 'there is something to do on day one');
  assert.equal(firstDay[0]?.source, 'new');
  assert.ok(firstDay.some(activity => activity.mode === 'passive'), 'the theory comes along too');
  assert.ok(
    firstDay.findIndex(a => a.mode === 'passive') < firstDay.findIndex(a => a.mode === 'active'),
    'and it comes before the exercises on its topic',
  );

  const byId = new Map<string, Item>(course.items.map(item => [item.id, item]));
  for (const activity of firstDay) {
    const item = byId.get(activity.item)!;
    if (activity.mode === 'passive') progress.setFact('read', item.id, 'done');
    else progress.answer({ item: item.id, version: item.version, correct: true });
  }

  const standings = topicStandings(course, registry, progress.state(), { now: clock.now() });
  assert.ok((standings.get('komposita')?.seen ?? 0) > 0, 'the work landed on a topic');

  // Nothing is mastered on day one: the ladder will not be hurried.
  for (const item of course.items) {
    if (!registry.isScored(item)) continue;
    assert.equal(standingOf(item, progress.state(), { now: clock.now() }).mastered, false, item.id);
  }

  // The budget is per sitting, so asking again offers more work — but never the same work: what
  // was answered today is not due again until tomorrow.
  const again = planDay(course, registry, progress.state(), { now: clock.now(), budgetMinutes: 20 });
  const done = new Set(firstDay.map(a => a.item));
  assert.ok(again.every(activity => !done.has(activity.item)), 'nothing already done is offered again');
  assert.ok(again.length > 0, 'and a learner who wants to carry on may');
});
