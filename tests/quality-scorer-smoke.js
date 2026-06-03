const assert = require('node:assert/strict');
const { scorePrototypeHtml } = require('../lib/quality-scorer');

const strongPrototype = `<!doctype html>
<html lang="en">
  <head>
    <title>Accessible prototype</title>
    <style>
      body { background: #ffffff; color: #111827; font-family: system-ui; line-height: 1.6; }
      .hero { padding: 64px 24px; max-width: 960px; margin: 0 auto; }
      .cta { background: #111827; color: #ffffff; border: 2px solid #111827; padding: 12px 18px; }
      .card { margin-top: 24px; padding: 24px; border: 1px solid #d1d5db; }
    </style>
  </head>
  <body>
    <header><nav aria-label="Primary"><a href="#main">Skip to content</a></nav></header>
    <main id="main" class="hero">
      <section aria-labelledby="hero-title">
        <p>Trusted workflow</p>
        <h1 id="hero-title">Make retention risk visible</h1>
        <p>Prioritise accounts, review next steps, and act before churn arrives.</p>
        <button class="cta" type="button" aria-label="Review risky accounts">Review risky accounts</button>
      </section>
      <section class="card" aria-labelledby="metrics-title">
        <h2 id="metrics-title">Signals</h2>
        <p>Usage, sentiment, and renewal data are grouped by urgency.</p>
      </section>
    </main>
  </body>
</html>`;

const weakPrototype = '<div><span>Dashboard</span><button></button><div style="color:#777;background:#777">low contrast</div></div>';

const strong = scorePrototypeHtml(strongPrototype);
assert.equal(strong.grade, 'A');
assert.ok(strong.score >= 85);
assert.equal(strong.showSuggestions, false);
assert.equal(strong.categories.length, 5);
assert.ok(strong.categories.every(category => category.score >= 70));

const weak = scorePrototypeHtml(weakPrototype);
assert.ok(['C', 'D'].includes(weak.grade));
assert.equal(weak.showSuggestions, true);
assert.ok(weak.suggestions.length >= 3);
assert.ok(weak.categories.some(category => category.id === 'semanticHtml' && category.score < 60));
assert.ok(weak.categories.some(category => category.id === 'colorContrast' && category.score < 60));

console.log('Quality scorer smoke tests passed');
