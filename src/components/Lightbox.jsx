import { ICONS } from '../constants/index.jsx';

export default function Lightbox({ lightbox, setLightbox }) {
  if (!lightbox.open) return null;
  const imgs = lightbox.images && lightbox.images.length > 0 ? lightbox.images : [lightbox.src];
  const curIdx = lightbox.index || 0;
  const hasMulti = imgs.length > 1;
  const prev = () => setLightbox(p => ({ ...p, index: (curIdx - 1 + imgs.length) % imgs.length, src: imgs[(curIdx - 1 + imgs.length) % imgs.length] }));
  const next = () => setLightbox(p => ({ ...p, index: (curIdx + 1) % imgs.length, src: imgs[(curIdx + 1) % imgs.length] }));
  return (
    <div className="lightbox-overlay" onClick={() => setLightbox({ open: false, src: '', title: '', images: [], index: 0 })}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={() => setLightbox({ open: false, src: '', title: '', images: [], index: 0 })}>{ICONS.x}</button>
        {hasMulti && <button className="lightbox-nav lightbox-prev" onClick={prev}>{ICONS.chevronLeft}</button>}
        <img src={imgs[curIdx]} alt={lightbox.title} className="lightbox-img" />
        {hasMulti && <button className="lightbox-nav lightbox-next" onClick={next}>{ICONS.chevronRight}</button>}
        {lightbox.title && <p className="lightbox-title">{lightbox.title}</p>}
        {hasMulti && <span className="lightbox-counter">{curIdx + 1} / {imgs.length}</span>}
      </div>
    </div>
  );
}
