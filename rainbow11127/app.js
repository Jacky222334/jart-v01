function getCanvas() {
  return document.querySelector('#screen canvas');
}

function saveFrame() {
  const canvas = getCanvas();
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rainbow-l16-7f-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function regenerate() {
  window.dispatchEvent(new Event('resize'));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') saveFrame();
  if (e.key === 'r' || e.key === 'R') regenerate();
});

document.addEventListener('click', () => regenerate());
