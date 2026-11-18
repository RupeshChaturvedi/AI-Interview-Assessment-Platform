import os
from dotenv import load_dotenv
from google import genai

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Gemini API key missing!")
else:
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents="Reply with exactly GEMINI_OK"
        )

        print("GEMINI IS WORKING!")
        print("Response:", response.text)

    except Exception as error:
        print("GEMINI ERROR:", error)