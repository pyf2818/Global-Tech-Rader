// AiElf 输入区域：引用上下文 + 输入框 + 任务建议 + 发送按钮
// 从 src/AiElf.jsx 抽离，纯展示组件

export default function InputArea({
  quotedContext,
  setQuotedContext,
  inputText,
  setInputText,
  sendMessage,
  activeAgent,
  isLoading,
  missions,
  runMission,
}) {
  return (
    <div className="ai-elf-chat-input-area">
      {quotedContext && (
        <div className="ai-elf-quoted-context">
          <div className="ai-elf-quoted-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>{quotedContext.title || '引用上下文'}</span>
          </div>
          <div className="ai-elf-quoted-content">{quotedContext.content}</div>
          <button
            className="ai-elf-quoted-clear"
            onClick={() => setQuotedContext(null)}
            title="清除引用"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <textarea
        className="ai-elf-chat-input"
        placeholder={quotedContext ? `基于以上情报继续追问...` : `给${activeAgent?.name}下达任务，例如：只解释对我的影响 / 生成选题 / 更新追踪记忆`}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }}
        rows={2}
      />
      {missions.length > 0 && !quotedContext && (
        <div className="ai-elf-input-suggestions">
          {missions.slice(0, 3).map(mission => (
            <button key={mission.id} onClick={() => runMission(mission)}>
              {mission.label}
            </button>
          ))}
        </div>
      )}
      <button
        className="ai-elf-send-btn"
        onClick={() => sendMessage()}
        disabled={isLoading || !inputText.trim()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
