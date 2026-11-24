export const orbitals = {
  "1s": { n: 1, l: 0, m: 0, color: "#64d7ff", description: "球対称の基底状態。動径節はありません。" },
  "2s": { n: 2, l: 0, m: 0, color: "#a696ff", description: "球対称の励起状態。動径方向に1つの節があります。" },
  "2p": { n: 2, l: 1, m: 0, color: "#ffb56b", description: "z軸方向のダンベル型軌道。xy平面が節です。" },
  "3d": { n: 3, l: 2, m: 0, color: "#ff87ad", description: "z軸方向の3d_z²軌道。2つの角度方向の節があります。" }
};

export const transitions = [
  { from: "1s", to: "2p" },
  { from: "2p", to: "1s" },
  { from: "2p", to: "3d" },
  { from: "3d", to: "2p" }
];

export const energyEV = (n) => -13.5984 / (n * n);
export const wavelengthNm = (upper, lower) => 1e9 / (10967758.34 * (1 / lower ** 2 - 1 / upper ** 2));
export const balmerLines = [3, 4, 5, 6].map((n) => ({ n, wavelength: wavelengthNm(n, 2) }));

function gammaInteger(shape, scale, random) {
  let sum = 0;
  for (let i = 0; i < shape; i++) sum -= Math.log(1 - random());
  return sum * scale;
}

// Samples the hydrogen probability density in atomic units, not an electron trajectory.
export function sampleOrbital(name, random = Math.random) {
  let r;
  if (name === "1s") r = gammaInteger(3, 0.5, random);
  else if (name === "2s") {
    do {
      r = gammaInteger(random() < 0.25 ? 3 : 5, 1, random);
    } while (random() > (r - 2) ** 2 / (r * r + 4));
  } else if (name === "2p") r = gammaInteger(5, 1, random);
  else if (name === "3d") r = gammaInteger(7, 1.5, random);
  else throw new Error(`Unknown orbital: ${name}`);

  let cosTheta;
  do {
    cosTheta = 2 * random() - 1;
  } while (
    (name === "2p" && random() > cosTheta ** 2) ||
    (name === "3d" && random() > (3 * cosTheta ** 2 - 1) ** 2 / 4)
  );
  const phi = 2 * Math.PI * random();
  const sinTheta = Math.sqrt(1 - cosTheta ** 2);
  return [r * sinTheta * Math.cos(phi), r * sinTheta * Math.sin(phi), r * cosTheta];
}
