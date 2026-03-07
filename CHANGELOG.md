# CHANGELOG

All notable changes to this CALL Blog project will be documented in this file.

## [Unreleased]

### Latest Changes (March 7, 2026)

#### Added
- **Side Navigation to Blog Posts**: Added side navigation (side-tab) to all blog post pages (01_about_me.html, 02_call_background.html, 03_speech_synthesis.html, 04_speech_recognition.html)
- **Navigation Links**: Each blog post now includes links to:
  - All blog post sections on the index page
  - All reading sections on the index page
- **Back to Top Links**: Added "Back to Top ↑" link on each blog post that scrolls to the top of the current page
- **ID Anchor**: Added `id="top"` to body tags on all blog posts for anchor navigation
- **Top Dropdown Navigation**: Added top dropdown navigation to all blog posts for responsive mobile-friendly navigation
- **Side-by-Side Layout**: Posts now display side navigation beside the main content when viewport is wide enough

#### Fixed
- **Main Content Wrapper**: Wrapped `container blog-post-container` in `main-content` div on all blog posts to enable proper side-by-side layout
- **Responsive Navigation**: Posts now properly implement the `nav-dropdown-mode` class logic to switch between side-tab and top-dropdown-nav based on viewport width
- **Layout Consistency**: Posts now match index.html's responsive behavior where narrow viewports hide side-tab and show dropdown navigation

## [Previous Updates]

### Layout & Navigation Enhancements
- Added nav-dropdown-active class for improved scroll behavior and layout adjustments
- Changed padding in nav-dropdown-mode from 0 to 0rem
- Removed bottom margin from body and back-to-top button; adjusted padding for nav dropdown mode
- Added top dropdown navigation for blog posts and readings; enhanced styles and responsiveness
- Enhanced side tab navigation with back-to-top button and improved scrollbar styling
- Adjusted side tab positioning and height for improved layout consistency

### Styling & Content Updates
- Updated styles.css for improved visual consistency
- Added padding to body for improved layout spacing
- Update home button styles and modified class name for consistency
- Updated readings tab margin and corrected post date in CALL Background article
- Enhanced side tab navigation layout and styles; removed unused blog post file
- Refactored CSS variables and styles for layout

### Blog Post Enhancements
- Refactored blog structure and enhanced navigation with side tabs; updated styles for improved layout and responsiveness
- Refactored content for clarity and coherence in iCALL discussion
- Doubled image size in CALL background post
- Added next and previous post navigation buttons
- Renamed readings file: "01FORT~1.PDF" to "01. Forty-two years of CALL"
- Updated 02_call_background.html content and formatting

### File Management
- Added blog posts, readings, images, and styling updates
- Moved blog to root for GitHub Pages hosting
- Deleted unused files (about_me.html, week_01 images)
- Uploaded necessary files via git

### Initial Setup
- Add initial README with blog information
- Add files via upload (initial commit structure)
- Trigger GitHub Pages rebuild from root
- Refactored blog posts and updated links
- Refactor about_me.html to improve formatting and content
- Refactor styles for button and container layout
- Modify CSS variables and styles for layout
- Revise header and add blog posts and readings sections
- Add blog space introduction to README
- Update index.html with various improvements

---

## How to Use This CHANGELOG

This CHANGELOG follows the [Keep a Changelog](https://keepachangelog.com/) format.

### Change Categories
- **Added**: New features or content
- **Changed**: Changes in existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features or content
- **Deprecated**: Soon-to-be removed features

### Latest Version
For the latest updates, see the commit log:
```
git log --oneline
```

### Contributing
When making changes to this project, please update this CHANGELOG to keep it current.
