import { useState } from 'react';
import api from '../../api/client.js';

export default function UploadStep({ state, patch, goTo }) {
  const [file, setFile] = useState(state.documentFile);
  const [name, setName] = useState(state.studentName);
  const [registerNo, setRegisterNo] = useState(state.registerNo);
  const [email, setEmail] = useState(state.studentEmail);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !registerNo.trim() || !email.trim() || !file) {
      setError('Please fill in your name, register no, email, and choose a document.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await api.post('/documents', formData);

      patch({
        studentName: name.trim(),
        registerNo: registerNo.trim(),
        studentEmail: email.trim(),
        documentFile: file,
        fileId: res.data.fileId,
        fileName: res.data.fileName,
        fileSizeBytes: res.data.fileSizeBytes,
        totalPages: res.data.totalPages,
        step: 2,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="micro-label">Step 1</p>
      <h2 className="section-heading" style={{ fontSize: 22, marginBottom: 20 }}>
        Your details & document
      </h2>

      <div className="field">
        <label>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Student" required />
      </div>

      <div className="field">
        <label>Register no</label>
        <input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} placeholder="e.g. 21CS1234" required />
      </div>

      <div className="field">
        <label>College email address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@college.edu" required />
      </div>

      <div className="field">
        <label>Document (PDF, DOC, DOCX, PNG, JPG — max 50MB)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files[0] || null)}
          required
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Uploading…' : 'Continue'}
      </button>
    </form>
  );
}
