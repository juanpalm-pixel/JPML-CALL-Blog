(function () {
  const NAV_CONFIG = {
    blogPosts: {
      title: "Blog Posts", //To add, simply set id: as the anchor ID, and label: as the display text
      items: [
        { id: "post-introducing", label: "Introducing Myself" },
        { id: "post-call-background", label: "CALL Background" },
        { id: "post-speech-synthesis", label: "Speech Synthesis" },
        { id: "post-speech-recognition", label: "Speech Recognition" },
        { id: "llms-in-call", label: "LLMs in CALL" },
      ],
    },
    technologies: {
      title: "Technologies", // To add, simply set id: as the anchor ID, and label: as the display text
      items: [
        { id: "technology-speech-synthesis", label: "Speech Synthesis" },
        { id: "technology-speech-recognition", label: "Speech Recognition" },
        { id: "technology-h5p", label: "H5P" },
      ],
    },
    readings: {
      title: "Readings", // To add, simply set id: as the anchor ID, and label: as the display text 
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

  const pageContainer = document.querySelector(".page-container"); // The main wrapper that contains both the side tab and the main content
  const sideTab = document.querySelector(".side-tab"); // The side navigation tab on the left
  const mainContent = document.querySelector(".main-content"); // The main content area on the right
  const dropdownNav = document.querySelector(".top-dropdown-nav"); // The container for the dropdown navigation that appears on smaller screens
  const mainContentMinimumWidth = 560; // Minimum width required for the main content to be readable without needing to switch to dropdown mode

  if (!pageContainer || !sideTab || !mainContent || !dropdownNav) { 
    return;
  } // This check ensures that the script only runs on pages that have the expected structure (i.e., an element with class "page-container" that contains the necessary child elements). If any of these elements are missing, it likely means we're on a page that doesn't use this navigation setup, so we simply exit the function without doing anything.

  // Determine the correct path prefix to navigate back to index.html with anchor links
  // We need to detect if we're on index.html or on a subpage, and calculate the relative path accordingly
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const isIndexPage = /\/index\.html$/i.test(pathname) || pathname.endsWith("/");
  
  let basePrefix;
  if (isIndexPage) {
    // We're on index.html, so just use anchor links
    basePrefix = "#";
  } else if (/\/posts\/[^/]+\.html$/i.test(pathname)) {
    // We're in the /posts/ directory (one level deep)
    basePrefix = "../index.html#";
  } else if (/\/technologies\/[^/]+\/[^/]+\.html$/i.test(pathname)) {
    // We're in a /technologies/subfolder/ directory (two levels deep)
    basePrefix = "../../index.html#";
  } else if (/\/project\/[^/]+\.html$/i.test(pathname)) {
    // We're in the /project/ directory (one level deep)
    basePrefix = "../index.html#";
  } else {
    // Default fallback: assume we're one level deep
    basePrefix = "../index.html#";
  }

  function hrefFor(anchorId) {
    return `${basePrefix}${anchorId}`;
  } // This helper function constructs the full href for a given anchor ID based on the current page context. It uses the basePrefix determined earlier to ensure that the links work correctly whether we're on a post page or the index page.

  function renderTopDropdownNav() {
    const blogItemsHtml = NAV_CONFIG.blogPosts.items
      .map((item) => `<a class="top-nav-item" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join(""); // This generates the HTML for the blog posts section of the dropdown navigation by mapping over the items defined in the NAV_CONFIG and creating anchor tags for each one. The href for each link is constructed using the hrefFor helper function to ensure it points to the correct location based on the current page context.

    const technologiesItemsHtml = NAV_CONFIG.technologies.items
      .map((item) => `<a class="top-nav-item" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    const readingItemsHtml = NAV_CONFIG.readings.items
      .map((item) => `<a class="top-nav-item" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join(""); // Similar to the blog items, this generates the HTML for the readings section of the dropdown navigation by mapping over the readings items in the NAV_CONFIG and creating anchor tags for each one.

    dropdownNav.innerHTML = `
      <div class="top-dropdown-inner">
        <a href="#top" class="top-nav-control">Back to Top ↑</a>
        <details class="top-nav-dropdown">
          <summary class="top-nav-control">${NAV_CONFIG.blogPosts.title}</summary>
          <div class="top-nav-menu">${blogItemsHtml}</div>
        </details>
        <details class="top-nav-dropdown">
          <summary class="top-nav-control">${NAV_CONFIG.technologies.title}</summary>
          <div class="top-nav-menu">${technologiesItemsHtml}</div>
        </details>
        <details class="top-nav-dropdown">
          <summary class="top-nav-control">${NAV_CONFIG.readings.title}</summary>
          <div class="top-nav-menu">${readingItemsHtml}</div>
        </details>
      </div>`; // This sets the inner HTML of the dropdown navigation container to include a "Back to Top" link and two dropdown sections: one for blog posts and one for readings. Each dropdown uses the <details> and <summary> elements to create a collapsible menu, and the contents of each menu are populated with the HTML generated from the NAV_CONFIG for blog posts and readings.
  }

  function renderSideTab() {
    const blogItemsHtml = NAV_CONFIG.blogPosts.items
      .map((item) => `<a class="side-tab-item side-tab-item-blog" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join(""); // This generates the HTML for the blog posts section of the side tab by mapping over the items defined in the NAV_CONFIG and creating anchor tags for each one. The href for each link is constructed using the hrefFor helper function to ensure it points to the correct location based on the current page context.

    const technologiesItemsHtml = NAV_CONFIG.technologies.items
      .map((item) => `<a class="side-tab-item side-tab-item-blog" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join("");

    const readingItemsHtml = NAV_CONFIG.readings.items
      .map((item) => `<a class="side-tab-item side-tab-item-reading" href="${hrefFor(item.id)}">${item.label}</a>`)
      .join(""); // Similar to the blog items, this generates the HTML for the readings section of the side tab by mapping over the readings items in the NAV_CONFIG and creating anchor tags for each one.

    sideTab.innerHTML = `
      <div class="back-to-top">
        <a href="#top" class="back-to-top-link">Back to Top ↑</a>
      </div>
      <div class="side-tab-group">
        <a class="side-tab-title" href="${hrefFor("blog-posts")}">${NAV_CONFIG.blogPosts.title}</a>
        <div class="side-tab-box">${blogItemsHtml}</div>
      </div>
      <div class="side-tab-group">
        <a class="side-tab-title" href="${hrefFor("technologies")}">${NAV_CONFIG.technologies.title}</a>
        <div class="side-tab-box">${technologiesItemsHtml}</div>
      </div>
      <div class="side-tab-group">
        <a class="side-tab-title" href="${hrefFor("readings")}">${NAV_CONFIG.readings.title}</a>
        <div class="side-tab-box">${readingItemsHtml}</div>
      </div>`; // This sets the inner HTML of the side tab container to include a "Back to Top" link and two groups: one for blog posts and one for readings. Each group has a title and a box containing the respective links.
  }

  function updateNavigationMode() {
    pageContainer.classList.remove("nav-dropdown-mode");
    document.documentElement.style.scrollPaddingTop = "0"; // Reset any previous adjustments to scroll padding when switching back to side tab mode

    const sideStyles = window.getComputedStyle(sideTab); // Get the computed styles of the side tab to calculate its total width including margins. This is necessary to determine how much horizontal space the side tab will take up, which in turn affects how much space is left for the main content area.
    const sideTotalWidth =
      sideTab.getBoundingClientRect().width +
      parseFloat(sideStyles.marginLeft) +
      parseFloat(sideStyles.marginRight); // Calculate the total width of the side tab by taking its bounding rectangle width and adding the left and right margins. This gives us the full horizontal space that the side tab occupies on the page.

    const pageStyles = window.getComputedStyle(pageContainer); // Get the computed styles of the page container to calculate the available width for the main content area. This includes accounting for any padding on the page container, which reduces the effective width available for the side tab and main content.
    const availableWidth =
      pageContainer.clientWidth -
      parseFloat(pageStyles.paddingLeft) -
      parseFloat(pageStyles.paddingRight); // Calculate the available width for the side tab and main content by taking the client width of the page container and subtracting the left and right padding. This gives us the total horizontal space that can be used by both the side tab and the main content.

    const remainingMainWidth = availableWidth - sideTotalWidth; // Calculate the remaining width for the main content area by subtracting the total width of the side tab from the available width. This tells us how much horizontal space is left for the main content after accounting for the side tab.
    const shouldUseDropdownMode = remainingMainWidth < mainContentMinimumWidth; // Determine whether to switch to dropdown mode based on whether the remaining width for the main content is less than the defined minimum width. If the main content area would be too narrow to be readable, we switch to dropdown mode to provide a better user experience on smaller screens.

    if (shouldUseDropdownMode) {
      pageContainer.classList.add("nav-dropdown-mode");
      document.documentElement.style.scrollPaddingTop = "4.5rem"; 
    } // If the remaining width for the main content is sufficient, we keep the side tab navigation and ensure that any adjustments made for dropdown mode are reset.
  }

  function bindDropdownBehavior() {
    const dropdownInner = dropdownNav.querySelector(".top-dropdown-inner");

    function updateDropdownState() {
      const anyOpen = dropdownNav.querySelector(".top-nav-dropdown[open]");
      if (anyOpen) {
        dropdownInner.classList.add("has-open-dropdown");
      } else {
        dropdownInner.classList.remove("has-open-dropdown");
      }
    }

    dropdownNav.addEventListener("click", function (event) {
      const clickedLink = event.target.closest(".top-nav-item"); // Check if the clicked element (or any of its ancestors) has the class "top-nav-item", which indicates that it's one of the navigation links in the dropdown menu. If it is, we want to allow the default behavior of navigating to the anchor link. If it's not a navigation link (e.g., if the user clicked on the dropdown toggle or somewhere else in the dropdown), we want to close any open dropdowns without navigating.
      if (!clickedLink) {
        return;
      } // This event listener is added to the dropdown navigation container to handle clicks on the navigation links. When a click occurs, we check if the clicked element (or any of its ancestors) has the class "top-nav-item", which indicates that it's one of the navigation links. If it's not a navigation link, we simply return and do nothing.

      dropdownNav.querySelectorAll("details[open]").forEach(function (dropdown) {
        dropdown.removeAttribute("open");
      });
      updateDropdownState();
    });

    dropdownNav.querySelectorAll(".top-nav-dropdown").forEach(function (dropdown) {
      dropdown.addEventListener("toggle", function () {
        if (!dropdown.open) {
          updateDropdownState();
          return; // If the dropdown is being closed, we don't need to do anything else. We only want to close other dropdowns when a new one is being opened.
        }

        dropdownNav.querySelectorAll(".top-nav-dropdown").forEach(function (otherDropdown) {
          if (otherDropdown !== dropdown) {
            otherDropdown.removeAttribute("open");
          } // When a dropdown is opened, we want to close any other open dropdowns to ensure that only one dropdown menu is open at a time. This loop goes through all the dropdowns in the navigation and closes any that are not the one that was just opened.
        });
        updateDropdownState();
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