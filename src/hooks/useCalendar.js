// useCalendar — 日历管理，从 App.jsx 1213-1216 + 5374-5387 行提取

import { useState } from 'react';
import { loadLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';

export function useCalendar() {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [events, setEvents] = useState(() => loadLS('calendarEvents', []));
  const [eventForm, setEventForm] = useState({ title: '', time: '', color: '#22d3ee' });
  const [showEventForm, setShowEventForm] = useState(false);

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addEvent() {
    if (!eventForm.title) return;
    setEvents(prev => [...prev, {
      id: Date.now(),
      title: eventForm.title,
      time: eventForm.time,
      color: eventForm.color,
      date: fmtDate(calendarDate)
    }]);
    setEventForm({ title: '', time: '', color: '#22d3ee' });
    setShowEventForm(false);
    showToast('事件已添加');
  }

  function removeEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  return {
    calendarDate, setCalendarDate,
    events, setEvents,
    eventForm, setEventForm,
    showEventForm, setShowEventForm,
    addEvent, removeEvent, fmtDate,
  };
}
