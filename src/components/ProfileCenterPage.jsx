import { ICONS } from '../constants/index.jsx';
import { CATEGORIES } from '../constants/index.jsx';

function toggleInterest(categoryId, current, setter) {
  if (current.includes(categoryId)) {
    setter(prev => prev.filter(id => id !== categoryId));
  } else {
    setter(prev => [...prev, categoryId]);
  }
}

export default function ProfileCenterPage({
  selectedInterests,
  readingHistory,
  bookmarks,
  dailyProfileSnapshots,
  generateDailyProfileSnapshot,
  setShowInterestModal,
  intelligenceProfile,
  profileLearningEngine,
  profilePriorityItems,
  sourcePriorityItems,
  domainPriorities,
  sourcePriorities,
  setDomainPriorities,
  setSourcePriorities,
  profileCalibrationSignals,
}) {
  return (
    <div className="product-page profile-center-page">
      <section className="product-hero profile-hero">
        <div>
          <div className="workbench-kicker">Personal Intelligence Memory</div>
          <h1>用户画像</h1>
          <p>设置关注领域、领域优先级、信号源优先级，并按日期记录每日 AI 画像，让系统越用越懂你。</p>
        </div>
        <div className="product-hero-actions">
          <button className="ai-primary-action" onClick={generateDailyProfileSnapshot}>生成今日画像</button>
          <button className="secondary-action" onClick={setShowInterestModal}>调整关注领域</button>
        </div>
      </section>

      <section className="profile-summary-grid">
        <div>
          <span>关注领域</span>
          <strong>{selectedInterests.length}</strong>
          <p>{intelligenceProfile.focusLabels.slice(0, 4).join('、') || '尚未设置'}</p>
        </div>
        <div>
          <span>阅读点击</span>
          <strong>{readingHistory.length}</strong>
          <p>近 100 条点击记录用于校准推荐</p>
        </div>
        <div>
          <span>收藏资讯</span>
          <strong>{bookmarks.length}</strong>
          <p>收藏会提高相似主题和来源权重</p>
        </div>
        <div>
          <span>每日画像</span>
          <strong>{dailyProfileSnapshots.length}</strong>
          <p>按日期保留 AI 对你的理解变化</p>
        </div>
      </section>

      <section className="profile-learning-panel">
        <div className="profile-learning-main">
          <div className="section-header">
            <h2 className="section-title">{ICONS.sparkles} 画像学习引擎</h2>
            <p className="section-desc">系统把关注领域、阅读点击、收藏、素材沉淀和反馈动作汇总成可解释的推荐记忆。</p>
          </div>
          <div className="profile-learning-score">
            <strong>{profileLearningEngine.confidence}%</strong>
            <span>{profileLearningEngine.confidenceLabel} · {profileLearningEngine.behaviorDepth}</span>
            <p>{profileLearningEngine.summary}</p>
          </div>
          <div className="profile-learning-actions">
            {(profileLearningEngine.nextActions.length ? profileLearningEngine.nextActions : ['继续阅读每日汇报并收藏真正有价值的内容']).map(action => (
              <button key={action} onClick={() => alert(action)}>{action}</button>
            ))}
          </div>
        </div>
        <div className="profile-learning-side">
          <div>
            <span>强领域</span>
            <p>{profileLearningEngine.topCategories.slice(0, 3).map(item => item.label).join('、') || '等待校准'}</p>
          </div>
          <div>
            <span>信任来源</span>
            <p>{profileLearningEngine.topSources.slice(0, 3).map(item => item.name).join('、') || '等待阅读行为'}</p>
          </div>
          <div>
            <span>记忆关键词</span>
            <p>{profileLearningEngine.topTags.slice(0, 5).map(item => item.name).join('、') || '暂无'}</p>
          </div>
          <div>
            <span>探索盲区</span>
            <p>{profileLearningEngine.blindSpots.slice(0, 3).join('、') || '覆盖较均衡'}</p>
          </div>
        </div>
      </section>

      <section className="profile-control-layout">
        <div className="profile-control-panel">
          <div className="section-header">
            <h2 className="section-title">{ICONS.target} 领域优先级</h2>
            <p className="section-desc">数值越高，每日汇报越优先推荐该领域的高质量信息。</p>
          </div>
          <div className="priority-list">
            {profilePriorityItems.map(item => (
              <label key={item.id} className="priority-row">
                <span>{ICONS[item.icon]} {item.label}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={domainPriorities[item.id] ?? item.priority}
                  onChange={e => setDomainPriorities(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                />
                <strong>{domainPriorities[item.id] ?? item.priority}</strong>
              </label>
            ))}
          </div>
        </div>

        <div className="profile-control-panel">
          <div className="section-header">
            <h2 className="section-title">{ICONS.layers} 信号源优先级</h2>
            <p className="section-desc">结合阅读、收藏和来源健康度，手动校准你更信任的来源。</p>
          </div>
          <div className="priority-list">
            {sourcePriorityItems.map(item => (
              <label key={item.name} className="priority-row">
                <span>{item.name}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sourcePriorities[item.name] ?? item.priority}
                  onChange={e => setSourcePriorities(prev => ({ ...prev, [item.name]: Number(e.target.value) }))}
                />
                <strong>{sourcePriorities[item.name] ?? item.priority}</strong>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="profile-calibration-panel">
        <div className="section-header">
          <h2 className="section-title">{ICONS.sparkles} 推荐校准状态</h2>
          <p className="section-desc">这些信号已经接入每日汇报排序，让系统从"你设置了什么、读了什么、收藏了什么"里持续学习。</p>
        </div>
        <div className="profile-calibration-grid">
          {profileCalibrationSignals.map(signal => (
            <div key={signal.label} className="profile-calibration-card">
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-memory-panel">
        <div className="section-header">
          <h2 className="section-title">{ICONS.calendar} 每日 AI 画像记录</h2>
          <p className="section-desc">每日记录会保留系统对你的关注领域、追踪关键词和输出目标的理解。</p>
        </div>
        {dailyProfileSnapshots.length === 0 ? (
          <div className="empty-state">
            <p>还没有画像记录</p>
            <button onClick={generateDailyProfileSnapshot}>生成第一条记录</button>
          </div>
        ) : (
          <div className="profile-snapshot-list">
            {dailyProfileSnapshots.map(snapshot => (
              <article key={snapshot.date} className="profile-snapshot">
                <span>{snapshot.date}</span>
                <strong>{snapshot.depth} · {snapshot.outputGoal}</strong>
                <p>关注：{snapshot.focus.join('、') || '未设置'}；追踪：{(snapshot.tracked || []).join('、') || '暂无'}；来源：{(snapshot.sources || []).join('、') || '暂无'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
