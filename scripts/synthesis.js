function submitText() {
const input = document.getElementById("inputText").value;
document.getElementById("submittedText").textContent = input;
} // This function is called when the user clicks the "Submit" button. It retrieves the value from the input text box with the ID "inputText" and then sets the text content of the paragraph with the ID "submittedText" to that value, effectively displaying the submitted text on the page.

let synthisisURL = "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128" // This variable holds the URL for the text-to-speech API endpoint. It includes a specific voice ID (JBFqnCBsd6RMkjVDRZzb) and specifies the output format for the synthesized audio (mp3 with a sample rate of 44100 Hz and a bitrate of 128 kbps).

function synthesiseSpeech(input) {
    const url = synthesisURL;
    
    const data = {
        text: input,
        model_id: "eleven_multilingual_v2",
    };

    fetch(url, {
        method: "POST",
        headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
    .then((response) => {
        if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
        }
         return response.blob(); // Convert response to audio Blob
    })
    .then((blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audioElement = document.getElementById("synthesisAudio");
        audioElement.src = audioUrl;
        audioElement.play(); // Play the generated speech
    })
    .catch((error) => console.error("Error:", error));
}