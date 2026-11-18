
import os
import json

from groq import Groq
from google import genai
from dotenv import load_dotenv

load_dotenv(override=True)

groq_key = os.getenv("GROQ_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

groq_client = Groq(api_key=groq_key) if groq_key else None
gemini_client = genai.Client(api_key=gemini_key) if gemini_key else None

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GEMINI_MODEL = "gemini-3.8-flash"


# ----------------------------------
# INTERVIEW ROUND CONFIGURATION
# ----------------------------------

ROUND_CONFIG = {
    "aptitude_questions": {
        "count": 15,
        "title": "Aptitude and Logical Reasoning",
        "format": """
        Each question must contain:
        question, options (exactly 4), correct_answer,
        explanation, topic and difficulty.

        Include quantitative aptitude, logical reasoning,
        numerical ability and verbal reasoning.
        """
    },

    "technical_questions": {
        "count": 10,
        "title": "Technical Interview",
        "format": """
        Each question must contain:
        question, topic and difficulty.

        Questions must be based on resume skills, projects
        and selected job role.
        """
    },

    "coding_questions": {
        "count": 5,
        "title": "Coding Assessment",
        "format": """
        Each coding question must contain:

        question: Complete programming problem statement.
        language: Suggested programming language.
        topic: Programming concept.
        difficulty: Easy, Medium or Hard.
        constraints: List of input constraints.
        input_format: Description of expected input.
        output_format: Description of expected output.
        examples: At least one example containing input,
                  output and explanation.

        Generate realistic placement-level programming problems.

        Include clear problem statements and sufficient
        information to solve the problem.

        Do not include solutions, source code or answer keys.
        """
    },

    "hr_questions": {
        "count": 10,
        "title": "HR Interview",
        "format": """
        Each question must contain only question.

        Include genuine questions about introduction,
        strengths, weaknesses, goals, teamwork,
        conflict handling and behavioral situations.

        Avoid repetitive questions.
        """
    }
}


# ----------------------------------
# QUESTION VALIDATION
# ----------------------------------

def validate_round_questions(category, data, expected_count=None):

    config = ROUND_CONFIG[category]
    expected_count = expected_count or config["count"]

    questions = data.get(category)

    if not isinstance(questions, list):
        raise ValueError(f"Invalid response for {category}")

    if len(questions) > expected_count:
        questions = questions[:expected_count]

    if len(questions) != expected_count:
        raise ValueError(
            f"{category}: expected {expected_count}, "
            f"received {len(questions)}"
        )

    for question in questions:

        if not isinstance(question, dict):
            raise ValueError("Invalid question format.")

        if not isinstance(question.get("question"), str):
            raise ValueError("Question text is missing.")

        if category == "aptitude_questions":

            options = question.get("options")

            if not isinstance(options, list) or len(options) != 4:
                raise ValueError(
                    "Each aptitude question needs 4 options."
                )

            if question.get("correct_answer") not in options:
                raise ValueError("Invalid aptitude correct answer.")

            if not question.get("explanation"):
                raise ValueError("Aptitude explanation is missing.")

        if category == "coding_questions":

            required_fields = [
                "language",
                "topic",
                "difficulty",
                "constraints",
                "input_format",
                "output_format",
                "examples"
            ]

            for field in required_fields:
                if field not in question:
                    raise ValueError(
                        f"Coding question is missing {field}."
                    )

            if not isinstance(question["examples"], list):
                raise ValueError(
                    "Coding examples must be a list."
                )

            if not question["examples"]:
                raise ValueError(
                    "At least one coding example is required."
                )

    return questions


# ----------------------------------
# AI JSON RESPONSE HELPER
# ----------------------------------

def parse_json_content(content):
    """Parse provider output, including accidental Markdown fences."""
    if not content or not isinstance(content, str):
        raise ValueError("AI provider returned an empty response.")

    cleaned = content.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Recover a JSON object if the model added a short preamble.
        first = cleaned.find("{")
        last = cleaned.rfind("}")
        if first >= 0 and last > first:
            return json.loads(cleaned[first:last + 1])
        raise


def generate_json_response(prompt, system_message=None):
    """Try Groq first, then Gemini. Each provider gets one controlled retry."""
    errors = []
    system_message = system_message or (
        "You are an expert interviewer. Return one valid JSON object only. "
        "Do not use Markdown fences or add commentary."
    )

    if groq_client:
        for attempt in range(2):
            try:
                response = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_completion_tokens=8192
                )
                content = response.choices[0].message.content
                return parse_json_content(content)
            except Exception as error:
                print(
                    f"Groq attempt {attempt + 1} failed: {error}",
                    flush=True
                )
                errors.append(f"Groq attempt {attempt + 1}: {error}")

    if gemini_client:
        for attempt in range(2):
            try:
                response = gemini_client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=f"{system_message}\n\n{prompt}",
                    config={
                        "response_mime_type": "application/json",
                        "temperature": 0.1,
                        "max_output_tokens": 8192
                    }
                )
                return parse_json_content(response.text)
            except Exception as error:
                print(
                    f"Gemini attempt {attempt + 1} failed: {error}",
                    flush=True
                )
                errors.append(f"Gemini attempt {attempt + 1}: {error}")

    raise RuntimeError(
        "All configured AI providers failed. " + " | ".join(errors)
    )


# ----------------------------------
# GENERATE INTERVIEW ROUND QUESTIONS
# ----------------------------------

def generate_round_questions(
    category,
    resume_analysis,
    job_role,
    experience
):
    """Generate questions in small batches to avoid truncated AI output."""

    if category not in ROUND_CONFIG:
        raise ValueError(f"Unknown interview round: {category}")

    config = ROUND_CONFIG[category]
    total_count = config["count"]
    batch_size = 5
    all_questions = []
    seen_questions = set()

    for batch_start in range(0, total_count, batch_size):
        batch_count = min(batch_size, total_count - batch_start)
        batch_number = (batch_start // batch_size) + 1
        previous_questions = [q.get("question", "") for q in all_questions]

        technical_focus_rules = ""
        if category == "technical_questions":
            technical_focus_rules = """
TECHNICAL ROUND SPECIALIZATION RULES (VERY IMPORTANT):
1. Read the candidate resume analysis carefully before writing questions.
2. Infer the candidate's actual technical domain/specialization from the strongest
   evidence in the resume: technical skills, tools, libraries, projects,
   coursework and experience.
3. The resume is the PRIMARY source of truth. A generic job role such as
   "Software Developer", "Developer" or "Fresher" is not a technology stack
   and must NOT override the resume's actual specialization.
4. If the resume is AI/ML, Data Science or AI-focused, prioritize only skills
   actually present or clearly supported by the resume, such as Python,
   machine learning concepts, data preprocessing, model training, evaluation,
   deep learning, NLP, computer vision, NumPy, Pandas, scikit-learn,
   TensorFlow or PyTorch when those appear in the resume.
5. If the resume is frontend-focused, ask about the frontend technologies
   actually listed. If backend-focused, prioritize its backend stack.
   Apply the same rule to Java, .NET, cybersecurity, cloud, data engineering,
   embedded systems and other domains.
6. Do NOT ask React, JavaScript, Node.js, MongoDB or other web-development
   questions unless those technologies are actually present in the resume
   or in a clearly relevant project.
7. Do NOT assume a skill just because it is common in software jobs.
   Never invent projects, tools, certifications or work experience.
8. Build all 10 questions around the candidate's inferred domain:
   approximately 6 questions on listed core skills/concepts, 2 on the
   candidate's actual resume projects, and 2 on relevant fundamentals.
   Adjust this distribution if the resume has limited information.
9. Questions should be specific enough to test real understanding, not merely
   ask generic definitions. Mention a resume project only when it is present.
10. If the resume does not provide enough technical information to identify
    a specialization, ask broad computer-science fundamentals and clearly
    avoid assuming a React/JavaScript stack.

The role value supplied by the frontend is: {job_role}
If it is generic or conflicts with the resume evidence, follow the resume.
"""

        prompt = f"""
You are an expert placement interviewer who creates resume-grounded assessments.

Generate EXACTLY {batch_count} NEW questions for this batch.
This is batch {batch_number} of the {config['title']} round.
The full round requires {total_count} questions.

Round: {config['title']}

CANDIDATE RESUME ANALYSIS (use this as the source of truth):
{json.dumps(resume_analysis, ensure_ascii=False)}

Job Role Hint: {job_role}
Experience Level: {experience}

{technical_focus_rules}

Required question format:
{config['format']}

Questions already generated in earlier batches (do not repeat or paraphrase):
{json.dumps(previous_questions, ensure_ascii=False)}

Return one valid JSON object with this exact top-level key:
{{
  "{category}": [
    {{"question": "Question text"}}
  ]
}}

Strict rules:
- The array must contain exactly {batch_count} objects, no more and no less.
- Follow every required field and rule described above.
- For aptitude, include exactly 4 distinct options and one correct_answer matching an option.
- For coding, include constraints, input_format, output_format and at least one example object.
- Do not include answers or solutions for coding questions.
- For the technical round, obey every specialization rule above. Never substitute
  a generic React/JavaScript interview for a different resume domain.
- Do not repeat any earlier question.
- Return JSON only. No Markdown and no explanation outside JSON.
"""

        batch_questions = None
        batch_errors = []

        # Retry the whole batch once if a provider returns the wrong shape/count.
        for validation_attempt in range(2):
            attempt_prompt = prompt
            if validation_attempt:
                attempt_prompt += f"\nYour previous response was invalid. Return exactly {batch_count} valid question objects and check every required field."

            try:
                print(
                    f"Generating {config['title']} batch {batch_number} "
                    f"({batch_count} questions)...",
                    flush=True
                )
                result = generate_json_response(attempt_prompt)
                batch_questions = validate_round_questions(
                    category,
                    result,
                    expected_count=batch_count
                )

                normalized = [
                    " ".join(q["question"].lower().split())
                    for q in batch_questions
                ]
                if len(set(normalized)) != len(normalized):
                    raise ValueError("Duplicate questions found in this batch.")
                if any(q in seen_questions for q in normalized):
                    raise ValueError("A question repeated from an earlier batch.")

                break
            except Exception as error:
                batch_errors.append(str(error))
                batch_questions = None
                print(
                    f"Batch {batch_number}, attempt {validation_attempt + 1} "
                    f"failed: {error}",
                    flush=True
                )

        if batch_questions is None:
            raise RuntimeError(
                f"Could not generate batch {batch_number} for {config['title']}: "
                + " | ".join(batch_errors)
            )

        for question in batch_questions:
            normalized = " ".join(question["question"].lower().split())
            seen_questions.add(normalized)
            all_questions.append(question)

    if len(all_questions) != total_count:
        raise RuntimeError(
            f"Generation incomplete: expected {total_count}, received {len(all_questions)}."
        )

    print(
        f"{config['title']} generated successfully: {len(all_questions)} questions.",
        flush=True
    )
    return all_questions


# ----------------------------------
# BACKWARD COMPATIBLE QUESTION API
# ----------------------------------

def generate_interview_questions(
    resume_analysis,
    job_role,
    experience
):

    result = {}

    for category in ROUND_CONFIG:

        result[category] = generate_round_questions(
            category=category,
            resume_analysis=resume_analysis,
            job_role=job_role,
            experience=experience
        )

    return result


# ----------------------------------
# TECHNICAL AND HR ANSWER EVALUATION
# ----------------------------------

def evaluate_text_answers(category, questions, answers):

    if category not in [
        "technical_questions",
        "hr_questions"
    ]:
        raise ValueError(
            "Unsupported evaluation category."
        )

    if not isinstance(questions, list) or not questions:
        raise ValueError("Questions are required.")

    if not isinstance(answers, dict):
        raise ValueError("Answers must be an object.")

    question_data = []

    for index, question in enumerate(questions):

        answer_key = f"{category}_{index}"
        answer = answers.get(answer_key, "")

        question_data.append({
            "question": question.get("question", ""),
            "answer": str(answer or "")
        })

    prompt = f"""
You are an expert technical interviewer and HR evaluator.

Evaluate the candidate's answers fairly.

Interview Round: {category}

Questions and Candidate Answers:
{json.dumps(question_data, ensure_ascii=False)}

Evaluation criteria:
- Relevance: 25%
- Accuracy: 35%
- Completeness: 25%
- Clarity: 15%

Give each question a score out of 10.

Rules:
- Empty answers must receive 0 marks.
- Evaluate only what the candidate actually says.
- Do not invent information about the candidate.
- Be fair and constructive.
- Return exactly one result for every question.
- Each score must be between 0 and 10.

Return valid JSON only:

{{
    "question_results": [
        {{
            "question": "Question text",
            "score": 8,
            "max_score": 10,
            "feedback": "Specific feedback",
            "strengths": ["Strength"],
            "improvements": ["Improvement"]
        }}
    ],
    "overall_feedback": "Overall feedback",
    "strengths": ["Strength"],
    "improvements": ["Improvement"]
}}
"""

    result = generate_json_response(prompt)

    question_results = result.get("question_results")

    if (
        not isinstance(question_results, list)
        or len(question_results) != len(questions)
    ):
        raise ValueError(
            "Invalid number of evaluated answers."
        )

    total_score = 0

    for item in question_results:

        score = item.get("score")

        if (
            not isinstance(score, (int, float))
            or isinstance(score, bool)
            or not 0 <= score <= 10
        ):
            raise ValueError("Invalid technical/HR score.")

        item["score"] = round(score)
        item["max_score"] = 10

        total_score += item["score"]

    max_score = len(questions) * 10

    return {
        "question_results": question_results,
        "total_score": total_score,
        "max_score": max_score,
        "percentage": round(
            (total_score / max_score) * 100, 2
        ),
        "overall_feedback": result.get(
            "overall_feedback", ""
        ),
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", [])
    }


# ----------------------------------
# CODING ANSWER EVALUATION
# ----------------------------------

CODING_RUBRIC = {
    "correctness": 8,
    "logic": 4,
    "complexity": 3,
    "code_quality": 3,
    "edge_cases": 2
}


def evaluate_coding_answers(questions, submissions):

    if not isinstance(questions, list) or not questions:
        raise ValueError("Coding questions are required.")

    if not isinstance(submissions, dict):
        raise ValueError("Coding submissions must be an object.")

    if len(questions) > 20:
        raise ValueError("Too many coding questions.")

    question_data = []

    for index, question in enumerate(questions):

        submission_key = f"coding_questions_{index}"

        submission = submissions.get(submission_key, {})

        if not isinstance(submission, dict):
            submission = {}

        submitted_code = submission.get("code", "")
        language = submission.get(
            "language",
            question.get("language", "Not specified")
        )

        if not isinstance(submitted_code, str):
            submitted_code = str(submitted_code or "")

        question_data.append({
            "question_number": index + 1,
            "question": question.get("question", ""),
            "topic": question.get("topic", ""),
            "difficulty": question.get("difficulty", ""),
            "language": language,
            "constraints": question.get("constraints", []),
            "input_format": question.get("input_format", ""),
            "output_format": question.get("output_format", ""),
            "examples": question.get("examples", []),
            "submitted_code": submitted_code
        })

    prompt = f"""
You are a senior software engineer and coding interviewer.

Evaluate the candidate's submitted programming solutions.

CODING QUESTIONS AND SUBMISSIONS:
{json.dumps(question_data, ensure_ascii=False)}

SCORING RUBRIC PER QUESTION: 20 MARKS

1. Code correctness: 0 to 8 marks
2. Logic and approach: 0 to 4 marks
3. Time and space complexity: 0 to 3 marks
4. Code quality and readability: 0 to 3 marks
5. Edge-case handling: 0 to 2 marks

IMPORTANT RULES:

- Evaluate the submitted code against the actual problem.
- Empty or missing code receives zero in every category.
- Do not award marks for code that is not submitted.
- Consider the selected programming language.
- Check syntax and obvious logical errors through code inspection.
- Assess whether the approach can satisfy the given constraints.
- Discuss time and space complexity when possible.
- Identify missing edge cases.
- Do not invent code execution results.
- You cannot actually execute the submitted code.
- Never claim that test cases passed unless execution was performed.
- Be fair and constructive.
- Return exactly one result for each question.
- Every rubric score must be within its allowed range.
- Do not inflate marks just to encourage the candidate.

Return valid JSON only:

{{
    "question_results": [
        {{
            "question_number": 1,
            "score_breakdown": {{
                "correctness": 6,
                "logic": 3,
                "complexity": 2,
                "code_quality": 2,
                "edge_cases": 1
            }},
            "feedback": "Specific code review feedback.",
            "strengths": ["Good approach"],
            "improvements": ["Handle empty input"]
        }}
    ],
    "overall_feedback": "Overall coding performance feedback.",
    "strengths": ["Strength"],
    "improvements": ["Improvement"]
}}

Return JSON only. No Markdown.
"""

    result = generate_json_response(
        prompt,
        system_message=(
            "You are a strict but fair senior software engineer. "
            "Review submitted code carefully. "
            "Return valid JSON only."
        )
    )

    question_results = result.get("question_results")

    if (
        not isinstance(question_results, list)
        or len(question_results) != len(questions)
    ):
        raise ValueError(
            "Invalid number of coding evaluation results."
        )

    validated_results = []
    total_score = 0

    for index, item in enumerate(question_results):

        if not isinstance(item, dict):
            raise ValueError("Invalid coding evaluation item.")

        breakdown = item.get("score_breakdown")

        if not isinstance(breakdown, dict):
            raise ValueError("Coding score breakdown is missing.")

        validated_breakdown = {}

        question_score = 0

        for criterion, maximum in CODING_RUBRIC.items():

            score = breakdown.get(criterion)

            if (
                not isinstance(score, (int, float))
                or isinstance(score, bool)
                or not 0 <= score <= maximum
            ):
                raise ValueError(
                    f"Invalid score for {criterion}."
                )

            score = round(score)

            validated_breakdown[criterion] = score
            question_score += score

        question_score = min(question_score, 20)
        total_score += question_score

        validated_results.append({
            "question_number": index + 1,
            "question": questions[index].get("question", ""),
            "score": question_score,
            "max_score": 20,
            "score_breakdown": validated_breakdown,
            "feedback": item.get("feedback", ""),
            "strengths": item.get("strengths", []),
            "improvements": item.get("improvements", [])
        })

    max_score = len(questions) * 20

    return {
        "question_results": validated_results,
        "total_score": total_score,
        "max_score": max_score,
        "percentage": round(
            (total_score / max_score) * 100, 2
        ),
        "overall_feedback": result.get(
            "overall_feedback", ""
        ),
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", []),
        "evaluation_type": "AI code review - not executed"
    }
