import { useState, type FormEvent } from 'react';
import { ArrowRight, Bot, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { FinanceApiError, financeApi, type AssistantHistoryMessage } from '../../lib/finance-api';

const prompts = ['How did my spending look over the last 6 months?', 'What are my biggest expense categories?', 'How can I make a realistic monthly budget?'];

export function AssistantChatPage() {
  const [messages, setMessages] = useState<AssistantHistoryMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, suggested?: string) {
    event?.preventDefault();
    const text = (suggested ?? draft).trim();
    if (!text || isSending) return;
    const history = messages.slice(-10);
    setMessages((current) => [...current, { role: 'user', text }]);
    setDraft('');
    setError('');
    setIsSending(true);
    try {
      const result = await financeApi.chatAssistant(text, history);
      setMessages((current) => [...current, { role: 'model', text: result.data.reply }]);
    } catch (caught) {
      const message = caught instanceof FinanceApiError ? caught.message : 'The assistant could not reply. Please try again.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  return <section className="data-page assistant-page">
    <header className="data-page__header"><p className="eyebrow">PERSONAL FINANCE, IN CONTEXT</p><h1>AI assistant</h1><p>Ask questions about your recorded income and spending.</p></header>
    <div className="assistant-chat-card">
      <div className="assistant-chat-heading"><span className="assistant-chat-icon"><Bot size={20} /></span><div><strong>FinPilot assistant</strong><small>Grounded in your aggregated financial data</small></div><span className="assistant-private"><ShieldCheck size={14} /> Private</span></div>
      <div className="assistant-chat-body" role="log" aria-live="polite">
        {messages.length === 0 && <div className="assistant-chat-empty"><span className="assistant-chat-sparkle"><Sparkles size={23} /></span><h2>What would you like to understand?</h2><p>I use your recent transaction totals and categories to answer. I won’t invent numbers when the data doesn’t include them.</p><div className="assistant-prompt-list">{prompts.map((prompt) => <button type="button" key={prompt} disabled={isSending} onClick={() => void sendMessage(undefined, prompt)}>{prompt}<ArrowRight size={15} /></button>)}</div></div>}
        {messages.map((item, index) => <article className={`assistant-message ${item.role === 'user' ? 'assistant-message-user' : 'assistant-message-model'}`} key={`${item.role}-${index}`}><span className="assistant-message-avatar">{item.role === 'user' ? <UserRound size={16} /> : <Bot size={16} />}</span><p>{item.text}</p></article>)}
        {isSending && <article className="assistant-message assistant-message-model"><span className="assistant-message-avatar"><Bot size={16} /></span><p>Thinking through your financial context…</p></article>}
        {error && <p className="assistant-error" role="alert">{error}</p>}
      </div>
      <form className="assistant-chat-form" onSubmit={(event) => void sendMessage(event)}><label className="sr-only" htmlFor="assistant-question">Your question</label><textarea id="assistant-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Ask about your spending or budget…" disabled={isSending} /><button type="submit" aria-label="Send question" disabled={isSending || !draft.trim()}><Send size={17} /> Send</button></form>
      <p className="assistant-chat-disclaimer">For general education only—not investment, tax, legal, or credit advice. Avoid sharing account credentials.</p>
    </div>
  </section>;
}
