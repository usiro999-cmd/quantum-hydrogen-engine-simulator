import test from "node:test";
import assert from "node:assert/strict";
import { balmerLines, energyEV, orbitals, sampleOrbital, transitions, wavelengthNm } from "../src/physics.mjs";

test("hydrogen levels and Balmer wavelengths have the expected values", () => {
  assert.equal(energyEV(1), -13.5984);
  assert.ok(Math.abs(energyEV(2) + 3.3996) < 1e-8);
  assert.deepEqual(balmerLines.map((line) => Math.round(line.wavelength)), [656, 486, 434, 410]);
  assert.ok(Math.abs(wavelengthNm(3, 2) - 656.47) < 0.1);
});

test("illustrated transitions satisfy dipole selection rules and change energy", () => {
  for (const { from, to } of transitions) {
    assert.equal(Math.abs(orbitals[from].l - orbitals[to].l), 1);
    assert.equal(orbitals[from].m, orbitals[to].m);
    assert.notEqual(orbitals[from].n, orbitals[to].n);
  }
});

test("orbital samples follow expected radial and angular distributions", () => {
  let seed = 1234567;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (const [name, expectedRadius, expectedCosSquared] of [
    ["1s", 1.5, 1 / 3], ["2s", 6, 1 / 3], ["2p", 5, 3 / 5], ["3d", 10.5, 11 / 21]
  ]) {
    let radiusSum = 0;
    let angleSum = 0;
    for (let i = 0; i < 30000; i++) {
      const [x, y, z] = sampleOrbital(name, random);
      const r = Math.hypot(x, y, z);
      radiusSum += r;
      angleSum += z * z / (r * r);
    }
    assert.ok(Math.abs(radiusSum / 30000 - expectedRadius) < 0.12, name);
    assert.ok(Math.abs(angleSum / 30000 - expectedCosSquared) < 0.012, name);
  }
  assert.throws(() => sampleOrbital("invalid"), /Unknown orbital/);
});
