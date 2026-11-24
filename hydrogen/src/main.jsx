import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { balmerLines, energyEV, orbitals, sampleOrbital, transitions, wavelengthNm } from "./physics.mjs";
import "./style.css";

function ElectronCloud({ orbital }) {
  const positions = useMemo(() => {
    const data = new Float32Array(9000 * 3);
    for (let i = 0; i < data.length; i += 3) data.set(sampleOrbital(orbital), i);
    return data;
  }, [orbital]);
  return <points key={orbital}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
    </bufferGeometry>
    <pointsMaterial color={orbitals[orbital].color} size={0.075} transparent opacity={0.65} depthWrite={false} />
  </points>;
}

function Scene({ orbital }) {
  return <Canvas camera={{ position: [18, 12, 24], fov: 45 }} aria-label={`${orbital}軌道の3D表示`}>
    <ambientLight intensity={1.8} />
    <pointLight position={[10, 10, 10]} intensity={100} />
    <Stars radius={100} depth={30} count={1500} factor={2} fade />
    <axesHelper args={[5]} />
    <mesh><sphereGeometry args={[0.3, 32, 32]} /><meshStandardMaterial color="#ff586e" /></mesh>
    <ElectronCloud orbital={orbital} />
    <OrbitControls makeDefault minDistance={2} maxDistance={70} />
  </Canvas>;
}

function EnergyLevels({ orbital, animation }) {
  return <div className="levels" aria-label="水素原子のエネルギー準位">
    {[6, 5, 4, 3, 2, 1].map((n) => <div key={n} className={`level ${orbitals[orbital].n === n ? "selected" : ""}`}>
      <span>n = {n}</span><span className="level-line" /><span>{energyEV(n).toFixed(2)} eV</span>
    </div>)}
    {animation && <div className="transition-indicator" role="status">
      {animation.from} → {animation.to}
      <span className="transition-marker" style={{ "--from": `${(6 - orbitals[animation.from].n) * 32 + 11}px`, "--to": `${(6 - orbitals[animation.to].n) * 32 + 11}px` }} />
    </div>}
  </div>;
}

function AiPanel({ orbital }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setAnswer("");
    setLoading(true);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orbital, question: question.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "解説の取得に失敗しました。");
      setAnswer(data.answer);
    } catch (err) {
      setError(err.message || "解説の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }
  return <section className="panel ai-panel">
    <div className="section-title"><span>05 / AI GUIDE</span><h2>AI解説</h2></div>
    <p>選択中の軌道について質問できます。質問と軌道名はOpenAIに送信されます。個人情報や機密情報は入力しないでください。</p>
    <form onSubmit={submit}>
      <label htmlFor="question">質問</label>
      <textarea id="question" maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：この軌道に節ができるのはなぜ？" required />
      <button className="primary-button" disabled={loading}>{loading ? "解説を生成中…" : "解説を生成"}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {answer && <div className="ai-answer"><strong>AIの回答</strong><p>{answer}</p><small>AIの回答は誤ることがあります。信頼できる資料も確認してください。</small></div>}
  </section>;
}

function App() {
  const [orbital, setOrbital] = useState("1s");
  const [transitionIndex, setTransitionIndex] = useState(3);
  const [animation, setAnimation] = useState(null);
  const info = orbitals[orbital];
  const transition = transitions[transitionIndex];
  useEffect(() => {
    if (!animation) return undefined;
    const timer = setTimeout(() => {
      setOrbital(animation.to);
      setAnimation(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [animation]);
  function startTransition() {
    setOrbital(transition.from);
    setAnimation(transition);
  }
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">QUANTUM HYDROGEN LAB / VER 1.1</p><h1>水素原子シミュレーター</h1><p>確率の雲から、光のスペクトルまで。</p></div><a href="/engine/">← エンジンシミュレーター</a></header>
    <div className="dashboard">
      <section className="panel viewer-panel">
        <div className="section-title"><span>01 / ORBITAL</span><h2>電子の確率分布</h2></div>
        <div className="orbital-buttons" role="group" aria-label="電子軌道の選択">
          {Object.keys(orbitals).map((name) => <button key={name} type="button" aria-pressed={orbital === name} disabled={!!animation} onClick={() => setOrbital(name)}>{name}</button>)}
        </div>
        <div className="canvas-wrap"><Scene orbital={orbital} /><span className="viewer-label">{orbital} / n = {info.n}</span><span className="viewer-hint">ドラッグで回転 · スクロールでズーム</span></div>
        <p className="note">点は電子の位置の確率分布を示す標本です。電子が軌道を周回する様子ではありません。座標の単位はボーア半径です。</p>
      </section>
      <div className="side-column">
        <section className="panel">
          <div className="section-title"><span>02 / QUANTUM STATE</span><h2>{orbital} 軌道</h2></div>
          <div className="numbers"><div><small>主量子数</small><strong>n = {info.n}</strong></div><div><small>方位量子数</small><strong>l = {info.l}</strong></div><div><small>磁気量子数</small><strong>m = {info.m}</strong></div></div>
          <p>{info.description}</p><p className="note">水素原子の理想モデル。スピンや微細構造は表示していません。</p>
        </section>
        <section className="panel">
          <div className="section-title"><span>03 / ENERGY</span><h2>エネルギー準位</h2></div>
          <EnergyLevels orbital={orbital} animation={animation} />
          <p className="note">Eₙ = −13.5984 / n² eV。線の間隔は模式的で、縮尺には対応しません。</p>
          <label htmlFor="transition">電気双極子遷移</label>
          <div className="transition-controls"><select id="transition" disabled={!!animation} value={transitionIndex} onChange={(e) => setTransitionIndex(Number(e.target.value))}>
            {transitions.map((item, index) => <option value={index} key={`${item.from}-${item.to}`}>{item.from} → {item.to}（{orbitals[item.from].n > orbitals[item.to].n ? "放出" : "吸収"}）</option>)}
          </select><button className="primary-button" type="button" disabled={!!animation} onClick={startTransition}>再生</button></div>
          <p className="note">光子の波長 ≈ {wavelengthNm(Math.max(orbitals[transition.from].n, orbitals[transition.to].n), Math.min(orbitals[transition.from].n, orbitals[transition.to].n)).toFixed(1)} nm。表示は準位間の変化を示す模式アニメーションです。</p>
        </section>
      </div>
      <section className="panel spectrum-panel">
        <div className="section-title"><span>04 / SPECTRUM</span><h2>発光スペクトル · バルマー系列</h2></div>
        <p>n ≥ 3 から n = 2 への遷移に対応する波長（空気中ではなく真空中）。</p>
        <div className="spectrum" aria-label="バルマー系列の可視スペクトル">
          {balmerLines.map((line) => <div key={line.n} className="spectral-line" style={{ left: `${(line.wavelength - 380) / 370 * 100}%`, "--line-color": line.n === 3 ? "#ff6257" : line.n === 4 ? "#5ee7ee" : line.n === 5 ? "#8990ff" : "#b77aff" }} title={`${line.wavelength.toFixed(1)} nm`} />)}
        </div>
        <div className="spectrum-scale"><span>380 nm</span><span>750 nm</span></div>
        <div className="line-list">{balmerLines.map((line) => <span key={line.n}>n={line.n} → 2 <strong>{line.wavelength.toFixed(1)} nm</strong></span>)}</div>
        <p className="note">準位差に対応する代表的な波長です。実際の遷移確率や線強度は表示していません。</p>
      </section>
      <AiPanel orbital={orbital} />
    </div>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
