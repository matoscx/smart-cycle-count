'use client';

import { useState } from 'react';

export default function MobileCountPage() {
  const [binCode, setBinCode] = useState('');
  const [countedQty, setCountedQty] = useState<number | ''>('');
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulación de envío del conteo y recálculo
    await fetch('http://localhost:3000/scoring/recompute', { method: 'POST' });
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto p-6 font-sans border rounded-lg shadow-lg mt-10 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-center">Conteo Cíclico Móvil</h1>

      {submitted ? (
        <div className="text-center py-6">
          <p className="text-green-600 font-bold text-lg mb-4">¡Auditoría registrada exitosamente!</p>
          <button
            onClick={() => { setSubmitted(false); setBinCode(''); setCountedQty(''); }}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
          >
            Contar otro Bin
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Código del Bin / Escanear:</label>
            <input
              type="text"
              value={binCode}
              onChange={(e) => setBinCode(e.target.value)}
              placeholder="Ej: A1-R1-B01"
              className="w-full p-3 border rounded text-lg font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cantidad Física Contada:</label>
            <input
              type="number"
              value={countedQty}
              onChange={(e) => setCountedQty(Number(e.target.value))}
              className="w-full p-3 border rounded text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Resultado de Auditoría:</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as 'PASS' | 'FAIL')}
              className="w-full p-3 border rounded text-lg"
            >
              <option value="PASS">PASS (Conforme)</option>
              <option value="FAIL">FAIL (Discrepancia)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded text-lg font-bold shadow"
          >
            Guardar y Recalcular Risk Score
          </button>
        </form>
      )}
    </div>
  );
}