/** In iframe · Animation auf Musik reagieren lassen */
(function jartAudioReactive() {
  if (window.__jartAudioReactive) return;
  window.__jartAudioReactive = true;

  window.__jartAudio = { bass: 0, mid: 0, treble: 0, beat: 0, rms: 0, l: 0, r: 0 };

  const target = document.querySelector('canvas') || document.body;
  target.style.transformOrigin = '50% 50%';
  target.style.willChange = 'transform';

  function apply(d) {
    window.__jartAudio = d;
    document.dispatchEvent(new CustomEvent('jart-audio', { detail: d }));
    const scale = 1 + d.bass * 0.1 + d.beat * 0.06;
    const rot = (d.mid - d.treble) * 3.5 + (d.l - d.r) * 4;
    const ty = -d.mid * 10 - d.beat * 6;
    const tx = (d.l - d.r) * 12;
    target.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rot}deg)`;
  }

  window.addEventListener('message', (e) => {
    if (e.data?.type !== 'jart-audio-drive') return;
    apply(e.data);
  });
})();
