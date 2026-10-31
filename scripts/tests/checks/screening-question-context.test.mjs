// Exercises the exact Rust-owned discovery script against real browser form semantics.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromium } from "@playwright/test";

const source = readFileSync("crates/jobsentinel-assistance/src/automation/form_filler/questions.rs", "utf8");
const control = source.match(/const SCREENING_CONTROL: &str = r#"([\s\S]*?)"#;/)[1];
const script = `Array.from(document.querySelectorAll('input,select,textarea'), input => [(${control}).call(input), input.id]).filter(([text]) => text)`;

test("screening discovery preserves protected context and unique control identity", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<fieldset><legend>Voluntary self-identification</legend>
      <fieldset><legend>Details</legend><label for="status">Status</label><input id="status"></fieldset>
      </fieldset><div role="group" aria-labelledby="disability"><span id="disability">Disability</span>
      <label for="choice">Choice</label><input id="choice"></div>
      <span id="veteran">Protected veteran status</span><input id="aria" aria-labelledby="veteran">
      <input id="protected"><label for="x, #protected">Availability</label><input id="x, #protected">
      <label for="a:b[c]">Availability</label><input id="a:b[c]">
      <label>Availability<input name="duplicate"></label><label>Availability<input name="duplicate"></label>
      <label for="normal">Years of experience</label><label for="normal">Experience years</label><input id="normal">`);
    const rows = await page.evaluate(script);
    const resolved = rows.map(([text, id]) => ({ text, id }));
    assert.match(resolved.find(row => row.id === "status")?.text ?? "", /Voluntary self-identification/);
    assert.match(resolved.find(row => row.id === "choice")?.text ?? "", /Disability/);
    assert.match(resolved.find(row => row.id === "aria")?.text ?? "", /Protected veteran status/);
    assert.ok(resolved.some(row => row.id === "x, #protected"));
    assert.ok(resolved.some(row => row.id === "a:b[c]"));
    assert.ok(!resolved.some(row => row.id === "protected"));
    assert.equal(resolved.filter(row => row.id === "normal").length, 1);
    assert.ok(!rows.some(([, selector]) => selector.includes("duplicate")));
  } finally { await browser.close(); }
});


test("screening writes refuse changed context and same-ID replacement", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const mutation of ["legend", "replacement", "none"]) {
      await page.setContent('<fieldset><legend>Application</legend><label for="s">Status</label><input id="s"></fieldset>');
      const input = await page.$('#s');
      const context = await input.evaluate((node, control) => new Function(`return (${control}).call(this)`).call(node), control);
      if (mutation === "legend") await page.locator('legend').evaluate(node => { node.textContent = 'Voluntary self-identification'; });
      if (mutation === "replacement") await input.evaluate(node => node.replaceWith(node.cloneNode()));
      const result = await input.evaluate((node, {control, context}) => {
        return new Function(`return (${control}).call(this, ${JSON.stringify(context)}, "Yes")`).call(node);
      }, {control, context});
      assert.equal(result, mutation === "none");
      assert.equal(await page.locator('#s').inputValue(), mutation === "none" ? "Yes" : "");
    }
    await page.setContent('<label for="mode">Work mode</label><select id="mode"><option value="">Choose</option><option value="remote">Remote</option></select>');
    const select = await page.$('#mode');
    const context = await select.evaluate((node, control) => new Function(`return (${control}).call(this)`).call(node), control);
    assert.equal(await select.evaluate((node, {control, context}) => new Function(`return (${control}).call(this, ${JSON.stringify(context)}, "Remote")`).call(node), {control, context}), true);
    assert.equal(await page.locator('#mode').inputValue(), 'remote');
  } finally { await browser.close(); }
});

test("screening writes preserve inherited disabled state", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const html of [
      '<fieldset disabled><label for="s">Status</label><input id="s"></fieldset>',
      '<label for="s">Status</label><select id="s"><option value="">Choose</option><optgroup disabled label="Unavailable"><option value="Yes">Yes</option></optgroup></select>',
    ]) {
      await page.setContent(html);
      const input = await page.$('#s');
      const context = await input.evaluate((node, control) => new Function(`return (${control}).call(this)`).call(node), control);
      assert.equal(await input.evaluate((node, {control, context}) => new Function(`return (${control}).call(this, ${JSON.stringify(context)}, "Yes")`).call(node), {control, context}), false);
      assert.equal(await page.locator('#s').inputValue(), '');
    }
  } finally { await browser.close(); }
});
