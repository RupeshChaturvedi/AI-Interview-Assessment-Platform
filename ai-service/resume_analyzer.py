
import os
import json
import re

from groq import Groq
from google import genai
from dotenv import load_dotenv

load_dotenv(override=True)

# ----------------------------------
# API KEYS AND AI CLIENTS
# ----------------------------------

groq_key = os.getenv("GROQ_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

groq_client = Groq(api_key=groq_key) if groq_key else None
gemini_client = genai.Client(api_key=gemini_key) if gemini_key else None

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


# ----------------------------------
# DETERMINISTIC ATS SCORING
# ----------------------------------

TECHNICAL_SKILLS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "c",
    "html", "css", "react", "react.js", "react native", "angular",
    "vue", "node.js", "nodejs", "express", "express.js",
    "mongodb", "mysql", "postgresql", "sql", "sqlite",
    "firebase", "redis", "django", "flask", "fastapi",
    "spring boot", "spring", "hibernate", "php", "laravel",
    "git", "github", "docker", "kubernetes", "aws", "azure",
    "machine learning", "deep learning", "artificial intelligence",
    "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
    "opencv", "rest api", "api", "bootstrap", "tailwind",
    "next.js", "nextjs", "vite", "redux", "figma"
]


def contains_term(text, term):
    pattern = r"(?<![a-zA-Z0-9])" + re.escape(term) + r"(?![a-zA-Z0-9])"
    return re.search(pattern, text, re.IGNORECASE) is not None


def calculate_ats_score(resume_text):
    """
    Calculates ATS score using fixed Python rules.
    The same resume text always receives the same score.
    """

    text = re.sub(r"\s+", " ", resume_text.lower()).strip()

    if not text:
        return 0

    score = 0

    # 1. Technical Skills: 25 points
    detected_skills = [
        skill for skill in TECHNICAL_SKILLS
        if contains_term(text, skill)
    ]

    skill_count = len(set(detected_skills))

    if skill_count >= 10:
        score += 25
    elif skill_count >= 7:
        score += 21
    elif skill_count >= 5:
        score += 17
    elif skill_count >= 3:
        score += 12
    elif skill_count >= 1:
        score += 7

    # 2. Projects: 20 points
    project_keywords = [
        "project", "projects", "developed", "built",
        "implemented", "created", "designed"
    ]

    project_count = sum(
        1 for keyword in project_keywords
        if contains_term(text, keyword)
    )

    if project_count >= 5:
        score += 20
    elif project_count >= 3:
        score += 15
    elif project_count >= 2:
        score += 10
    elif project_count >= 1:
        score += 5

    # 3. Education: 15 points
    education_keywords = [
        "education", "bachelor", "b.tech", "btech",
        "master", "m.tech", "mtech", "degree",
        "diploma", "university", "college",
        "school", "graduation", "cgpa", "percentage"
    ]

    education_count = sum(
        1 for keyword in education_keywords
        if contains_term(text, keyword)
    )

    if education_count >= 5:
        score += 15
    elif education_count >= 3:
        score += 11
    elif education_count >= 1:
        score += 6

    # 4. Work Experience: 15 points
    experience_keywords = [
        "experience", "internship", "intern",
        "employment", "worked", "work experience",
        "professional experience", "responsibilities",
        "company", "job", "freelance"
    ]

    experience_count = sum(
        1 for keyword in experience_keywords
        if contains_term(text, keyword)
    )

    if experience_count >= 5:
        score += 15
    elif experience_count >= 3:
        score += 11
    elif experience_count >= 1:
        score += 6

    # 5. Career Relevance: 15 points
    relevance_keywords = [
        "objective", "professional summary", "career",
        "developer", "engineer", "programmer",
        "software", "technical skills", "specialization"
    ]

    relevance_count = sum(
        1 for keyword in relevance_keywords
        if contains_term(text, keyword)
    )

    if relevance_count >= 6:
        score += 15
    elif relevance_count >= 4:
        score += 11
    elif relevance_count >= 2:
        score += 7
    elif relevance_count >= 1:
        score += 3

    # 6. Presentation and Clarity: 10 points
    presentation_keywords = [
        "summary", "skills", "education", "projects",
        "experience", "contact", "email", "phone",
        "certifications", "achievements"
    ]

    presentation_count = sum(
        1 for keyword in presentation_keywords
        if contains_term(text, keyword)
    )

    if presentation_count >= 7:
        score += 10
    elif presentation_count >= 5:
        score += 8
    elif presentation_count >= 3:
        score += 5
    elif presentation_count >= 1:
        score += 2

    return max(0, min(100, int(score)))


# ----------------------------------
# AI RESPONSE NORMALIZATION
# ----------------------------------

def normalize_ai_response(ai_data, resume_text):

    if not isinstance(ai_data, dict):
        raise ValueError("AI response must be a JSON object.")

    array_fields = [
        "technical_skills",
        "education",
        "work_experience",
        "projects",
        "strengths",
        "missing_skills",
        "suggested_job_roles",
        "resume_improvement_suggestions"
    ]

    string_fields = [
        "candidate_name",
        "email",
        "phone",
        "professional_summary"
    ]

    for field in array_fields:
        value = ai_data.get(field, [])

        if not isinstance(value, list):
            value = []

        ai_data[field] = value

    for field in string_fields:
        value = ai_data.get(field, "")
        ai_data[field] = value if isinstance(value, str) else ""

    # IMPORTANT:
    # Never use the AI-generated score.
    # Calculate score using fixed Python rules.
    ai_data["score"] = calculate_ats_score(resume_text)

    return ai_data


# ----------------------------------
# RESUME ANALYSIS
# ----------------------------------

def analyze_resume_text(resume_text):

    if not isinstance(resume_text, str) or not resume_text.strip():
        raise ValueError("Resume text is empty.")

    prompt = f"""
You are an expert HR recruiter and professional resume analyzer.

Analyze the provided resume carefully.

Extract the following information:

1. candidate_name
2. email
3. phone
4. professional_summary
5. technical_skills (array of strings)
6. education (array of strings)
7. work_experience (array of strings)
8. projects (array of strings)
9. strengths (array of strings)
10. missing_skills (array of strings)
11. suggested_job_roles (array of strings)
12. resume_improvement_suggestions (array of strings)

Important:
- Do not calculate or generate an ATS score.
- Do not invent qualifications, experience or skills.
- Extract only information actually present in the resume.
- Keep all arrays as arrays, even if empty.
- Return valid JSON only.
- Do not include Markdown or explanations outside JSON.

Expected JSON structure:

{{
    "candidate_name": "",
    "email": "",
    "phone": "",
    "professional_summary": "",
    "technical_skills": [],
    "education": [],
    "work_experience": [],
    "projects": [],
    "strengths": [],
    "missing_skills": [],
    "suggested_job_roles": [],
    "resume_improvement_suggestions": []
}}

RESUME:
{resume_text}
"""

    # ----------------------------------
    # PRIMARY AI: GROQ
    # ----------------------------------

    if groq_client:

        try:
            print("Trying Primary AI: Groq...", flush=True)

            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert HR recruiter. "
                            "Extract resume information and return valid JSON only."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0
            )

            ai_content = response.choices[0].message.content
            ai_data = json.loads(ai_content)

            ai_data = normalize_ai_response(ai_data, resume_text)

            print("Groq analysis successful!", flush=True)
            print("DETERMINISTIC ATS SCORE:", ai_data["score"], flush=True)

            return json.dumps(ai_data, ensure_ascii=False)

        except Exception as error:
            print("Groq failed:", repr(error), flush=True)
            print("Switching to backup Gemini...", flush=True)

    # ----------------------------------
    # BACKUP AI: GEMINI
    # ----------------------------------

    if gemini_client:

        try:
            print("Trying Backup AI: Gemini...", flush=True)

            response = gemini_client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0
                }
            )

            ai_content = response.text
            ai_data = json.loads(ai_content)

            ai_data = normalize_ai_response(ai_data, resume_text)

            print("Gemini analysis successful!", flush=True)
            print("DETERMINISTIC ATS SCORE:", ai_data["score"], flush=True)

            return json.dumps(ai_data, ensure_ascii=False)

        except Exception as error:
            print("Gemini failed:", repr(error), flush=True)

            raise RuntimeError(
                f"Both AI providers failed. Gemini error: {error}"
            ) from error

    raise RuntimeError("No AI provider is configured.")
