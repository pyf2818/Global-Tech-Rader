// useUI — 纯 UI 开关状态，从 App.jsx 1259/1261/1262/1272 行提取
// showFollowDropdown / mobileMenuOpen / showBackToTop / moreNavOpen — 无 handler，纯展示

import { useState } from 'react';

export function useUI() {
  const [showFollowDropdown, setShowFollowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [moreNavOpen, setMoreNavOpen] = useState(false);

  return { showFollowDropdown, setShowFollowDropdown, mobileMenuOpen, setMobileMenuOpen, showBackToTop, setShowBackToTop, moreNavOpen, setMoreNavOpen };
}
