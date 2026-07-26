import { ICONS } from '../constants/index.jsx';

export default function EventFormModal({
  showEventForm,
  setShowEventForm,
  setEvents,
}) {
  if (!showEventForm) return null;
  return (
    <div className="modal-backdrop" onClick={() => setShowEventForm(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加日程事件</h3>
              <button className="modal-close" onClick={() => setShowEventForm(false)}>{ICONS.x}</button>
            </div>
            <form className="add-material-form" onSubmit={e => {
              e.preventDefault();
              const title = e.target.title.value;
              const date = e.target.date.value;
              const time = e.target.time.value;
              const description = e.target.description.value;
              if (!title || !date) return;
              setEvents(prev => [...prev, {
                id: Date.now(),
                title,
                date,
                time,
                description,
                color: '#22d3ee'
              }]);
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
  );
}
