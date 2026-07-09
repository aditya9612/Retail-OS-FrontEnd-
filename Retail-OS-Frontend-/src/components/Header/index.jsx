// import React from 'react';
// import { BsSearch, BsEnvelope, BsBell, BsPlus } from 'react-icons/bs';
import React, { useState } from 'react';
import NewOrderForm from '../NewOrderForm';
import { BsSearch, BsEnvelope, BsBell, BsPlus } from 'react-icons/bs';

const Header = () => {
    const [showNewOrder, setShowNewOrder] = useState(false);
    return (
        <header className="pos-header">
            {/* Search */}
            <div className="header-search-wrap">
                <BsSearch className="header-search-icon" size={14} />
                <input
                    className="header-search"
                    type="text"
                    placeholder="Search here..."
                />
            </div>

            {/* Right side */}
            <div className="header-right">
                {/* Language */}
                <div className="header-lang">
                    <span className="header-lang-flag">🇺🇸</span>
                    <span className="header-lang-text">En</span>
                </div>

                {/* New Order */}
                {/* <button className="header-new-order">
                    <BsPlus size={16} />
                    New Order
                </button> */}

                <button
                    type="button"
                    className="header-new-order"
                    onClick={() => setShowNewOrder(true)}
                >
                    <BsPlus size={16} />
                    New Order
                </button>

                {/* Mail */}
                <button className="header-icon-btn">
                    <BsEnvelope size={17} />
                </button>

                {/* Bell */}
                <button className="header-icon-btn header-icon-btn--bell">
                    <BsBell size={17} />
                    <span className="header-badge" />
                </button>

                {/* Avatar */}
                <div className="header-avatar-wrap">
                    <img
                        src="https://ui-avatars.com/api/?name=Graham+Smith&background=6366f1&color=fff&size=80"
                        alt="User Avatar"
                        className="header-avatar"
                    />
                </div>
            </div>
            
            {showNewOrder && (
                <NewOrderForm onClose={() => setShowNewOrder(false)} />
            )}
        </header>
    );
};

export default Header;
