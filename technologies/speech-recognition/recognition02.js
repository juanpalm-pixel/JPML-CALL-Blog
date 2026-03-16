async function sendToAssemblyAI(audioBlob, API_KEY) {

    try {
        // Convert to WAV if needed
        const wavBlob = await convertToWav(audioBlob);
        console.log("Uploading audio to AssemblyAI...");
  
        // Convert Blob to File
        const audioFile = new File([wavBlob], "audio.wav", { type: "audio/wav" });
  
        // Upload audio file to AssemblyAI to get an audio URL
        const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
            method: "POST",
            headers: {
                Authorization: API_KEY,
            },
            body: audioFile, // Directly sending the file
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
                speech_models: ["universal-2"],
            }),
        });
  
        const transcriptData = await transcriptResponse.json();
        console.log("AssemblyAI Response:", transcriptData);
  
        if (transcriptData.id) {
            console.log(`Job ID: ${transcriptData.id}, waiting for transcription...`);
            const transcription = await getTranscription(transcriptData.id, API_KEY);
            document.getElementById('speechRecognitionText').innerText = transcription
        }
    } catch (error) {
        console.error("Error sending to AssemblyAI:", error);
    }
  }
  
  async function getTranscription(transcriptionId, API_KEY) {
    const POLL_INTERVAL = 1000; // Check every 5 seconds
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