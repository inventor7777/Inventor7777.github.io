const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync('assets/theme.js', 'utf8');

function setup(saved, light = false, blocked = false) {
  const listeners = {};
  const root = { dataset: {} };
  const storage = { value: saved };
  function element() {
    return {
      children: [],
      style: { setProperty(name, value) { this[name] = value; } },
      setAttribute(name, value) { this[name] = value; },
      append(child) { this.children.push(child); },
    };
  }
  const body = element();
  runInNewContext(source, {
    document: {
      documentElement: root,
      body,
      createElement: element,
      getElementById: () => ({ addEventListener: (_, fn) => { listeners.click = fn; } }),
    },
    window: { matchMedia: () => ({ matches: light, addEventListener: (_, fn) => { listeners.change = fn; } }) },
    localStorage: {
      getItem: () => { if (blocked) throw Error('blocked'); return storage.value; },
      setItem: (_, value) => { if (blocked) throw Error('blocked'); storage.value = value; },
    },
  });
  return { root, storage, body, ...listeners };
}

const system = setup(null, true);
assert.equal(system.root.dataset.theme, 'light');
system.change({ matches: false });
assert.equal(system.root.dataset.theme, 'dark');
system.click();
assert.equal(system.root.dataset.theme, 'light');
assert.equal(system.storage.value, 'light');
system.change({ matches: false });
assert.equal(system.root.dataset.theme, 'light');
assert.equal(setup('dark', true).root.dataset.theme, 'dark');
const invalid = setup('invalid', true);
invalid.change({ matches: false });
assert.equal(invalid.root.dataset.theme, 'dark');
const blocked = setup(null, false, true);
blocked.click();
assert.equal(blocked.root.dataset.theme, 'light');
const field = system.body.children[0];
assert.equal(field.className, 'starfield');
assert.equal(field['aria-hidden'], 'true');
assert.equal(field.children.length, 32);
for (const star of field.children) {
  assert.equal(star.textContent.length, 1);
  assert.ok("{}[]()<>/;:=!&|#%*+-~?$_".includes(star.textContent));
  const x = parseFloat(star.style['--x']);
  const y = parseFloat(star.style['--y']);
  const duration = parseFloat(star.style['--duration']);
  const delay = parseFloat(star.style['--delay']);
  assert.ok(x >= 0 && x < 100 && y >= 0 && y < 100);
  assert.ok(duration >= 80 && duration < 160);
  assert.ok(delay <= 0 && delay > -duration);
}
console.log('Theme and starfield checks passed.');
