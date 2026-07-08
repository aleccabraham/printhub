import { useState } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import PublicHeader from '../../components/PublicHeader.jsx';
import StepProgress from '../../components/StepProgress.jsx';
import UploadStep from './UploadStep.jsx';
import OptionsStep from './OptionsStep.jsx';
import PaymentStep from './PaymentStep.jsx';
import ConfirmationStep from './ConfirmationStep.jsx';

const initialState = {
  step: 1,
  studentName: '',
  registerNo: '',
  studentEmail: '',
  documentFile: null,
  fileId: null,
  fileName: null,
  fileSizeBytes: null,
  totalPages: null,

  paperSize: 'A4',
  printMode: 'BW',
  sides: 'single',
  copies: 1,
  binding: 'none',
  pageRangeType: 'all',
  pageRange: '',
  pagesToPrint: null,

  screenshotFile: null,
  upiReferenceId: '',

  jobId: null,
  totalAmount: null,
};

export default function StudentFlow() {
  const [state, setState] = useState(initialState);

  const patch = (fields) => setState((s) => ({ ...s, ...fields }));
  const goTo = (step) => setState((s) => ({ ...s, step }));

  return (
    <div className="page">
      <PageHeader />
      <PublicHeader />
      <div className="form-column">
        <StepProgress step={state.step} />
        <div className="card">
          {state.step === 1 && <UploadStep state={state} patch={patch} goTo={goTo} />}
          {state.step === 2 && <OptionsStep state={state} patch={patch} goTo={goTo} />}
          {state.step === 3 && <PaymentStep state={state} patch={patch} goTo={goTo} />}
          {state.step === 4 && <ConfirmationStep state={state} />}
        </div>
      </div>
    </div>
  );
}
