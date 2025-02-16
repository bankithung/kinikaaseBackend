import subprocess

def query_ollama(prompt):
    try:
        result = subprocess.run(
            ["ollama", "run", "deepseek-r1:1.5b", prompt],
            capture_output=True,
            text=True,
            check=True
        )
        print("Model Output:")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Error:", e)
        print("Standard Output:", e.stdout)
        print("Standard Error:", e.stderr)

if __name__ == "__main__":
    exitCode="exitt"
    print("Enter exitt to exit" )
    user_prompt="Hello"
    query_ollama(user_prompt)
    while user_prompt != exitCode:
        user_prompt = input("Enter your prompt: ")
        query_ollama(user_prompt)

