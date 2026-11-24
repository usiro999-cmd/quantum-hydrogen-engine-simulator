(function (root) {
  "use strict";

  const BOLTZMANN_EV_PER_K = 8.617333262145e-5;
  const ELECTRONVOLT_JOULES = 1.602176634e-19;

  function excitationProbability(gapEV, temperatureK) {
    const exponent = gapEV / (BOLTZMANN_EV_PER_K * temperatureK);
    if (exponent > 700) return 0;
    return 1 / (1 + Math.exp(exponent));
  }

  function calculateSimulation(input) {
    const { hotTempK, coldTempK, hotGapEV, coldGapEV, systems, frequencyHz } = input;
    const values = [hotTempK, coldTempK, hotGapEV, coldGapEV, systems, frequencyHz];
    if (!values.every(Number.isFinite) || values.some((value) => value <= 0)) {
      return { valid: false, error: "すべての値に、0より大きい有限の数値を入力してください。" };
    }
    if (hotTempK <= coldTempK) {
      return { valid: false, error: "高温熱浴は低温熱浴より高い温度に設定してください。" };
    }
    if (hotGapEV <= coldGapEV) {
      return { valid: false, error: "高温側ギャップは低温側ギャップより大きく設定してください。" };
    }

    const hotPopulation = excitationProbability(hotGapEV, hotTempK);
    const coldPopulation = excitationProbability(coldGapEV, coldTempK);
    const populationDifference = hotPopulation - coldPopulation;
    const workPerSystemEV = (hotGapEV - coldGapEV) * populationDifference;
    const heatInputPerSystemEV = hotGapEV * populationDifference;
    const engineRegime = populationDifference > 0;

    return {
      valid: true,
      engineRegime,
      hotPopulation,
      coldPopulation,
      efficiency: engineRegime ? workPerSystemEV / heatInputPerSystemEV : 0,
      workPerCycleJ: workPerSystemEV * systems * ELECTRONVOLT_JOULES,
      powerW: workPerSystemEV * systems * ELECTRONVOLT_JOULES * frequencyHz,
      workPerSystemEV,
      hotGapEV,
      coldGapEV
    };
  }

  const api = { calculateSimulation, excitationProbability, BOLTZMANN_EV_PER_K, ELECTRONVOLT_JOULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.QuantumEngineSimulator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
