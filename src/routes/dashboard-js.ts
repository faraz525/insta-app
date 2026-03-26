import { Hono } from "hono"
import type { Env } from "../types"

const dashboardJs = new Hono<{ Bindings: Env }>()

// Serve dashboard JavaScript as a separate file to avoid JSX encoding issues
// This contains only static, trusted code — no user input is interpolated.
dashboardJs.get("/dashboard.js", (c) => {
  const js = `
    var generateBtn = document.getElementById('generate-btn');
    var promptEl = document.getElementById('prompt');
    var statusEl = document.getElementById('status');
    var resultEl = document.getElementById('result');
    var charCount = document.getElementById('char-count');

    // Wait for ClerkJS to load and initialize
    async function waitForClerk() {
      if (window.Clerk && window.Clerk.loaded) return;
      if (window.Clerk) {
        await window.Clerk.load();
        return;
      }
      // Wait for script to load
      await new Promise(function(resolve) {
        var check = setInterval(function() {
          if (window.Clerk) { clearInterval(check); resolve(); }
        }, 100);
      });
      await window.Clerk.load();
    }

    // Get Clerk session token for authenticated fetch calls
    async function getToken() {
      await waitForClerk();
      if (window.Clerk && window.Clerk.session) {
        return window.Clerk.session.getToken();
      }
      return null;
    }

    async function authFetch(url, options) {
      var token = await getToken();
      if (!options) options = {};
      if (!options.headers) options.headers = {};
      if (token) options.headers['Authorization'] = 'Bearer ' + token;
      options.credentials = 'same-origin';
      return fetch(url, options);
    }

    if (promptEl && charCount) {
      promptEl.addEventListener('input', function() {
        charCount.textContent = promptEl.value.length + ' / 500';
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', async function() {
        var prompt = promptEl.value.trim();
        if (!prompt) {
          statusEl.textContent = 'Please enter a description first.';
          return;
        }

        generateBtn.disabled = true;
        generateBtn.classList.add('loading');
        generateBtn.childNodes[0].textContent = 'Generating... ';
        statusEl.textContent = 'Sending to AI...';
        resultEl.textContent = '';

        try {
          var res = await authFetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }),
          });

          statusEl.textContent = 'Got response (' + res.status + ')...';

          var data;
          try {
            data = await res.json();
          } catch(e) {
            statusEl.textContent = 'Error: Could not parse response. Status: ' + res.status;
            return;
          }

          if (!res.ok) {
            statusEl.textContent = 'Error: ' + (data.error || 'Generation failed. Status: ' + res.status);
            return;
          }

          statusEl.textContent = 'App created successfully!';
          var link = document.createElement('a');
          link.href = data.embed_url;
          link.textContent = 'View your app >';
          resultEl.textContent = '';
          resultEl.appendChild(link);

          var liveLink = document.createElement('a');
          liveLink.href = data.live_url;
          liveLink.target = '_blank';
          liveLink.textContent = ' | Open live >';
          resultEl.appendChild(liveLink);

          setTimeout(function() { window.location.reload(); }, 2000);
        } catch (err) {
          statusEl.textContent = 'Network error: ' + (err.message || 'Unknown error');
          console.error('Generate error:', err);
        } finally {
          generateBtn.disabled = false;
          generateBtn.classList.remove('loading');
          generateBtn.childNodes[0].textContent = 'Generate ';
        }
      });
    }

    document.querySelectorAll('[data-delete-id]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var id = btn.getAttribute('data-delete-id');
        if (!confirm('Delete this app?')) return;

        try {
          var res = await authFetch('/delete-app/' + id, { method: 'POST' });
          if (res.ok) {
            var card = btn.closest('.app-card');
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-8px)';
            setTimeout(function() { card.remove(); }, 300);
          }
        } catch (err) {
          console.error('Delete error:', err);
        }
      });
    });
  `

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  })
})

export default dashboardJs
