import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { resolvePageSelection } from '../../utils/pageRange.js';

export default function OptionsStep({ state, patch, goTo }) {
  const [pricing, setPricing] = useState(null);
  const [paperSize, setPaperSize] = useState(state.paperSize);
  const [printMode, setPrintMode] = useState(state.printMode);
  const [sides, setSides] = useState(state.sides);
  const [copies, setCopies] = useState(state.copies);
  const [binding, setBinding] = useState(state.binding);
  const [pageRangeType, setPageRangeType] = useState(state.pageRangeType);
  const [pageRange, setPageRange] = useState(state.pageRange);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    api.get('/config').then((res) => setPricing(res.data));
  }, []);

  const selection = resolvePageSelection({ rangeType: pageRangeType, rangeString: pageRange, totalPages: state.totalPages });
  const perPageRate = pricing ? pricing.perPageRates[printMode][paperSize] : null;
  const bindingFee = pricing ? pricing.bindingFees[binding] : null;
  const pagesToPrint = selection.pagesToPrint;
  const totalAmount = pagesToPrint != null && perPageRate != null ? pagesToPrint * perPageRate * copies + bindingFee : null;

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    if (selection.error) {
      setError(selection.error);
      return;
    }

    setValidating(true);
    try {
      await api.post('/page-range/resolve', {
        rangeType: pageRangeType,
        rangeString: pageRange,
        totalPages: state.totalPages,
      });
      patch({ paperSize, printMode, sides, copies, binding, pageRangeType, pageRange, pagesToPrint, step: 3 });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not validate page range.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <form onSubmit={handleContinue}>
      <p className="micro-label">Step 2</p>
      <h2 className="section-heading" style={{ fontSize: 22, marginBottom: 20 }}>
        Print options
      </h2>
      <p className="text-muted" style={{ marginTop: -12 }}>
        {state.fileName} &middot; {state.totalPages} pages
      </p>

      <div className="option-grid" style={{ marginBottom: 18 }}>
        <div className="field">
          <label>Paper size</label>
          <div className="pill-toggle">
            {['A4', 'A3', 'Letter'].map((v) => (
              <button type="button" key={v} className={paperSize === v ? 'active' : ''} onClick={() => setPaperSize(v)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Print mode</label>
          <div className="pill-toggle">
            {['BW', 'Color'].map((v) => (
              <button type="button" key={v} className={printMode === v ? 'active' : ''} onClick={() => setPrintMode(v)}>
                {v === 'BW' ? 'Black & White' : 'Color'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Sides</label>
          <div className="pill-toggle">
            {[
              ['single', 'Single-sided'],
              ['double', 'Double-sided'],
            ].map(([v, l]) => (
              <button type="button" key={v} className={sides === v ? 'active' : ''} onClick={() => setSides(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Copies</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCopies((c) => Math.max(1, c - 1))}>
              −
            </button>
            <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{copies}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCopies((c) => c + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="field">
          <label>Binding</label>
          <div className="pill-toggle">
            {[
              ['none', 'None'],
              ['stapled', 'Stapled'],
              ['spiral', 'Spiral (+₹20)'],
            ].map(([v, l]) => (
              <button type="button" key={v} className={binding === v ? 'active' : ''} onClick={() => setBinding(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label>Pages to print</label>
        <div className="pill-toggle" style={{ marginBottom: 10 }}>
          <button type="button" className={pageRangeType === 'all' ? 'active' : ''} onClick={() => setPageRangeType('all')}>
            All pages
          </button>
          <button type="button" className={pageRangeType === 'custom' ? 'active' : ''} onClick={() => setPageRangeType('custom')}>
            Custom range
          </button>
        </div>
        {pageRangeType === 'custom' && (
          <input
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="e.g. 1-5, 8, 10-12"
          />
        )}
      </div>

      {selection.error && <p className="error-text">{selection.error}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ background: 'var(--color-plum-bg)', boxShadow: 'none', padding: 18, marginTop: 8, marginBottom: 20 }}>
        {pagesToPrint != null && perPageRate != null ? (
          <>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 18 }}>
              Estimated total: ₹{totalAmount}
            </div>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {pagesToPrint} pages selected × ₹{perPageRate} × {copies} {copies === 1 ? 'copy' : 'copies'}
              {bindingFee > 0 ? ` + ₹${bindingFee} binding` : ''} = ₹{totalAmount}
            </div>
          </>
        ) : (
          <div className="text-muted">Enter a valid page range to see your price estimate.</div>
        )}
      </div>

      <button className="btn btn-primary" type="submit" disabled={validating}>
        {validating ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}
