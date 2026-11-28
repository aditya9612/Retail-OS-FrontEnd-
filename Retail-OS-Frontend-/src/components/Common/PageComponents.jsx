import React from 'react';
import { Link } from 'react-router-dom';
import { BsCashStack, BsTagFill, BsGraphUpArrow, BsPercent } from 'react-icons/bs';
import '../../pages/Dashboard/dashboard.css';
import '../Categories/CategoryCards.css';
import './PageComponents.css';

/**
 * PageContainer — Reusable root page container matching the Dashboard layout
 */
export const PageContainer = ({ children, className = '', style = {}, ...props }) => (
    <div className={`dashboard-container ${className}`.trim()} style={style} {...props}>
        {children}
    </div>
);

/**
 * PageHeader — Reusable page header matching Dashboard typography, spacing and alignment
 */
export const PageHeader = ({
    title,
    subtitle,
    icon,
    actions,
    actionBtn,
    children,
    className = '',
    style = {},
    ...props
}) => {
    const controls = actions || actionBtn;
    return (
        <header className={`dashboard-header ${className}`.trim()} style={style} {...props}>
            <div className="dashboard-title-wrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {icon && (
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: '#eef2ff',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            flexShrink: 0
                        }}>
                            {icon}
                        </div>
                    )}
                    {typeof title === 'string' ? (
                        <h1 className="dashboard-title">{title}</h1>
                    ) : (
                        title
                    )}
                </div>
                {subtitle && (
                    typeof subtitle === 'string' ? (
                        <p className="dashboard-subtitle">{subtitle}</p>
                    ) : (
                        subtitle
                    )
                )}
            </div>
            {controls && <div className="dashboard-controls page-header-actions">{controls}</div>}
            {children}
        </header>
    );
};

export const PageTitle = ({ children, className = '', style = {}, ...props }) => (
    <h1 className={`dashboard-title ${className}`.trim()} style={style} {...props}>
        {children}
    </h1>
);

export const PageSubtitle = ({ children, className = '', style = {}, ...props }) => (
    <p className={`dashboard-subtitle ${className}`.trim()} style={style} {...props}>
        {children}
    </p>
);

/**
 * KpiGrid — Standardized responsive KPI cards grid matching Dashboard
 * Occupies full content width and distributes cards evenly across the row with zero empty space.
 */
export const KpiGrid = ({
    children,
    columns,
    ariaLabel = 'Key Performance Indicators',
    className = '',
    style = {},
    ...props
}) => {
    const childCount = React.Children.count(children);
    const cols = columns || (childCount === 5 ? 5 : 4);
    const colClass = `kpi-grid-cols-${cols}`;

    return (
        <div
            className={`category-cards kpi-cards-grid ${colClass} ${className}`.trim()}
            aria-label={ariaLabel}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
};

/**
 * KpiCard — Standardized KPI metric card matching Dashboard / CategoryCards visual design
 * Left: title (h3), value (h2), subtitle (span)
 * Right: icon (.kpi-icon-wrap)
 */
export const KpiCard = ({
    title,
    label,
    value,
    subtitle,
    sub,
    subtitleIcon,
    subtitleColor,
    icon,
    variant = '',
    iconVariant = '',
    accentColor,
    valueColor,
    active = false,
    onClick,
    to,
    loading = false,
    tooltip,
    className = '',
    style = {},
    ...props
}) => {
    const cardTitle = title || label;
    const cardSub = subtitle || sub;
    const cardVariant = variant ? variant : '';
    const iconClass = iconVariant || variant || '';
    const cardTooltip = tooltip || (typeof cardTitle === 'string' ? cardTitle : undefined);

    // Default icons for known variants if not explicitly passed
    let renderedIcon = icon;
    if (!renderedIcon) {
        if (cardVariant === 'revenue' || cardVariant === 'total-sales' || cardVariant === 'sales') {
            renderedIcon = <BsCashStack />;
        } else if (cardVariant === 'profit') {
            renderedIcon = <BsGraphUpArrow />;
        } else if (cardVariant === 'margin') {
            renderedIcon = <BsPercent />;
        } else if (cardVariant === 'cost' || cardVariant === 'lowstock') {
            renderedIcon = <BsTagFill />;
        }
    }

    const cardClasses = [
        'category-card',
        'kpi-category-card',
        cardVariant,
        active ? 'active-card' : '',
        className
    ].filter(Boolean).join(' ');

    const cardStyle = {
        ...(accentColor ? { '--card-accent': accentColor } : {}),
        ...(onClick || to ? { cursor: 'pointer' } : {}),
        ...style
    };

    const iconStyle = accentColor && !iconClass ? {
        backgroundColor: `${accentColor}18`,
        color: accentColor
    } : undefined;

    const cardContent = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                {cardTitle && <h3>{cardTitle}</h3>}
                {loading ? (
                    <div className="skeleton-box" style={{ width: 100, height: 26, margin: '4px 0' }} />
                ) : (
                    <h2 style={valueColor ? { color: valueColor } : undefined}>{value}</h2>
                )}
                {cardSub && (
                    <span
                        className="kpi-subtitle"
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            marginTop: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            ...(subtitleColor ? { color: subtitleColor } : {})
                        }}
                    >
                        {subtitleIcon}
                        {cardSub}
                    </span>
                )}
            </div>
            {renderedIcon && (
                <div
                    className={`kpi-icon-wrap ${iconClass}`.trim()}
                    style={iconStyle}
                >
                    {renderedIcon}
                </div>
            )}
        </div>
    );

    if (to) {
        return (
            <Link
                to={to}
                className={cardClasses}
                title={cardTooltip}
                style={{ textDecoration: 'none', color: 'inherit', ...cardStyle }}
                {...props}
            >
                {cardContent}
            </Link>
        );
    }

    if (onClick) {
        return (
            <div
                className={cardClasses}
                title={cardTooltip}
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick(e);
                    }
                }}
                style={cardStyle}
                {...props}
            >
                {cardContent}
            </div>
        );
    }

    return (
        <div
            className={cardClasses}
            title={cardTooltip}
            style={cardStyle}
            {...props}
        >
            {cardContent}
        </div>
    );
};

export const PageToolbar = ({ children, className = '', style = {}, ...props }) => (
    <div className={`page-toolbar ${className}`.trim()} style={style} {...props}>
        {children}
    </div>
);

export const SearchInput = ({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    style = {},
    icon,
    ...props
}) => (
    <div className={`search-input-wrap ${className}`.trim()} style={style}>
        <span className="search-input-icon">{icon}</span>
        <input
            type="text"
            className="search-input-field"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            {...props}
        />
    </div>
);

export const DataTable = ({ children, className = '', style = {}, ...props }) => (
    <div className={`dashboard-table-wrap ${className}`.trim()} style={style} {...props}>
        <table className="dashboard-table">
            {children}
        </table>
    </div>
);

/**
 * SectionCard — Reusable Dashboard-style card container with optional header
 */
export const SectionCard = ({
    title,
    subtitle,
    icon,
    iconVariant = 'blue',
    headerActions,
    children,
    className = '',
    bodyClassName = '',
    style = {},
    ...props
}) => (
    <section className={`dashboard-card ${className}`.trim()} style={style} {...props}>
        {(title || subtitle || icon || headerActions) && (
            <div className="dashboard-card-header">
                <div className="card-title-group">
                    {icon && (
                        <div className={`card-header-icon ${iconVariant}`.trim()}>
                            {icon}
                        </div>
                    )}
                    <div>
                        {title && <h3 className="card-title">{title}</h3>}
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                </div>
                {headerActions && <div className="section-card-actions">{headerActions}</div>}
            </div>
        )}
        <div className={bodyClassName}>{children}</div>
    </section>
);

/**
 * StatusBadge — Reusable status pill matching Dashboard .status-pill design
 */
export const StatusBadge = ({
    label,
    variant = 'neutral',
    className = '',
    style = {},
    ...props
}) => (
    <span
        className={`status-pill status-badge-${variant} ${className}`.trim()}
        style={style}
        {...props}
    >
        {label}
    </span>
);

/**
 * Pagination — Reusable Dashboard-style pagination bar with optional page-size selector
 */
export const Pagination = ({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [8, 15, 25, 50],
    itemLabel = 'items',
    className = '',
}) => {
    const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    const getPages = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (page <= 3) {
            return [1, 2, 3, 4, '...', totalPages];
        }
        if (page >= totalPages - 2) {
            return [1, '...', totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', page - 1, page, page + 1, '...', totalPages];
    };

    return (
        <div className={`dashboard-pagination common-pagination ${className}`.trim()}>
            <div className="common-pagination-left">
                {typeof onPageSizeChange === 'function' && (
                    <div className="common-page-size-wrap">
                        <span className="common-page-size-label">Rows:</span>
                        <select
                            className="common-page-size-select"
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            aria-label="Select rows per page"
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <span className="dashboard-pagination-info">
                    Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> {itemLabel}
                    {totalPages > 0 && (
                        <>
                            {' '}&nbsp;|&nbsp; Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                        </>
                    )}
                </span>
            </div>

            {totalPages > 1 && (
                <div className="dashboard-pagination-controls">
                    <button
                        type="button"
                        className="adm-btn-secondary dashboard-pagination-nav-btn"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        aria-label="Previous page"
                        title="Previous page"
                    >
                        ‹
                    </button>
                    {getPages().map((p, idx) =>
                        p === '...' ? (
                            <span key={`ellipsis-${idx}`} className="common-pagination-ellipsis">
                                …
                            </span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                className={`dashboard-pagination-num-btn ${p === page ? 'active' : ''}`}
                                onClick={() => onPageChange(p)}
                                aria-label={`Page ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        type="button"
                        className="adm-btn-secondary dashboard-pagination-nav-btn"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        aria-label="Next page"
                        title="Next page"
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
};
