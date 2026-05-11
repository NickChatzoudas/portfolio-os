import React from 'react';

const PopupMessage: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <p>You have been redirected from the mobile version of the site!</p>
            <p>Welcome to the OS experience!</p>
            <p>Use a desktop or laptop for the full experience.</p>
        </div>
    );
};

export default PopupMessage;