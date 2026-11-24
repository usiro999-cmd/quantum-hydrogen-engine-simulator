const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateSimulation, excitationProbability, BOLTZMANN_EV_PER_K } = require("../src/simulator.js");

const defaultInput = {
  hotTempK: 2000,
  coldTempK: 500,
  hotGapEV: 0.3,
  coldGapEV: 0.1,
  systems: 1e18,
  frequencyHz: 1e9
};

test("returns positive work and efficiency in the engine regime", () => {
  const result = calculateSimulation(defaultInput);
  assert.equal(result.valid, true);
  assert.equal(result.engineRegime, true);
  assert.ok(result.hotPopulation > result.coldPopulation);
  assert.ok(result.workPerCycleJ > 0);
  assert.ok(result.powerW > 0);
  assert.ok(result.efficiency > 0 && result.efficiency < 1 - defaultInput.coldTempK / defaultInput.hotTempK);
});

test("identifies a parameter set outside the engine regime", () => {
  const result = calculateSimulation({ ...defaultInput, hotTempK: 600, coldTempK: 500 });
  assert.equal(result.valid, true);
  assert.equal(result.engineRegime, false);
  assert.equal(result.efficiency, 0);
  assert.equal(result.powerW < 0, true);
});

test("rejects invalid temperatures, energy gaps, and non-finite inputs", () => {
  assert.match(calculateSimulation({ ...defaultInput, hotTempK: 500 }).error, /高温熱浴/);
  assert.match(calculateSimulation({ ...defaultInput, hotGapEV: 0.1 }).error, /高温側ギャップ/);
  assert.match(calculateSimulation({ ...defaultInput, systems: Infinity }).error, /有限の数値/);
});

test("avoids overflow for very large energy-to-temperature ratios", () => {
  assert.equal(excitationProbability(10, 1), 0);
  assert.ok(excitationProbability(BOLTZMANN_EV_PER_K, 1) > 0);
});
