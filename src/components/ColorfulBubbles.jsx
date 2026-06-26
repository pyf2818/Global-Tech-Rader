/**
 * ColorfulBubbles — Compact pill badges with enter animation
 * - Horizontal flex-wrap pill layout
 * - New bubble enter animation (scale bounce)
 * - Double-click to pop with burst
 * - Gentle float oscillation
 */
import React, { useRef, useEffect, useState } from 'react';

const BUBBLE_COLORS = [
  { bg: 'rgba(201,169,97,0.22)',   border: 'rgba(201,169,97,0.5)',   text: '#D4B576', glow: 'rgba(201,169,97,0.35)' },
  { bg: 'rgba(249,168,184,0.22)',  border: 'rgba(249,168,184,0.5)',  text: '#FBC8D4', glow: 'rgba(249,168,184,0.35)' },
  { bg: 'rgba(52,211,153,0.2)',    border: 'rgba(52,211,153,0.45)',  text: '#4ADE80', glow: 'rgba(52,211,153,0.35)' },
  { bg: 'rgba(34,211,238,0.2)',    border: 'rgba(34,211,238,0.45)',  text: '#22D3EE', glow: 'rgba(34,211,238,0.35)' },
  { bg: 'rgba(192,132,252,0.2)',   border: 'rgba(192,132,252,0.45)', text: '#C084FC', glow: 'rgba(192,132,252,0.35)' },
  { bg: 'rgba(232,133,108,0.2)',   border: 'rgba(232,133,108,0.45)', text: '#E8856C', glow: 'rgba(232,133,108,0.35)' },
  { bg: 'rgba(96,165,250,0.2)',    border: 'rgba(96,165,250,0.45)',  text: '#60A5FA', glow: 'rgba(96,165,250,0.35)' },
  { bg: 'rgba(123,200,164,0.2)',   border: 'rgba(123,200,164,0.45)', text: '#7BC8A4', glow: 'rgba(123,200,164,0.35)' },
];

export default function ColorfulBubbles({ interests, onBubbleClick, onEmptyClick, categories }) {
  const [popping, setPopping] = useState(new Set());
  const [entering, setEntering] = useState(new Set());
  const prevLenRef = useRef(interests.length);

  // Detect new interests → add entering animation
  useEffect(() => {
    if (interests.length > prevLenRef.current) {
      const newIds = new Set();
      for (let i = prevLenRef.current; i < interests.length; i++) {
        newIds.add(interests[i]);
      }
      setEntering(newIds);
      setTimeout(() => setEntering(new Set()), 400);
    }
    prevLenRef.current = interests.length;
  }, [interests.length]);

  const handleDoubleClick = (idx) => {
    setPopping(prev => new Set(prev).add(idx));
    setTimeout(() => {
      const catId = interests[idx];
      if (catId && onBubbleClick) onBubbleClick(catId);
    }, 300);
  };

  if (interests.length === 0) {
    return (
      <div className="interest-bubble-container">
        <button className="interest-bubble-empty" onClick={onEmptyClick}>设置关注领域</button>
      </div>
    );
  }

  return (
    <div className="interest-bubble-container">
      {interests.map((catId, i) => {
        const cat = categories.find(c => c.id === catId);
        const label = cat?.label || catId;
        const color = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
        const isPopping = popping.has(i);
        const isEntering = entering.has(catId);

        return (
          <button
            key={catId}
            className={`interest-bubble${isPopping ? ' popping' : ''}${isEntering ? ' bubble-entering' : ''}`}
            style={{
              background: color.bg,
              border: `1.5px solid ${color.border}`,
              color: color.text,
              boxShadow: `0 2px 8px ${color.glow}`,
            }}
            onClick={() => onBubbleClick && onBubbleClick(catId)}
            onDoubleClick={() => handleDoubleClick(i)}
          >
            {label}
          </button>
        );
      })}
      <button className="interest-bubble-empty" onClick={onEmptyClick} title="添加关注领域">+</button>
    </div>
  );
}
