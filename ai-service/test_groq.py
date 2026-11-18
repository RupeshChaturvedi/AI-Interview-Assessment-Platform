
import os
import traceback
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv(override=True)

print("\n========== GROQ API TEST ==========\n")

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

print("STEP 1: Environment loaded")
print("STEP 2: API key found:", bool(api_key))
print("STEP 3: Model:", model)

if not api_key:
    print("\nERROR: GROQ_API_KEY missing from .env")
else:
    try:
        print("\nSTEP 4: Connecting to Groq...")

        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": "Reply exactly with GROQ_OK"
                }
            ],
            max_tokens=50,
            temperature=0
        )

        print("\nSTEP 5: SUCCESS!")
        print("\nFULL RESPONSE:")
        print(response)

        print("\nFINISH REASON:")
        print(response.choices[0].finish_reason)

        print("\nAI RESPONSE:")
        print(repr(response.choices[0].message.content))

        if response.choices[0].message.content:
            print("\nGROQ IS WORKING CORRECTLY!")
        else:
            print("\nWARNING: API returned empty content.")

    except Exception as error:
        print("\nSTEP 5: FAILED!")
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR DETAILS:", error)
        traceback.print_exc()

print("\n========== TEST FINISHED ==========\n")
