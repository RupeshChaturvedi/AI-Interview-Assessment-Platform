
import json

from question_generator import (
    groq_client,
    gemini_client,
    GROQ_MODEL,
    GEMINI_MODEL
)


def evaluate_text_answers(category, questions, answers):

    if category not in [
        "technical_questions",
        "hr_questions"
    ]:
        raise ValueError("Unsupported evaluation category.")

    if not isinstance(questions, list) or not questions:
        raise ValueError("Questions are required.")

    if not isinstance(answers, dict):
        raise ValueError("Answers must be an object.")

    if len(questions) > 20:
        raise ValueError("Too many questions for evaluation.")

    question_data = []

    for index, question in enumerate(questions):

        answer_key = f"{category}_{index}"
        answer = answers.get(answer_key, "")

        if not isinstance(answer, str):
            answer = str(answer) if answer is not None else ""

        question_data.append({
            "question": question.get("question", ""),
            "answer": answer
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
- Total score must be calculated from individual scores.

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
    "total_score": 80,
    "max_score": 100,
    "percentage": 80,
    "overall_feedback": "Overall feedback",
    "strengths": ["Strength"],
    "improvements": ["Improvement"]
}}
"""

    errors = []

    # Primary provider: Groq
    if groq_client:
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert interviewer. "
                            "Return valid JSON only."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )

            result = json.loads(
                response.choices[0].message.content
            )

            return validate_evaluation(result, len(questions))

        except Exception as error:
            print("Groq evaluation failed:", repr(error))
            errors.append(f"Groq: {error}")

    # Backup provider: Gemini
    if gemini_client:
        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json"
                }
            )

            result = json.loads(response.text)

            return validate_evaluation(result, len(questions))

        except Exception as error:
            print("Gemini evaluation failed:", repr(error))
            errors.append(f"Gemini: {error}")

    raise RuntimeError(
        "Both AI providers failed. " + " | ".join(errors)
    )


def validate_evaluation(result, expected_count):

    if not isinstance(result, dict):
        raise ValueError("Invalid evaluation response.")

    question_results = result.get("question_results")

    if (
        not isinstance(question_results, list)
        or len(question_results) != expected_count
    ):
        raise ValueError("Invalid number of evaluated answers.")

    total_score = 0

    for item in question_results:

        score = item.get("score")

        if (
            not isinstance(score, (int, float))
            or isinstance(score, bool)
            or not 0 <= score <= 10
        ):
            raise ValueError("Invalid question score.")

        item["score"] = round(score)
        item["max_score"] = 10
        total_score += item["score"]

    max_score = expected_count * 10

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
