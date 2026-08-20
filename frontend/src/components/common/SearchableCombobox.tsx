import React, { useState, useRef, useEffect } from 'react';
import { IconSearch, IconX, IconCheck } from './Icons';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'neutral' | 'blue';
  extraInfo?: string;
  disabled?: boolean;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  emptyMessage?: string;
  renderOption?: (option: ComboboxOption) => React.ReactNode;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  id,
  className = '',
  emptyMessage = 'No matching options found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(term)) ||
      (opt.extraInfo && opt.extraInfo.toLowerCase().includes(term)) ||
      (opt.badge && opt.badge.toLowerCase().includes(term))
    );
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'success':
        return { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' };
      case 'warning':
        return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#facc15' };
      case 'danger':
        return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'blue':
        return { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' };
      default:
        return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-combobox ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Trigger Button */}
      <div
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontSize: '13.5px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(124, 58, 237, 0.15)' : 'none',
          minHeight: '38px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {selectedOption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', width: '100%' }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  ({selectedOption.sublabel})
                </span>
              )}
              {selectedOption.badge && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    marginLeft: 'auto',
                    marginRight: '6px',
                    whiteSpace: 'nowrap',
                    ...getBadgeStyle(selectedOption.badgeType),
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
              title="Clear selection"
            >
              <IconX size={13} />
            </button>
          )}
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: '#18181b',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid var(--border-color)',
              background: '#27272a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <IconSearch size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '4px' }} />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                padding: '4px 0',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0].value);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <IconX size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      opacity: opt.disabled ? 0.4 : 1,
                      background: isSelected ? 'rgba(124, 58, 237, 0.18)' : 'transparent',
                      transition: 'background 0.1s',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!opt.disabled && !isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!opt.disabled && !isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--primary-hover)' : 'var(--text-primary)',
                            fontSize: '13px',
                          }}
                        >
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {opt.extraInfo && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {opt.extraInfo}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            ...getBadgeStyle(opt.badgeType),
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <IconCheck size={14} style={{ color: 'var(--primary-hover)' }} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Results Footer */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid var(--border-color)',
              background: '#18181b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
            }}
          >
            <span>Showing {filteredOptions.length} of {options.length} options</span>
            <span style={{ fontSize: '10px' }}>Press <kbd style={{ background: '#3f3f46', padding: '1px 4px', borderRadius: '3px' }}>↵</kbd> to select</span>
          </div>
        </div>
      )}
    </div>
  );
};
