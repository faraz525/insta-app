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
          var res = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
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
          var res = await fetch('/delete-app/' + id, { method: 'POST', credentials: 'same-origin' });
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
