// Единый (кэшируемый) доступ к data/site.json.

import { getJSON } from './util.js';

let cache = null;

export function getSite() {
  if (!cache) cache = getJSON('data/site.json').catch(() => ({}));
  return cache;
}
