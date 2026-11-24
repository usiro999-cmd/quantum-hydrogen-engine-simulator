(function () {
  "use strict";

  const form = document.getElementById("design-form");
  const errorElement = document.getElementById("form-error");
  const inputNames = ["hotTempK", "coldTempK", "hotGapEV", "coldGapEV", "systems", "frequencyHz"];
  const fields = Object.fromEntries(inputNames.map((name) => [name, form.elements.namedItem(name)]));
  const defaults = { hotTempK: 2000, coldTempK: 500, hotGapEV: 0.3, coldGapEV: 0.1, systems: 1e18, frequencyHz: 1e9 };

  function formatPower(powerW) {
    if (powerW === 0) return { value: "0", unit: "W" };
    const units = [
      { threshold: 1e12, divisor: 1e12, unit: "TW" },
      { threshold: 1e9, divisor: 1e9, unit: "GW" },
      { threshold: 1e6, divisor: 1e6, unit: "MW" },
      { threshold: 1e3, divisor: 1e3, unit: "kW" },
      { threshold: 1, divisor: 1, unit: "W" },
      { threshold: 1e-3, divisor: 1e-3, unit: "mW" },
      { threshold: 1e-6, divisor: 1e-6, unit: "μW" },
      { threshold: 1e-9, divisor: 1e-9, unit: "nW" }
    ];
    const selected = units.find((unit) => powerW >= unit.threshold);
    if (selected) return { value: (powerW / selected.divisor).toPrecision(4), unit: selected.unit };
    return { value: powerW.toExponential(3), unit: "W" };
  }

  function formatEnergy(joules) {
    if (joules === 0) return "0 J";
    if (Math.abs(joules) < 1e-9) return `${joules.toExponential(3)} J`;
    const units = [
      { threshold: 1, divisor: 1, unit: "J" },
      { threshold: 1e-3, divisor: 1e-3, unit: "mJ" },
      { threshold: 1e-6, divisor: 1e-6, unit: "μJ" },
      { threshold: 1e-9, divisor: 1e-9, unit: "nJ" },
      { threshold: 1e-12, divisor: 1e-12, unit: "pJ" }
    ];
    const selected = units.find((unit) => Math.abs(joules) >= unit.threshold);
    return selected ? `${(joules / selected.divisor).toPrecision(4)} ${selected.unit}` : `${joules.toExponential(3)} J`;
  }

  function probabilityText(probability) {
    return probability === 0 ? "≈ 0" : probability < 0.001 ? probability.toExponential(2) : `${(probability * 100).toFixed(2)}%`;
  }

  function chartY(probability) {
    return 165 - Math.max(0, Math.min(probability, 1)) * 150;
  }

  function updateChart(result) {
    const coldX = 126;
    const hotX = 382;
    const points = [
      [coldX, chartY(result.hotPopulation)],
      [hotX, chartY(result.hotPopulation)],
      [hotX, chartY(result.coldPopulation)],
      [coldX, chartY(result.coldPopulation)]
    ];
    const path = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y.toFixed(1)}`).join("") + "Z";
    document.getElementById("cycle-path").setAttribute("d", path);
    document.getElementById("cycle-area").setAttribute("d", path);
    ["point-a", "point-b", "point-c", "point-d"].forEach((id, index) => {
      const point = document.getElementById(id);
      point.setAttribute("cx", points[index][0]);
      point.setAttribute("cy", points[index][1].toFixed(1));
    });
    document.getElementById("chart-cold-gap").textContent = `${result.coldGapEV.toFixed(3)} eV`;
    document.getElementById("chart-hot-gap").textContent = `${result.hotGapEV.toFixed(3)} eV`;
  }

  function showInputError(message) {
    errorElement.textContent = message;
    document.getElementById("power-value").textContent = "—";
    document.getElementById("power-unit").textContent = "—";
    document.getElementById("power-caption").textContent = "有効な設計値を入力すると結果が表示されます";
    document.getElementById("efficiency-value").textContent = "—";
    document.getElementById("efficiency-bar").style.width = "0";
    document.getElementById("work-value").textContent = "—";
    document.getElementById("hot-population").textContent = "—";
    document.getElementById("cold-population").textContent = "—";
    document.getElementById("regime").dataset.state = "invalid";
    document.getElementById("regime-label").textContent = "入力値を確認してください";
  }

  function update() {
    const invalidField = inputNames.map((name) => fields[name]).find((field) => !field.checkValidity());
    if (invalidField) {
      showInputError(invalidField.validationMessage);
      return;
    }

    const input = Object.fromEntries(inputNames.map((name) => [name, fields[name].valueAsNumber]));
    const result = window.QuantumEngineSimulator.calculateSimulation(input);
    if (!result.valid) {
      showInputError(result.error);
      return;
    }

    errorElement.textContent = "";
    const power = formatPower(result.powerW);
    document.getElementById("power-value").textContent = power.value;
    document.getElementById("power-unit").textContent = power.unit;
    document.getElementById("power-caption").textContent = result.engineRegime
      ? "損失を含まない理想モデルの推定出力"
      : "この条件では正味の仕事を取り出せません";
    document.getElementById("efficiency-value").textContent = `${(result.efficiency * 100).toFixed(2)}%`;
    document.getElementById("efficiency-bar").style.width = `${Math.max(0, Math.min(result.efficiency * 100, 100))}%`;
    document.getElementById("work-value").textContent = formatEnergy(result.workPerCycleJ);
    document.getElementById("hot-population").textContent = probabilityText(result.hotPopulation);
    document.getElementById("cold-population").textContent = probabilityText(result.coldPopulation);
    const regime = document.getElementById("regime");
    regime.dataset.state = result.engineRegime ? "engine" : "invalid";
    document.getElementById("regime-label").textContent = result.engineRegime
      ? "エンジン領域 · 高温側から熱を受け取り、正味の仕事を出力"
      : "エンジン領域外 · 温度・準位差の組み合わせを調整してください";
    updateChart(result);
  }

  form.addEventListener("input", update);
  document.getElementById("reset-button").addEventListener("click", () => {
    for (const [name, value] of Object.entries(defaults)) fields[name].value = value;
    update();
  });
  update();
})();
