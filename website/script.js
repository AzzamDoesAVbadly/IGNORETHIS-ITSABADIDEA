document.addEventListener('DOMContentLoaded', async () => {
  const statusLine = document.getElementById('status-line');
  if (statusLine) {
    const now = new Date();
    statusLine.textContent = `Budget mode: humble and cheap — ${now.toLocaleDateString()}`;
  }

  const consentBanner = document.getElementById('consent-banner');
  const consentButtons = document.querySelectorAll('[data-consent]');
  const topicList = document.getElementById('topic-list');
  const articleList = document.getElementById('article-list');
  const brandVoice = document.getElementById('brand-voice');
  const moodGrid = document.getElementById('mood-grid');
  const leadForm = document.getElementById('lead-form-element');
  const successMessage = document.getElementById('lead-success');
  const gateMessage = document.getElementById('gate-message');
  const journeyRoom = document.getElementById('journey-room');
  const nextRoomButton = document.getElementById('next-room');
  const offerList = document.getElementById('offer-list');
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutStatus = document.getElementById('checkout-status');
  const offerSelect = document.getElementById('offer-select');

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const setCookie = (name, value, days = 30) => {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };

  const getSessionId = () => {
    let sessionId = getCookie('ai_business_session');
    if (!sessionId) {
      sessionId = `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      setCookie('ai_business_session', sessionId);
    }
    return sessionId;
  };

  const recordInterest = async (interest) => {
    if (!interest) return;
    const sessionId = getSessionId();
    const consent = getCookie('ai_business_consent') || 'declined';
    if (consent !== 'accepted') return;
    try {
      await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, interest }),
      });
    } catch (error) {
      // ignore local-only preference tracking failures
    }
  };

  const handleConsent = async (choice) => {
    const sessionId = getSessionId();
    setCookie('ai_business_consent', choice);
    if (consentBanner) consentBanner.classList.add('hidden');
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, consent: choice, interests: choice === 'accepted' ? ['modern-art', 'local-ai', 'weird-growth'] : [] }),
      });
    } catch (error) {
      // ignore server consent failures for local-only tracking
    }
    if (choice === 'accept') {
      await recordInterest('modern-art');
      await recordInterest('weird-growth');
    }
  };

  if (consentBanner) {
    const savedConsent = getCookie('ai_business_consent');
    if (!savedConsent) {
      consentBanner.classList.remove('hidden');
    }
  }

  consentButtons.forEach((button) => {
    button.addEventListener('click', () => handleConsent(button.dataset.consent));
  });

  let journeyRoomIndex = 0;
  const roomOrder = ['drift-01', 'drift-02', 'drift-03'];

  const renderGate = async () => {
    if (!gateMessage) return;
    try {
      const response = await fetch('/api/dashboard');
      const payload = await response.json();
      const met = payload.gate && payload.gate.met;
      gateMessage.textContent = met
        ? `Status: open — traction crossed the threshold at ${payload.gate.threshold}.`
        : `Status: locked until traction clears the threshold of ${payload.gate.threshold}.`;
    } catch (error) {
      gateMessage.textContent = 'Status: locked until traction clears the threshold.';
    }
  };

  const renderTopics = async () => {
    if (!topicList) return;
    try {
      const response = await fetch('/api/topics');
      const payload = await response.json();
      const items = payload.items || [];
      topicList.innerHTML = items.length === 0
        ? '<li>No traction yet.</li>'
        : items.map(item => `<li><span>${item.topic}</span><strong>${item.score}</strong></li>`).join('');
    } catch (error) {
      topicList.innerHTML = '<li>Remote tracking is unavailable.</li>';
    }
  };

  const renderArticles = async () => {
    if (!articleList) return;
    try {
      const response = await fetch('/api/articles');
      const payload = await response.json();
      const items = payload.items || [];
      articleList.innerHTML = items.length === 0
        ? '<div class="article-item"><h3>Nothing published yet.</h3><p>Automation will publish the recurring value piece on the next cycle.</p></div>'
        : items.map(item => `
          <div class="article-item">
            <h3>${item.title}</h3>
            <small>${item.topic} • ${new Date(item.published_at).toLocaleString()}</small>
            <p>${item.summary}</p>
          </div>
        `).join('');
    } catch (error) {
      articleList.innerHTML = '<div class="article-item"><h3>Article feed unavailable.</h3></div>';
    }
  };

  const renderBrandVoice = async () => {
    if (!brandVoice || !moodGrid) return;
    try {
      const response = await fetch('/api/brand/voice');
      const payload = await response.json();
      const tones = (payload.voice && payload.voice.core_tone) || [];
      const promptExample = payload.page_prompt_example || 'The system is already listening.';
      brandVoice.innerHTML = `
        <p>${promptExample}</p>
        <div class="tag-row">${tones.slice(0, 6).map((tone) => `<span class="tone-tag">${tone}</span>`).join('')}</div>
      `;

      const moodsResponse = await fetch('/api/creative/moods');
      const moodsPayload = await moodsResponse.json();
      const moods = moodsPayload.moods || [];
      moodGrid.innerHTML = moods.map((mood) => `
        <article class="mood-card">
          <span class="eyebrow">${mood.mood}</span>
          <h3>${mood.title}</h3>
          <p>${mood.description}</p>
        </article>
      `).join('');
    } catch (error) {
      brandVoice.innerHTML = '<p>The brand signal is partially offline. The room is still listening.</p>';
      moodGrid.innerHTML = '<article class="mood-card"><h3>Signal unavailable</h3></article>';
    }
  };

  const renderJourney = async () => {
    if (!journeyRoom) return;
    try {
      const roomId = roomOrder[journeyRoomIndex % roomOrder.length];
      const response = await fetch(`/api/experience?room=${encodeURIComponent(roomId)}`);
      const payload = await response.json();
      journeyRoom.innerHTML = `
        <span class="eyebrow">${payload.vibe}</span>
        <h3>${payload.headline}</h3>
        <p>${payload.copy}</p>
        <ul>
          ${payload.signals.map(signal => `<li>${signal}</li>`).join('')}
        </ul>
        <p><strong>${payload.cta}</strong></p>
      `;
    } catch (error) {
      journeyRoom.innerHTML = '<p>The corridor is unstable right now. Please try again in a moment.</p>';
    }
  };

  const renderOffers = async () => {
    if (!offerList || !offerSelect) return;
    try {
      const response = await fetch('/api/offers');
      const payload = await response.json();
      const items = payload.items || [];
      offerSelect.innerHTML = items.map(item => `<option value="${item.id}">${item.name} — $${item.price}</option>`).join('');
      offerList.innerHTML = items.map(item => `
        <div class="offer-item">
          <div class="offer-meta">
            <h3>${item.name}</h3>
            <small>${item.description}</small>
          </div>
          <span class="offer-price">$${item.price}</span>
        </div>
      `).join('');
    } catch (error) {
      offerList.innerHTML = '<div class="offer-item"><h3>Offer stack unavailable.</h3></div>';
    }
  };

  if (nextRoomButton) {
    nextRoomButton.addEventListener('click', () => {
      journeyRoomIndex += 1;
      renderJourney();
      recordInterest('modern-art');
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('lead-email').value.trim();
      const topic = document.getElementById('lead-topic').value;
      if (!email) return;

      try {
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, topic, source: 'website' }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Unable to save lead');
        }

        if (successMessage) {
          successMessage.textContent = `Thanks — ${email} is on the list for ${topic}.`;
        }
        await recordInterest(topic);
        leadForm.reset();
        await renderTopics();
        await renderGate();
      } catch (error) {
        if (successMessage) {
          successMessage.textContent = 'The lead form could not save that email. Try again.';
        }
      }
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('buyer-email').value.trim();
      const product = offerSelect.value;
      const selected = (await fetch('/api/offers').then(res => res.json())).items.find(item => item.id === product) || { price: 0 };
      if (!email) {
        if (checkoutStatus) checkoutStatus.textContent = 'Add an email to place the order.';
        return;
      }

      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, product, amount: selected.price }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Checkout failed');
        }
        if (checkoutStatus) {
          checkoutStatus.textContent = `Order captured — ${selected.name} for $${selected.price}.`;
        }
        checkoutForm.reset();
      } catch (error) {
        if (checkoutStatus) {
          checkoutStatus.textContent = 'The order could not be captured. Try again.';
        }
      }
    });
  }

  await renderBrandVoice();
  await renderGate();
  await renderTopics();
  await renderArticles();
  await renderJourney();
  await renderOffers();
});
