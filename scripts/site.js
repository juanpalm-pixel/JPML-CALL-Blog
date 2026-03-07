(function () {
  const NAV_CONFIG = {
    blogPosts: {
      title: "Blog Posts",
      items: [
        { id: "post-introducing", label: "Introducing Myself" },
        { id: "post-call-background", label: "CALL Background" },
        { id: "post-speech-synthesis", label: "Speech Synthesis" },
        { id: "post-speech-recognition", label: "Speech Recognition" },
      ],
    },
    readings: {
      title: "Readings",
      items: [
        { id: "reading-longitudinal", label: "A longitudinal analysis of highly cited papers in four CALL journals" },
        { id: "reading-sla-history", label: "A short history of SLA: Where have we come from and where are we going?" },
        { id: "reading-forty-two", label: "Forty-two years of computer-assisted language learning research" },
        { id: "reading-pedagogical-biases", label: "Pedagogical Biases in AI-Powered Educational Tools" },
        { id: "reading-self-imitation", label: "After Self-Imitation Prosodic Training" },
        { id: "reading-i-can-speak", label: "<i>I Can Speak</i>: improving English pronunciation" },
      ],
    },
  };

  const pageContainer = document.querySelector(".page-container");
  const sideTab = document.querySelector(".side-tab");
  const mainContent = document.querySelector(".main-content");
  const dropdownNav = document.querySelector(".top-dropdown-nav");
  const mainContentMinimumWidth = 560;

  if (!pageContainer || !sideTab || !mainContent || !dropdownNav) {
    return;
  }

  const isPostPage = /\/posts\/[^/]+\.html$/i.test(window.location.pathname.replace(/\\/g, "/"));
  const basePrefix = isPostPage ? "../index.html#" : "#";

  function hrefFor(anchorId) {
    return `${basePrefix}${anchorId}`;
  }

  function renderTopDropdownNav() {
    const blogItemsHtml = NAV_CONFIG.blogPosts.items
      .map((item) => `<a class="top-nav-item" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    const readingItemsHtml = NAV_CONFIG.readings.items
      .map((item) => `<a class="top-nav-item" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    dropdownNav.innerHTML = `
      <div class="top-dropdown-inner">
        <a href="#top" class="top-nav-control">Back to Top ↑</a>
        <details class="top-nav-dropdown">
          <summary class="top-nav-control">${NAV_CONFIG.blogPosts.title}</summary>
          <div class="top-nav-menu">${blogItemsHtml}</div>
        </details>
        <details class="top-nav-dropdown">
          <summary class="top-nav-control">${NAV_CONFIG.readings.title}</summary>
          <div class="top-nav-menu">${readingItemsHtml}</div>
        </details>
      </div>`;
  }

  function renderSideTab() {
    const blogItemsHtml = NAV_CONFIG.blogPosts.items
      .map((item) => `<a class="side-tab-item side-tab-item-blog" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    const readingItemsHtml = NAV_CONFIG.readings.items
      .map((item) => `<a class="side-tab-item side-tab-item-reading" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    sideTab.innerHTML = `
      <div class="back-to-top">
        <a href="#top" class="back-to-top-link">Back to Top ↑</a>
      </div>
      <div class="side-tab-group">
        <a class="side-tab-title" href="${hrefFor("blog-posts")}">${NAV_CONFIG.blogPosts.title}</a>
        <div class="side-tab-box">${blogItemsHtml}</div>
      </div>
      <div class="side-tab-group">
        <a class="side-tab-title" href="${hrefFor("readings")}">${NAV_CONFIG.readings.title}</a>
        <div class="side-tab-box">${readingItemsHtml}</div>
      </div>`;
  }

  function updateNavigationMode() {
    pageContainer.classList.remove("nav-dropdown-mode");
    document.documentElement.style.scrollPaddingTop = "0";

    const sideStyles = window.getComputedStyle(sideTab);
    const sideTotalWidth =
      sideTab.getBoundingClientRect().width +
      parseFloat(sideStyles.marginLeft) +
      parseFloat(sideStyles.marginRight);

    const pageStyles = window.getComputedStyle(pageContainer);
    const availableWidth =
      pageContainer.clientWidth -
      parseFloat(pageStyles.paddingLeft) -
      parseFloat(pageStyles.paddingRight);

    const remainingMainWidth = availableWidth - sideTotalWidth;
    const shouldUseDropdownMode = remainingMainWidth < mainContentMinimumWidth;

    if (shouldUseDropdownMode) {
      pageContainer.classList.add("nav-dropdown-mode");
      document.documentElement.style.scrollPaddingTop = "4.5rem";
    }
  }

  function bindDropdownBehavior() {
    dropdownNav.addEventListener("click", function (event) {
      const clickedLink = event.target.closest(".top-nav-item");
      if (!clickedLink) {
        return;
      }

      dropdownNav.querySelectorAll("details[open]").forEach(function (dropdown) {
        dropdown.removeAttribute("open");
      });
    });

    dropdownNav.querySelectorAll(".top-nav-dropdown").forEach(function (dropdown) {
      dropdown.addEventListener("toggle", function () {
        if (!dropdown.open) {
          return;
        }

        dropdownNav.querySelectorAll(".top-nav-dropdown").forEach(function (otherDropdown) {
          if (otherDropdown !== dropdown) {
            otherDropdown.removeAttribute("open");
          }
        });
      });
    });
  }

  renderTopDropdownNav();
  renderSideTab();
  bindDropdownBehavior();
  window.addEventListener("resize", updateNavigationMode);
  window.addEventListener("load", updateNavigationMode);
  updateNavigationMode();
})();