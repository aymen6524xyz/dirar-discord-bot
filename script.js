// Keep the static policy site dependency-free. This small enhancement closes the
// mobile navigation focus loop after a section link is selected.
document.querySelectorAll('.toc a').forEach((link) => {
  link.addEventListener('click', () => {
    link.blur();
  });
});
