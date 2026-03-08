function submitText() {
const input = document.getElementById("inputText").value;
document.getElementById("submittedText").textContent = input;
} // This function is called when the user clicks the "Submit" button. It retrieves the value from the input text box with the ID "inputText" and then sets the text content of the paragraph with the ID "submittedText" to that value, effectively displaying the submitted text on the page.