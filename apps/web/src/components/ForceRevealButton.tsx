"use client";

import React from 'react';
import forceReveal from '../lib/forceReveal';

export default function ForceRevealButton() {
  return (
    <button
      onClick={() => forceReveal()}
      title="Force reveal (dev only)"
      className="fixed bottom-6 right-6 z-50 rounded-full bg-[#C0392B] px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#992d24]"
    >
      Reveal
    </button>
  );
}
