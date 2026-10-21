/**
 * How this course compares free input — the one piece of domain knowledge the engine must not have.
 *
 * German lets the same word be typed two ways: umlauts transliterate to a digraph and ß to ss on
 * keyboards that lack them. Both spellings mean the same word, so both are folded to one form
 * before comparison. The engine never learns this; it arrives when the type is registered.
 */
import { composeNormalizers, defaultNormalizer, type Normalizer } from 'quiz-engine';

const FOLD: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

const foldUmlauts: Normalizer = input => input.replaceAll(/[äöüß]/gu, letter => FOLD[letter] ?? letter);

/** Default normalizer first: it lowercases, which is what makes the fold table short. */
export const germanNormalizer = composeNormalizers(defaultNormalizer, foldUmlauts);
