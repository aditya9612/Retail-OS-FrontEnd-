import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BsSearch, BsChevronDown, BsCheck2, BsX, BsPlusCircle } from 'react-icons/bs';

/**
 * Reusable Searchable Dropdown Select Component
 * Tailored for Retail-OS design system with real-time substring filtering,
 * keyboard accessibility, scroll management, and optional "Other" option support.
 */
const SearchableSelect = ({
    value,
    onChange,
    options = [],
    placeholder = '-- Select --',
    searchPlaceholder = 'Search...',
    allowOther = false,
    otherValue = 'Other',
    otherLabel = 'Other (Enter custom city)',
    hasError = false,
    disabled = false,
    emptyMessage = 'No options found'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const wrapperRef = useRef(null);
    const searchInputRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Handle Escape key
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    // Filtered options based on search query
    const filteredOptions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return options;
        return options.filter(opt => {
            const label = typeof opt === 'string' ? opt : (opt?.label || opt?.value || '');
            return label.toLowerCase().includes(q);
        });
    }, [options, searchQuery]);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };

    const isSelected = (optVal) => {
        return value && String(value).toLowerCase() === String(optVal).toLowerCase();
    };

    // Display label for the current selection
    const displayValue = useMemo(() => {
        if (!value) return '';
        if (allowOther && value === otherValue) {
            return otherLabel;
        }
        return value;
    }, [value, allowOther, otherValue, otherLabel]);

    return (
        <div
            ref={wrapperRef}
            onKeyDown={handleKeyDown}
            style={{ position: 'relative', width: '100%', userSelect: 'none' }}
        >
            {/* Trigger Button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                    if (!disabled) setIsOpen(prev => !prev);
                }}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                        e.preventDefault();
                        setIsOpen(prev => !prev);
                    }
                }}
                style={{
                    width: '100%',
                    height: 40,
                    minHeight: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: `1px solid ${hasError ? '#ef4444' : isOpen ? '#4f46e5' : '#cbd5e1'}`,
                    background: disabled ? '#f8fafc' : '#fff',
                    color: displayValue ? '#0f172a' : '#94a3b8',
                    fontSize: 13,
                    fontWeight: displayValue ? 500 : 400,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    boxShadow: isOpen ? '0 0 0 2px rgba(79, 70, 229, 0.15)' : 'none',
                    transition: 'border-color .15s ease, box-shadow .15s ease'
                }}
            >
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginRight: 6
                }}>
                    {displayValue || placeholder}
                </span>
                <BsChevronDown
                    size={11}
                    style={{
                        flexShrink: 0,
                        color: isOpen ? '#4f46e5' : '#64748b',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s ease'
                    }}
                />
            </div>

            {/* Dropdown Floating Panel */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        background: '#ffffff',
                        borderRadius: 8,
                        boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.18), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        animation: 'fadeIn .15s ease-out'
                    }}
                >
                    {/* Search Input Bar */}
                    <div style={{
                        padding: '7px 8px',
                        borderBottom: '1px solid #f1f5f9',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative'
                    }}>
                        <BsSearch
                            size={12}
                            style={{ position: 'absolute', left: 16, color: '#94a3b8', pointerEvents: 'none' }}
                        />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                padding: '6px 26px 6px 26px',
                                fontSize: 12,
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                    if (searchInputRef.current) searchInputRef.current.focus();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: 14,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 2,
                                    color: '#94a3b8',
                                    display: 'flex'
                                }}
                            >
                                <BsX size={14} />
                            </button>
                        )}
                    </div>

                    {/* Options Count Header */}
                    <div style={{
                        padding: '4px 10px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#94a3b8',
                        background: '#fafafa',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <span>{filteredOptions.length} available</span>
                        {searchQuery && <span>Filtered by "{searchQuery}"</span>}
                    </div>

                    {/* Scrollable Options List */}
                    <div
                        role="listbox"
                        style={{
                            maxHeight: 180,
                            overflowY: 'auto'
                        }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const optVal = typeof opt === 'string' ? opt : opt.value;
                                const optLabel = typeof opt === 'string' ? opt : opt.label;
                                const active = isSelected(optVal);

                                return (
                                    <div
                                        key={optVal}
                                        role="option"
                                        aria-selected={active}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(optVal);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            background: active ? '#eef2ff' : 'transparent',
                                            color: active ? '#4f46e5' : '#1e293b',
                                            fontWeight: active ? 700 : 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'background .1s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!active) e.currentTarget.style.background = '#f8fafc';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!active) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <span>{optLabel}</span>
                                        {active && <BsCheck2 size={13} color="#4f46e5" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{
                                padding: '14px 12px',
                                textAlign: 'center',
                                fontSize: 11,
                                color: '#94a3b8'
                            }}>
                                {emptyMessage}
                            </div>
                        )}
                    </div>

                    {/* "Other" Option (Always accessible at bottom if allowOther is true) */}
                    {allowOther && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(otherValue);
                            }}
                            style={{
                                borderTop: '1px solid #e2e8f0',
                                padding: '9px 12px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: isSelected(otherValue) ? '#4f46e5' : '#4338ca',
                                background: isSelected(otherValue) ? '#eef2ff' : '#f5f3ff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background .15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected(otherValue)) e.currentTarget.style.background = '#ede9fe';
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected(otherValue)) e.currentTarget.style.background = '#f5f3ff';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BsPlusCircle size={12} color="#6366f1" />
                                <span>{otherLabel}</span>
                            </div>
                            {isSelected(otherValue) && <BsCheck2 size={13} color="#4f46e5" />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
