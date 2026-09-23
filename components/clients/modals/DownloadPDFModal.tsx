import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

export type PDFDownloadType = 'sales' | 'salesAndCredit' | 'payments' | 'all';

interface DownloadPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (downloadType: PDFDownloadType) => void;
  isLoading?: boolean;
}

const DownloadPDFModal: React.FC<DownloadPDFModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  const [selectedType, setSelectedType] = useState<PDFDownloadType>('all');

  const handleConfirm = () => {
    onConfirm(selectedType);
  };

  const options = [
    {
      value: 'sales' as PDFDownloadType,
      label: 'Sales Only',
      description: 'Download only sales records (excluding credit notes and refunds)',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      value: 'salesAndCredit' as PDFDownloadType,
      label: 'Sales & Credit',
      description: 'Download sales records including credit notes and refunds',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      value: 'payments' as PDFDownloadType,
      label: 'Payments Only',
      description: 'Download only payment records',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      value: 'all' as PDFDownloadType,
      label: 'All Records',
      description: 'Download all records including sales, credit notes, refunds, and payments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Download PDF"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary dark:text-slate-400">
          Select what you want to include in the PDF download:
        </p>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedType(option.value)}
              className={`
                relative flex items-start p-4 rounded-lg border-2 transition-all
                ${
                  selectedType === option.value
                    ? 'border-primary-action bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start space-x-3 flex-1">
                <div
                  className={`
                    flex-shrink-0 mt-0.5
                    ${
                      selectedType === option.value
                        ? 'text-primary-action'
                        : 'text-text-secondary dark:text-slate-400'
                    }
                  `}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="downloadType"
                      value={option.value}
                      checked={selectedType === option.value}
                      onChange={() => setSelectedType(option.value)}
                      className="h-4 w-4 text-primary-action focus:ring-primary-action border-gray-300"
                    />
                    <label className="text-base font-semibold text-text-primary dark:text-slate-200 cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary dark:text-slate-400 ml-6">
                    {option.description}
                  </p>
                </div>
                {selectedType === option.value && (
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-action" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadPDFModal;









