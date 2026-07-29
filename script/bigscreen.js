(function () {
  const updateBigScreen = () => {
    const big = window.screen.width >= 2000 && window.innerWidth >= 2000;
    document.documentElement.classList.toggle("big-screen", big);
  };
  updateBigScreen();
  window.addEventListener("resize", updateBigScreen);
})();
