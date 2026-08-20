(async function () {
  const nodes = document.querySelectorAll("[data-content-key]");
  if (!nodes.length || !window.HCCCR_DATA?.getSiteContent) return;

  try {
    const stored = await window.HCCCR_DATA.getSiteContent();
    const content = { ...(window.HCCCR_CONTENT_DEFAULTS || {}), ...stored };
    nodes.forEach((node) => {
      const value = content[node.dataset.contentKey];
      if (value !== undefined) node.textContent = value;
    });
    document.documentElement.dataset.contentReady = "true";
  } catch (error) {
    console.warn("Site content unavailable; using static defaults.", error);
  }
})();
