import { useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function PaymentStep({ state, patch }) {
  const [pricing, setPricing] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [upiReferenceId, setUpiReferenceId] = useState(state.upiReferenceId);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    api.get('/config').then((res) => setPricing(res.data));
  }, []);

  const perPageRate = pricing ? pricing.perPageRates[state.printMode][state.paperSize] : null;
  const bindingFee = pricing ? pricing.bindingFees[state.binding] : null;
  const totalAmount = perPageRate != null ? state.pagesToPrint * perPageRate * state.copies + bindingFee : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!screenshot || !upiReferenceId.trim()) {
      setError('Please upload a payment screenshot and enter the UPI transaction reference ID.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshot);
      formData.append('studentName', state.studentName);
      formData.append('registerNo', state.registerNo);
      formData.append('studentEmail', state.studentEmail);
      formData.append('fileId', state.fileId);
      formData.append('fileName', state.fileName);
      formData.append('fileSizeBytes', state.fileSizeBytes);
      formData.append('totalPages', state.totalPages);
      formData.append('paperSize', state.paperSize);
      formData.append('printMode', state.printMode);
      formData.append('sides', state.sides);
      formData.append('copies', state.copies);
      formData.append('binding', state.binding);
      formData.append('pageRangeType', state.pageRangeType);
      formData.append('pageRange', state.pageRange || '');
      formData.append('upiReferenceId', upiReferenceId.trim());

      const res = await api.post('/jobs', formData);
      patch({ jobId: res.data.jobId, totalAmount: res.data.totalAmount, screenshotFile: screenshot, upiReferenceId, step: 4 });
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="micro-label">Step 3</p>
      <h2 className="section-heading" style={{ fontSize: 22, marginBottom: 20 }}>
        Payment
      </h2>

      <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)', marginBottom: 20 }}>
        <p className="micro-label">Order summary</p>
        <div className="row-list">
          <div className="row-item"><span>Name / Register No</span><span>{state.studentName} / {state.registerNo}</span></div>
          <div className="row-item"><span>Document</span><span>{state.fileName}</span></div>
          <div className="row-item"><span>Pages</span><span>{state.pagesToPrint} of {state.totalPages}{state.pageRangeType === 'custom' ? ` (${state.pageRange})` : ''}</span></div>
          <div className="row-item"><span>Paper / mode / sides</span><span>{state.paperSize} · {state.printMode === 'BW' ? 'B&W' : 'Color'} · {state.sides}</span></div>
          <div className="row-item"><span>Copies / binding</span><span>{state.copies} · {state.binding}</span></div>
          <div className="row-item"><span><strong>Total amount</strong></span><span><strong>{totalAmount != null ? `₹${totalAmount}` : '…'}</strong></span></div>
        </div>
      </div>

      <div className="field" style={{ textAlign: 'center' }}>
        <label>Scan to pay via UPI/GPay</label>
        {pricing && !qrFailed && (
          <img
            src={pricing.paymentQrImageUrl}
            alt="Payment QR code"
            style={{ maxWidth: 280, width: '100%', borderRadius: 12, border: '1px solid var(--color-border)' }}
            onError={() => setQrFailed(true)}
          />
        )}
        {qrFailed && (
          <p className="text-muted" style={{ fontSize: 12 }}>
            (QR image not configured yet — set PAYMENT_QR_IMAGE)
          </p>
        )}
      </div>

      <div className="field">
        <label>Payment screenshot</label>
        <input type="file" accept="image/png,image/jpeg" onChange={(e) => setScreenshot(e.target.files[0] || null)} required />
      </div>

      <div className="field">
        <label>UPI transaction reference ID</label>
        <input value={upiReferenceId} onChange={(e) => setUpiReferenceId(e.target.value)} placeholder="e.g. 123456789012" required />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit payment proof'}
      </button>
    </form>
  );
}
