let API_KEY; // Global variable to store API key for ElevenLabs

// JBFqnCBsd6RMkjVDRZzb is the voice ID
// output_format=mp3_44100_128 specifies MP3 format with 44.1kHz sample rate and 128kbps bitrate
const synthesisURL = "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128"; // The URL endpoint for the ElevenLabs text-to-speech API

// The key used to store synthesis history in the browser's localStorage
const synthesisHistoryStorageKey = "speechSynthesisHistory";

// Maximum number of synthesis results to keep in history (oldest entries are removed when this limit is exceeded)
const synthesisHistoryLimit = 10;

// Runs when the page finishes loading
window.addEventListener("load", function () {
    // Prompt the user to enter their ElevenLabs API key
    // This key is required to authenticate requests to the text-to-speech API
    API_KEY = prompt("Please enter your API key:");
    
    // Render any previously saved synthesis results from localStorage
    // This populates the page with existing history when the user loads the page
    renderSynthesisHistory();

    // Find the "Clear History" button (only exists on history.html page)
    const clearHistoryButton = document.getElementById("clearSynthesisHistory");
    if (clearHistoryButton) {
        // Add a click handler to clear all saved synthesis results
        clearHistoryButton.addEventListener("click", function () {
            clearSynthesisHistory(); // Remove all entries from localStorage
            renderSynthesisHistory(); // Re-render the empty history list
        });
    }
});

// Called when the user clicks the "Submit" button
// Retrieves the text input and initiates the speech synthesis process
function submitText() {
    // Get references to the input field and the paragraph that displays submitted text
    const inputElement = document.getElementById("inputText");
    const submittedTextElement = document.getElementById("submittedText");

    // Safety check: if either element doesn't exist on this page, exit early
    if (!inputElement || !submittedTextElement) {
        return;
    }

    // Get the text the user typed and remove leading/trailing whitespace
    const input = inputElement.value.trim();
    
    // Display the submitted text on the page
    submittedTextElement.textContent = input;

    // If the input is empty, don't make an API call
    if (!input) {
        return;
    }

    // Call the function that sends the text to the ElevenLabs API
    synthesiseSpeech(input);
}

// This function sends text to the ElevenLabs API and handles the audio response
// Parameter: input - the text string to convert to speech
function synthesiseSpeech(input) {
    // Prepare the request body with the text and model ID
    const data = {
        text: input, // The text to synthesize
        model_id: "eleven_multilingual_v2", // ElevenLabs model that supports multiple languages
    };

    // Send a POST request to the ElevenLabs API
    fetch(synthesisURL, {
        method: "POST",
        headers: {
            "xi-api-key": API_KEY, // Authentication header with the user's API key
            "Content-Type": "application/json", // Indicate we're sending JSON data
        },
        body: JSON.stringify(data), // Convert the data object to a JSON string
    })
        .then((response) => {
            // Check if the API request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Convert the response to a binary blob (audio file data)
            return response.blob();
        })
        .then((blob) => blobToDataUrl(blob)) // Convert the blob to a data URL for storage
        .then((audioDataUrl) => {
            // Create a result object containing the text, audio data, and timestamp
            const newResult = {
                text: input, // The original text that was synthesized
                audioDataUrl, // The audio data as a data URL (can be stored in localStorage)
                createdAt: new Date().toISOString(), // ISO timestamp for when this was created
            };

            // Add this result to the page display and auto-play it
            appendSynthesisResult(newResult, true);
            
            // Save this result to localStorage for future viewing
            saveSynthesisResult(newResult);
        })
        .catch((error) => console.error("Error:", error)); // Log any errors to the console
}

// This function converts a Blob (binary data) to a data URL string
// Data URLs can be stored in localStorage, while Blob URLs cannot
// Parameter: blob - the audio file data as a Blob object
// Returns: a Promise that resolves to a data URL string
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); // FileReader reads file/blob data
        reader.onloadend = () => resolve(reader.result); // When done, resolve with the data URL
        reader.onerror = reject; // If there's an error, reject the Promise
        reader.readAsDataURL(blob); // Start reading the blob as a data URL
    });
}

// This function retrieves the synthesis history from localStorage
// Returns: an array of result objects (each with text, audioDataUrl, createdAt)
function getSynthesisHistory() {
    try {
        // Get the raw JSON string from localStorage
        const rawHistory = localStorage.getItem(synthesisHistoryStorageKey);
        
        // If history exists, parse it from JSON to an array; otherwise return an empty array
        return rawHistory ? JSON.parse(rawHistory) : [];
    } catch (error) {
        // If there's an error reading/parsing the data, log it and return an empty array
        console.error("Unable to read synthesis history:", error);
        return [];
    }
}

// This function saves a new synthesis result to localStorage
// Parameter: result - an object with text, audioDataUrl, and createdAt properties
function saveSynthesisResult(result) {
    try {
        // Get the current history
        const history = getSynthesisHistory();
        
        // Add the new result to the beginning of the array (newest first)
        history.unshift(result);
        
        // Keep only the most recent entries (up to synthesisHistoryLimit)
        // This prevents the history from growing too large
        const cappedHistory = history.slice(0, synthesisHistoryLimit);
        
        // Save the updated history back to localStorage as a JSON string
        localStorage.setItem(synthesisHistoryStorageKey, JSON.stringify(cappedHistory));
    } catch (error) {
        // If there's an error saving (e.g., localStorage is full), log it
        console.error("Unable to save synthesis history:", error);
    }
}

// This function removes all synthesis history from localStorage
function clearSynthesisHistory() {
    localStorage.removeItem(synthesisHistoryStorageKey);
}

// This function creates a new audio player element and adds it to the page
// Parameters:
//   result - an object with text and audioDataUrl properties
//   autoPlay - boolean indicating whether to automatically play the audio
function appendSynthesisResult(result, autoPlay) {
    // Find the container where synthesis results should be displayed
    let resultsContainer = document.getElementById("synthesisResults");
    if (!resultsContainer) {
        // If the container doesn't exist on this page, exit early
        return;
    }

    // Create a container div for this individual result
    const item = document.createElement("div");
    item.className = "synthesis-result-item"; // CSS class for styling

    // Create a paragraph to display the text that was synthesized
    const text = document.createElement("p");
    text.className = "synthesis-result-text"; // CSS class for styling
    text.textContent = result.text; // Set the text content

    // Create an audio element for playing the synthesized speech
    const audio = document.createElement("audio");
    audio.controls = true; // Show play/pause controls
    audio.src = result.audioDataUrl; // Set the audio source to the data URL

    // Add the text and audio elements to the container
    item.appendChild(text);
    item.appendChild(audio);
    
    // Add this item to the beginning of the results container (newest first)
    resultsContainer.prepend(item);

    // If autoPlay is true, automatically start playing the audio
    if (autoPlay) {
        audio.play().catch(() => {}); // Catch and ignore any autoplay restrictions
    }
}

// This function renders the synthesis history on the page
// It handles both the history page (synthesisHistoryList) and the main page (synthesisResults)
function renderSynthesisHistory() {
    // Handle the history page (history.html)
    const historyList = document.getElementById("synthesisHistoryList");
    if (historyList) {
        // Clear any existing content
        historyList.innerHTML = "";
        
        // Get the saved history from localStorage
        const history = getSynthesisHistory();

        // If there's no history, show a message
        if (history.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No previous synthesis results yet.";
            historyList.appendChild(emptyMessage);
            return;
        }

        // Loop through each history entry and create a card for it
        history.forEach((entry) => {
            const item = document.createElement("div");
            item.className = "synthesis-result-item";

            const text = document.createElement("p");
            text.className = "synthesis-result-text";
            text.textContent = entry.text;

            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = entry.audioDataUrl;

            item.appendChild(text);
            item.appendChild(audio);
            historyList.appendChild(item); // Add to the end (chronological order)
        });
    }

    // Handle the main synthesis page (synthesis.html)
    const liveResults = document.getElementById("synthesisResults");
    if (liveResults) {
        // Clear any existing content
        liveResults.innerHTML = "";
        
        // Get the history, reverse it (oldest first), and display each entry
        // We reverse it so that when we prepend items, they end up in newest-first order
        getSynthesisHistory()
            .slice() // Create a copy of the array (so we don't modify the original)
            .reverse() // Reverse the order (oldest first)
            .forEach((entry) => appendSynthesisResult(entry, false)); // Add each entry without autoplay
    }
}