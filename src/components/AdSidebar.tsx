import React from 'react';
import { AdBanner } from './AdBanner';

export const AdSidebar: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Sidebar Ad 1 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <AdBanner
          adSlot="1234567890"
          style={{ display: 'block', width: '300px', height: '250px' }}
          className="mx-auto"
        />
      </div>

      {/* Sidebar Ad 2 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <AdBanner
          adSlot="1234567891"
          style={{ display: 'block', width: '300px', height: '600px' }}
          className="mx-auto"
        />
      </div>

      {/* Contact Us Promotional Content */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="font-bold text-lg mb-2">Contact Us</h3>
        <p className="text-sm mb-4 opacity-90">
          Have suggestions or feedback? We'd love to hear from you!
        </p>
        <button 
          onClick={() => {
            // This will be handled by the parent component
            const event = new CustomEvent('openContactForm');
            window.dispatchEvent(event);
          }}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-all duration-200 hover:scale-105"
        >
          Get in Touch
        </button>
      </div>
    </div>
  );
};