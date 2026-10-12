// "Try our AI": sends the visitor's product idea to /api/demo and streams the answer in.
// Markup: see the [data-ai-demo] section in demo.html.
(function () {
  const root = document.querySelector('[data-ai-demo]');
  if (!root) return;

  const form = root.querySelector('form');
  const input = root.querySelector('textarea');
  const counter = root.querySelector('[data-ai-count]');
  const button = form.querySelector('button[type="submit"]');
  const output = root.querySelector('[data-ai-output]');
  const answer = root.querySelector('[data-ai-answer]');
  const typing = root.querySelector('[data-ai-typing]');
  const notice = root.querySelector('[data-ai-notice]');
  const MAX = Number(input.getAttribute('maxlength')) || 500;

  const MESSAGES = {
    empty: 'Describe your product idea in a sentence or two first.',
    too_long: `Please keep it under ${MAX} characters.`,
    rate_limited: 'You’ve reached the demo limit for now. Try again in about ten minutes, or just get in touch and we’ll talk it through.',
    busy: 'The demo is busy right now. Please try again in a minute.',
    refused: 'The AI couldn’t answer that one. Try describing a product idea instead.',
    default: 'Something went wrong on our side. Please try again, or contact us directly.',
  };

  function updateCount() {
    counter.textContent = `${input.value.length} / ${MAX}`;
  }

  function setNotice(text) {
    notice.textContent = text || '';
    notice.hidden = !text;
  }

  function setBusy(busy) {
    button.disabled = busy;
    output.setAttribute('aria-busy', String(busy));
    typing.hidden = !busy;
  }

  async function submit(event) {
    event.preventDefault();
    const idea = input.value.trim();
    setNotice('');
    if (!idea) return setNotice(MESSAGES.empty);
    if (idea.length > MAX) return setNotice(MESSAGES.too_long);

    answer.textContent = '';
    output.hidden = false;
    setBusy(true);

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'default');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newline;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const msg = JSON.parse(line);

          if (msg.t) {
            typing.hidden = true; // first token replaces the typing indicator
            answer.append(msg.t);
          } else if (msg.error) {
            throw new Error(msg.error);
          } else if (msg.done && msg.truncated) {
            answer.append(' …');
          }
        }
      }
    } catch (err) {
      setNotice(MESSAGES[err.message] || MESSAGES.default);
      if (!answer.textContent) output.hidden = true;
    } finally {
      setBusy(false);
    }
  }

  input.addEventListener('input', updateCount);
  form.addEventListener('submit', submit);
  updateCount();
})();
