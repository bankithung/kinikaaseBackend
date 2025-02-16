import subprocess
import speech_recognition as sr
import re

def speak(text, voice="en+f3", speed=150):
    """Convert text to speech using espeak-ng with options for voice and speed"""
    subprocess.run(['espeak-ng', '-v', voice, '-s', str(speed), text])

def listen():
    """Listen to microphone input and convert to text"""
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        audio = r.listen(source)
        
    try:
        text = r.recognize_google(audio)
        print(f"You said: {text}")
        return text.lower()
    except sr.UnknownValueError:
        speak("Sorry, I didn't understand that")
        return ""
    except sr.RequestError:
        speak("Sorry, my speech service is down")
        return ""

def query_ollama(prompt):
    """Query Ollama model and speak the response, cleaning unwanted tags like <think>"""
    try:
        result = subprocess.run(
            ["ollama", "run", "deepseek-r1:1.5b", prompt],
            capture_output=True,
            text=True,
            check=True
        )
        print("\nModel Output:")
        output = result.stdout
        print(output)

        # Clean up unwanted tags like <think> from the output
        cleaned_output = re.sub(r'<think>.*?</think>', '', output)  # Remove <think> tags and their content
        cleaned_output = re.sub(r'<[^>]+>', '', cleaned_output)  # Remove any other HTML-like tags

        # Speak the cleaned output
        speak(cleaned_output)
        
    except subprocess.CalledProcessError as e:
        error_msg = f"Error: {str(e)}"
        print(error_msg)
        speak(error_msg)

if __name__ == "__main__":
    speak("Welcome to the voice AI assistant. Say exit to quit.")
    print("Say 'exit' to quit")
    
    while True:
        user_prompt = listen()
        
        if not user_prompt:
            continue
        if "exit" in user_prompt:
            speak("Goodbye!")
            break
            
        speak("Processing your request...")
        query_ollama(user_prompt)

