import { ICONS } from "../constants/index.jsx";

export default function CalendarPage({
  events, setEvents, removeEvent, showEventForm, setShowEventForm,
}) {
  return (
    <>
      <div className="trends-dashboard">
        <div className="trends-header">
          <h2>{ICONS.calendar}<span>日历管理</span></h2>
          <div className="header-actions">
            <button className="btn-new-article-pro" onClick={() => setShowEventForm(true)}>
              {ICONS.plus}
              <span>添加事件</span>
            </button>
          </div>
        </div>
        {events.length === 0 ? (
          <section className="trends-section">
            <div className="empty-state">
              <p>暂无日程事件</p>
              <p className="hint">点击"添加事件"按钮创建你的第一个日程</p>
            </div>
          </section>
        ) : (
          <section className="trends-section">
            <div className="events-list">
              {events.map(e => (
                <div key={e.id} className="event-item">
                  <div className="event-date">
                   <span className="event-day">{new Date(e.date).getDate()}</span>
                   <span className="event-month">{new Date(e.date).getMonth() + 1}月</span>
                  </div>
                  <div className="event-content">
                    {e.title && <h4 className="event-title">{e.title}</h4>}
                    {e.description && <p className="event-desc">{e.description}</p>}
                    {e.time && <p className="event-time">{e.time}</p>}
                  </div>
                  <button className="event-remove" onClick={() => removeEvent(e.id)} title="删除">{ICONS.x}</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showEventForm && (
        <div className="modal-backdrop" onClick={() => setShowEventForm(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加日程事件</h3>
              <button className="modal-close" onClick={() => setShowEventForm(false)}>{ICONS.x}</button>
            </div>
            <form className="add-material-form" onSubmit={e => {
              e.preventDefault();
              const { title, date, time, description } = e.target.elements;
              if (!title.value || !date.value) return;
              setEvents(prev => [...prev, { id: Date.now(), title: title.value, date: date.value, time: time.value, description: description.value, color: "#22d3ee" }]);
              setShowEventForm(false);
            }}>
              <div className="form-group">
                <label>事件标题</label>
                <input name="title" type="text" placeholder="输入事件标题" autoFocus required />
              </div>
              <div className="form-row">
                <div className="form-group form-group-flex">
                  <label>日期</label>
                  <input name="date" type="date" required />
                </div>
                <div className="form-group form-group-flex">
                  <label>时间</label>
                  <input name="time" type="time" />
                </div>
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea name="description" placeholder="可选描述..." rows="3" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowEventForm(false)}>取消</button>
                <button type="submit" className="btn-modal-submit">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
