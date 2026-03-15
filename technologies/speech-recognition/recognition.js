let API_KEY;

const recognitionHistoryStorageKey = "speechRecognitionHistory";
const recognitionHistoryLimit = 10;

window.addEventListener("load", function () {
    const recordButton = document.querySelector(".record");

    // Only prompt for key on the live recording page.
    if (recordButton) {
        API_KEY = prompt("Please enter your API key:");
        if (API_KEY) API_KEY = API_KEY.trim();
    }

    renderRecognitionHistory();

    const clearHistoryButton = document.getElementById("clearRecognitionHistory");
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener("click", function () {
            clearRecognitionHistory();
            renderRecognitionHistory();
        });
    }
});

function setTranscriptText(message) {
  const output = document.getElementById("speechRecognitionText");
    const spinner = document.getElementById("speechRecognitionSpinner");
  if (output) {
    output.innerText = message;
  }

    // Show spinner while API work is in progress.
    if (spinner) {
        const isLoading = /^(Processing|Uploading|Transcribing)/i.test(message || "");
        spinner.classList.toggle("hidden", !isLoading);
    }
}

async function sendToAssemblyAI(audioBlob, API_KEY) {
    if (!API_KEY) {
        setTranscriptText("Missing API key. Refresh and enter your AssemblyAI key.");
        return;
    }

    try {
        // Convert to WAV if needed
        const wavBlob = await convertToWav(audioBlob);
        setTranscriptText("Uploading audio...");
        console.log("Uploading audio to AssemblyAI...");

        // Upload audio file to AssemblyAI to get an audio URL
        const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
            method: "POST",
            headers: {
                Authorization: API_KEY,
            },
            body: new File([wavBlob], "audio.wav", { type: "audio/wav" }),
        });
  
        const uploadData = await uploadResponse.json();
        if (!uploadData.upload_url) {
            throw new Error("Failed to upload audio to AssemblyAI");
        }
  
        console.log("Audio uploaded successfully:", uploadData.upload_url);
  
        // Now send the audio URL to request transcription
        const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
            method: "POST",
            headers: {
                Authorization: API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                audio_url: uploadData.upload_url,
                // AssemblyAI now requires selecting at least one speech model.
                speech_models: ["universal-2"],
            }),
        });
  
        const transcriptData = await transcriptResponse.json();
        console.log("AssemblyAI Response:", transcriptData);
  
        if (transcriptData.id) {
            setTranscriptText("Transcribing... please wait.");
            console.log(`Job ID: ${transcriptData.id}, waiting for transcription...`);
            const transcription = await getTranscription(transcriptData.id, API_KEY);
            if (transcription) {
                setTranscriptText(transcription);

                // Save successful recognition result (audio + transcription) in local history.
                const audioDataUrl = await blobToDataUrl(wavBlob);
                saveRecognitionResult({
                  transcription: transcription,
                  audioDataUrl: audioDataUrl,
                  createdAt: new Date().toISOString(),
                });
            } else {
                setTranscriptText("Transcription failed. Check console for API details.");
            }
        }
    } catch (error) {
        console.error("Error sending to AssemblyAI:", error);
        setTranscriptText("Error sending audio for transcription. See console logs.");
    }
  }
  
  async function getTranscription(transcriptionId, API_KEY) {
    const POLL_INTERVAL = 1000; // Check every 1 second
    console.log(`Checking transcription status for Job ID: ${transcriptionId}`);
    while (true) {
        try {
            // Fetch the transcription job status
            const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
                method: "GET",
                headers: { Authorization: API_KEY },
            });
  
            const data = await response.json();
  
            if (data.status === "completed") {
                console.log("Transcription completed!");
                console.log("Transcript:", data.text);
                return data.text; // Return the transcription result
            } else if (data.status === "failed") {
                console.error("Transcription failed:", data.error);
                return null;
            } else {
                console.log(`Status: ${data.status}... Waiting.`);
                await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL)); // Wait before checking again
            }
        } catch (error) {
            console.error("Error checking transcription status:", error);
            return null;
        }
    }
  }

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function getRecognitionHistory() {
    try {
        const rawHistory = localStorage.getItem(recognitionHistoryStorageKey);
        return rawHistory ? JSON.parse(rawHistory) : [];
    } catch (error) {
        console.error("Unable to read recognition history:", error);
        return [];
    }
}

function saveRecognitionResult(result) {
    try {
        const history = getRecognitionHistory();
        history.unshift(result);

        // Keep at most 10 entries; newest entries stay, oldest are overwritten.
        const cappedHistory = history.slice(0, recognitionHistoryLimit);
        localStorage.setItem(recognitionHistoryStorageKey, JSON.stringify(cappedHistory));
    } catch (error) {
        console.error("Unable to save recognition history:", error);
    }
}

function clearRecognitionHistory() {
    localStorage.removeItem(recognitionHistoryStorageKey);
}

function renderRecognitionHistory() {
    const historyList = document.getElementById("recognitionHistoryList");
    if (!historyList) {
        return;
    }

    historyList.innerHTML = "";
    const history = getRecognitionHistory();

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No previous recognition results yet.";
        historyList.appendChild(emptyMessage);
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "synthesis-result-item";

        const text = document.createElement("p");
        text.className = "synthesis-result-text";
        text.textContent = entry.transcription || "(No transcription text available)";

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = entry.audioDataUrl;

        item.appendChild(text);
        item.appendChild(audio);
        historyList.appendChild(item);
    });
}