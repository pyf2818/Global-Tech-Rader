import React from 'react';
import { BlockGrid, BlockStat } from '../blocks/index.js';
import {
  PROFILE_TIER_OPTIONS,
  PROFILE_TIERS,
  SPECIAL_FOLLOW_TYPES,
} from '../domain/intelligence/profileTiers.js';
import { ICONS } from '../App.jsx';
import { showToast } from '../utils/toast.js';

export default function ProfilePage({
  intelligenceProfile,
  bookmarks,
  readingHistory,
  dailyProfileSnapshots,
  profileLearningEngine,
  profilePriorityItems,
  setDomainTiers,
  sourcePriorityItems,
  setSourceTiers,
  specialFollows,
  setSpecialFollows,
  specialFollowForm,
  setSpecialFollowForm,
  editingSpecialFollowId,
  setEditingSpecialFollowId,
  profileCalibrationSignals,
  generateDailyProfileSnapshot,
  setShowInterestModal,
}) {
  const resetForm = () => {
    setSpecialFollowForm({ type: 'source', target: '', note: '' });
    setEditingSpecialFollowId(null);
  };

  const submit = () => {
    const target = specialFollowForm.target.trim();
    const note = specialFollowForm.note.trim();
    if (!target) {
      showToast('请输入特别关注目标');
      return;
    }
    const duplicate = specialFollows.some(item =>
      item.id !== editingSpecialFollowId
      && item.type === specialFollowForm.type
      && item.target.toLocaleLowerCase() === target.toLocaleLowerCase()
    );
    if (duplicate) {
      showToast('该特别关注已存在');
      return;
    }
    if (editingSpecialFollowId) {
      setSpecialFollows(previous => previous.map(item => item.id === editingSpecialFollowId
        ? { ...item, type: specialFollowForm.type, target, note }
        : item));
    } else {
      setSpecialFollows(previous => [...previous, {
        id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
        type: specialFollowForm.type,
        target,
        note,
      }]);
    }
    resetForm();
  };

  const editFollow = item => {
    setEditingSpecialFollowId(item.id);
    setSpecialFollowForm({ type: item.type, target: item.target, note: item.note || '' });
  };

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
          <button className="secondary-action" onClick={() => setShowInterestModal(true)}>调整关注领域</button>
        </div>
      </section>

      <BlockGrid columns={3}>
        <BlockStat variant="card" label="关注领域" value={intelligenceProfile.focusLabels.length} desc={intelligenceProfile.focusLabels.slice(0, 4).join('、') || '尚未设置'} />
        <BlockStat variant="card" label="阅读点击" value={readingHistory.length} desc="近 100 条点击记录用于校准推荐" />
        <BlockStat variant="card" label="收藏资讯" value={bookmarks.length} desc="收藏会提高相似主题和来源权重" />
        <BlockStat variant="card" label="每日画像" value={dailyProfileSnapshots.length} desc="按日期保留 AI 对你的理解变化" />
      </BlockGrid>

      <section className="profile-control-layout">
        <div className="profile-control-panel">
          <div className="section-header">
            <h2 className="section-title">{ICONS.target} 领域优先级</h2>
            <p className="section-desc">一级进入核心必看，二级正常参与，三级保留探索价值但降低出现频率。</p>
          </div>
          <div className="priority-list">
            {profilePriorityItems.map(item => (
              <div key={item.id} className="priority-row" data-testid="profile-domain-row" data-domain-id={item.id}>
                <span>{ICONS[item.icon]} {item.label}</span>
                <div className="profile-tier-control" role="group" aria-label={item.label + '关注等级'}>

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
              <button key={action} onClick={() => showToast(action)}>{action}</button>
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
