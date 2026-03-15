# CHANGELOG

All notable changes to this CALL Blog project will be documented in this file.

## [Unreleased]

### Latest Changes (March 15, 2026)

#### Added
- **Speech Recognition Recorder Assets**: Added `technologies/speech-recognition/recorder.js` and `technologies/speech-recognition/recorder.css` to support in-page audio recording UI/logic.
- **Technology Navigation Item**: Added "Speech Recognition" to the Technologies navigation config in `scripts/site.js`.

#### Changed
- **Speech Recognition Page Template**: Updated `technologies/speech-recognition/recognition.html` to use the shared page structure (`top-dropdown-nav`, `side-tab`, `main-content`, and `blog-post` container) and shared site navigation script.
- **Technology-to-Technology Flow**: Added the "Next Technology" link in `technologies/speech-synthesis/synthesis.html` to point to `technologies/speech-recognition/recognition.html`.

#### Fixed
- **Index Technologies Markup**: Corrected/normalized Technologies section structure in `index.html` so the Speech Recognition technology card is properly wrapped and rendered consistently.

### Latest Changes (March 8, 2026)

#### Added
- **Speech Synthesis Input UX**: Added text input and submit workflow for the speech synthesis post.
- **Post Navigation Buttons**: Added previous/next navigation buttons for blog posts 3 and 4.

#### Changed
- **Speech Synthesis Markup**: Updated `posts/03_speech_synthesis.html` structure for improved layout behavior.
- **Blog Post Container Layout**: Enhanced blog post container width behavior in responsive/dropdown mode.
- **Dropdown Navigation Styling**: Improved top dropdown interaction styling and open-state visual feedback.

#### Fixed
- **Speech Synthesis Variable Typo**: Corrected variable naming in `scripts/synthesis.js`.
- **API Key Formatting**: Updated API key format reference in `my-API-keys.txt`.
- **Audio Playback/Error Handling**: Refined speech synthesis request flow and playback reliability.

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
- **Shared JavaScript File**: Added `scripts/site.js` as a single source of truth for navigation rendering and responsive behavior

#### Changed
- **Centralized Navigation Content**: Moved side-tab and top-dropdown-nav item definitions into `scripts/site.js` so links/titles are edited in one place
- **Externalized Page Scripts**: Replaced duplicated inline script blocks in `index.html` and all post pages with external script references

#### Fixed
- **Main Content Wrapper**: Wrapped `container blog-post-container` in `main-content` div on all blog posts to enable proper side-by-side layout
- **Responsive Navigation**: Posts now properly implement the `nav-dropdown-mode` class logic to switch between side-tab and top-dropdown-nav based on viewport width
- **Layout Consistency**: Posts now match index.html's responsive behavior where narrow viewports hide side-tab and show dropdown navigation
- **Minor CSS Cleanup**: Removed unused `html.nav-dropdown-active` rule and normalized `padding: 0rem` to `padding: 0`

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
