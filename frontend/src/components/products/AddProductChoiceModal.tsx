import React from 'react';
import { IconPackage, IconDownload, IconPlus } from '../common/Icons';
import { downloadProductImportTemplate } from '../../utils/productImportTemplate';

interface AddProductChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectBulk: () => void;
}

export const AddProductChoiceModal: React.FC<AddProductChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectBulk,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex-center" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header flex-between">
          <div>
            <h3 className="modal-title">Add Products to Inventory</h3>
            <p className="fs-13 color-tertiary mt-2">
              Choose how you would like to populate new items into your catalog.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body p-20">
          <div className="grid grid-2 gap-16">
            {/* Option 1: Manual Single Add */}
            <div
              className="card-choice p-20 cursor-pointer text-center"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                transition: 'all 0.2s ease-in-out',
              }}
              onClick={() => {
                onClose();
                onSelectManual();
              }}
            >
              <div
                className="icon-wrapper mx-auto mb-12 flex-center"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: 'var(--accent-color, #3b82f6)',
                }}
              >
                <IconPlus size={24} />
              </div>
              <h4 className="fw-700 fs-15 mb-6">Add Single Product</h4>
              <p className="fs-12 color-tertiary">
                Enter details manually for a single SKU using the interactive form.
              </p>
              <button type="button" className="btn btn-secondary btn-sm w-full mt-16">
                Fill Form
              </button>
            </div>

            {/* Option 2: Bulk CSV / Excel Import */}
            <div
              className="card-choice p-20 cursor-pointer text-center"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                transition: 'all 0.2s ease-in-out',
              }}
              onClick={() => {
                onClose();
                onSelectBulk();
              }}
            >
              <div
                className="icon-wrapper mx-auto mb-12 flex-center"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--success, #10b981)',
                }}
              >
                <IconPackage size={24} />
              </div>
              <h4 className="fw-700 fs-15 mb-6">Bulk Import (CSV / Excel)</h4>
              <p className="fs-12 color-tertiary">
                Upload a spreadsheet to import dozens or hundreds of items instantly.
              </p>
              <button type="button" className="btn btn-primary btn-sm w-full mt-16">
                Upload File
              </button>
            </div>
          </div>

          {/* Template Download Banner */}
          <div
            className="mt-20 p-12 flex-between"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
            }}
          >
            <div className="flex-center gap-10">
              <IconDownload size={18} className="color-primary" />
              <div>
                <div className="fs-13 fw-600">Need the import spreadsheet template?</div>
                <div className="fs-11 color-tertiary">
                  Includes correct headers, sample rows & instructions. Supports new custom categories!
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                downloadProductImportTemplate();
              }}
            >
              📥 Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
