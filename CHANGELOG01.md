# CHANGELOG

All notable changes to this CALL Blog project will be documented in this file.

## [Unreleased]

### Latest Changes (Migration to Abair.ie API - January 2025)

#### Major Migration: Google Cloud → Abair.ie API

**Problem**: Google Cloud TTS/STT APIs don't provide Irish language voices despite documentation claims
**Solution**: Complete migration to university-provided Abair.ie API for Irish speech synthesis

#### Added
- **Abair.ie TTS Integration**: New `project/scripts/abair-tts-service.js` providing Irish text-to-speech using university's Abair.ie API (https://api.abair.ie/v3/)
- **Browser STT Service**: New `project/scripts/browser-stt-service.js` using native browser Speech Recognition API as replacement for Google Cloud STT
- **API Testing Tools**: `project/abair-api-test.html` for comprehensive testing of Abair.ie API endpoints and audio playback
- **Migration Testing**: `project/abair-migration-test.html` for verifying complete migration functionality
- **Voice Selection**: Support for multiple Irish dialect voices (Connacht, Munster, Ulster) from Abair.ie metadata API
- **Enhanced Settings**: Updated settings modal with Irish voice selection, service status indicators, and pronunciation thresholds

#### Changed  
- **Service Architecture**: Replaced Google Cloud dependencies with Abair.ie TTS + Browser STT combination
- **Audio Processing**: Updated to handle Abair.ie's base64 audio format and direct URL responses
- **UI Configuration**: Removed Google Cloud API key inputs, added Irish voice selection and service status displays
- **Error Handling**: Enhanced error handling for browser STT limitations and Abair.ie API responses
- **Settings Management**: New settings system with localStorage persistence for voice preferences and thresholds

#### Removed
- **Google Cloud Dependencies**: Deleted `project/scripts/tts-service.js` and `project/scripts/stt-service.js`
- **Google Cloud Testing**: Removed `project/google-cloud-tester.html` and related testing utilities  
- **API Key Management**: Eliminated Google Cloud API key configuration and storage

#### Technical Details
- **Abair.ie Endpoint**: GET requests to `https://api.abair.ie/v3/synthesis` with URL parameters
- **Voice Support**: Multiple Irish dialects including ga_CO_snc_piper (Connacht), ga_MU_snc_piper (Munster), ga_UL_snc_piper (Ulster)
- **Audio Format**: Handles both base64-encoded audio content and direct URL responses from Abair.ie
- **Browser STT**: Uses Web Speech API with Irish language (ga-IE) support where available, English fallback otherwise
- **No API Keys Required**: Abair.ie appears to be public API, eliminating authentication complexity

#### Testing Status
- ✅ Abair.ie API integration and voice metadata loading
- ✅ Irish text synthesis and audio playback  
- ✅ Browser speech recognition initialization
- ✅ Settings persistence and voice selection
- ✅ Complete e-reader integration with new services

### Previous Changes (March 22, 2026)

#### Added
- **Irish E-Reader project**: New project folder `project/` containing a web-based Irish e‑reader and pronunciation trainer integrated into the site.
- **Frontend UI**: `project/index.html`, `project/styles/ereader.css`, and `project/scripts/ui-foundation.js` (UI foundation) providing text input, controls, practice panel, and settings.
- **Speech Services**: `project/scripts/tts-service.js` and `project/scripts/stt-service.js` prepared for Google Cloud integration (TTS/STT wrappers).
- **Audio Processing**: `project/scripts/audio-processor.js` for recording, format conversion (WebM→WAV), and basic audio quality checks.
- **Pronunciation Feedback**: Real-time feedback system and practice controls implemented in `project/scripts/ereader.js`.
- **Visual Animations**: `project/scripts/ui-animations.js` and CSS for sentence enlargement, word highlighting, and feedback animations.
- **Error Tracking**: `project/scripts/error-manager.js` and `project/errors.html` for storing and practicing mispronounced phrases.
- **Debugging Tools**: `project/debug-check.html`, `project/simple-debug.html`, and `project/google-cloud-tester.html` to help diagnose API, microphone, and TTS/STT issues.

#### Changed
- **Site integration**: The e‑reader UI uses the site's existing styles and navigation patterns to maintain a consistent look and feel.
- **Script loading**: Fixed and reorganized script includes in `project/index.html` to prevent loading errors and infinite debug loops.

#### Fixed
- **Syntax & runtime errors**: Resolved multiple JavaScript syntax errors and an infinite console recursion in diagnostic scripts that prevented the e‑reader from initializing.
- **Compatibility**: Added a small compatibility helper `project/scripts/compatibility.js` and adjusted code to avoid optional-chaining issues on older browsers when testing locally.
- **CORS / local file issues**: Temporarily commented out the `manifest.json` link when running from the file system to avoid CORS errors; note that full PWA features require serving over HTTP/HTTPS.

#### Notes  
- ~~Google Cloud APIs were integrated and tested successfully, but the Google Cloud project used here does not expose Irish (ga-IE) TTS voices~~
- **SUPERSEDED**: Migrated to university-provided Abair.ie API which provides proper Irish language voices and pronunciation models



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
