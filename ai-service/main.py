
import traceback
import json
from io import BytesIO
from typing import Dict, Any, List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pymupdf as fitz
from docx import Document

from resume_analyzer import analyze_resume_text

from question_generator import (
    generate_interview_questions,
    generate_round_questions,
    evaluate_coding_answers
)

from answer_evaluator import evaluate_text_answers



# FASTAPI APPLICATION


app = FastAPI(title="AI Smart Interview Platform")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



# REQUEST MODELS


class QuestionRequest(BaseModel):
    resume_analysis: Dict[str, Any]
    job_role: str
    experience: str


class RoundQuestionRequest(BaseModel):
    resume_analysis: Dict[str, Any]
    job_role: str
    experience: str
    round_type: str


class EvaluationRequest(BaseModel):
    round_type: str
    questions: list
    answers: Dict[str, Any]


class CodingEvaluationRequest(BaseModel):
    questions: List[Dict[str, Any]]
    submissions: Dict[str, Any]



# RESUME TEXT EXTRACTION


def extract_text(file_bytes, filename):

    extension = filename.lower().split(".")[-1]

    if extension == "pdf":

        pdf = fitz.open(
            stream=file_bytes,
            filetype="pdf"
        )

        text = "\n".join(
            page.get_text() for page in pdf
        )

        pdf.close()

        return text

    elif extension == "docx":

        document = Document(BytesIO(file_bytes))

        return "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
        )

    else:

        raise ValueError(
            "Only PDF and DOCX files are supported."
        )



# HOME API


@app.get("/")
def home():

    return {
        "success": True,
        "message": "AI Smart Interview Platform is running!"
    }



# RESUME ANALYSIS API


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):

    print(
        "RESUME UPLOAD REQUEST RECEIVED",
        flush=True
    )

    try:

        if not file.filename or not file.filename.lower().endswith(
            (".pdf", ".docx")
        ):

            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported."
            )

        file_bytes = await file.read()

        if len(file_bytes) > 5 * 1024 * 1024:

            raise HTTPException(
                status_code=400,
                detail="File size must be below 5 MB."
            )

        resume_text = extract_text(
            file_bytes,
            file.filename
        )

        if not resume_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume."
            )

        analysis = analyze_resume_text(resume_text)

        analysis_data = json.loads(analysis)

        return {
            "success": True,
            "message": "Resume analyzed successfully!",
            "analysis": analysis_data
        }

    except HTTPException:
        raise

    except Exception as error:

        traceback.print_exc()

        print(
            "RESUME ANALYSIS ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )



# COMPLETE INTERVIEW QUESTIONS API


@app.post("/generate-questions")
async def generate_questions(request: QuestionRequest):

    print(
        "INTERVIEW QUESTION REQUEST RECEIVED",
        flush=True
    )

    try:

        if not request.job_role.strip():

            raise HTTPException(
                status_code=400,
                detail="Job role is required."
            )

        if not request.experience.strip():

            raise HTTPException(
                status_code=400,
                detail="Experience is required."
            )

        if not request.resume_analysis:

            raise HTTPException(
                status_code=400,
                detail="Resume analysis is required."
            )

        questions = generate_interview_questions(
            resume_analysis=request.resume_analysis,
            job_role=request.job_role,
            experience=request.experience
        )

        print(
            "ALL INTERVIEW QUESTIONS GENERATED SUCCESSFULLY",
            flush=True
        )

        return {
            "success": True,
            "message": "Interview questions generated successfully!",
            "questions": questions
        }

    except HTTPException:
        raise

    except Exception as error:

        traceback.print_exc()

        print(
            "QUESTION GENERATION ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ----------------------------------
# INDEPENDENT INTERVIEW ROUND API
# ----------------------------------

@app.post("/generate-round")
async def generate_round(request: RoundQuestionRequest):

    print(
        f"ROUND GENERATION REQUEST: {request.round_type}",
        flush=True
    )

    try:

        if not request.job_role.strip():

            raise HTTPException(
                status_code=400,
                detail="Job role is required."
            )

        if not request.experience.strip():

            raise HTTPException(
                status_code=400,
                detail="Experience is required."
            )

        if not request.resume_analysis:

            raise HTTPException(
                status_code=400,
                detail="Resume analysis is required."
            )

        allowed_rounds = [
            "aptitude_questions",
            "technical_questions",
            "coding_questions",
            "hr_questions"
        ]

        if request.round_type not in allowed_rounds:

            raise HTTPException(
                status_code=400,
                detail="Invalid interview round."
            )

        questions = generate_round_questions(
            category=request.round_type,
            resume_analysis=request.resume_analysis,
            job_role=request.job_role,
            experience=request.experience
        )

        print(
            f"{request.round_type} GENERATED SUCCESSFULLY",
            flush=True
        )

        return {
            "success": True,
            "message": "Interview round generated successfully!",
            "round_type": request.round_type,
            "questions": questions
        }

    except HTTPException:
        raise

    except Exception as error:

        traceback.print_exc()

        print(
            "ROUND GENERATION ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ----------------------------------
# TEXT ANSWER EVALUATION API
# ----------------------------------

@app.post("/evaluate-text")
async def evaluate_text(request: EvaluationRequest):

    try:

        allowed_rounds = [
            "technical_questions",
            "hr_questions"
        ]

        if request.round_type not in allowed_rounds:

            raise HTTPException(
                status_code=400,
                detail="Invalid evaluation round."
            )

        if not request.questions:

            raise HTTPException(
                status_code=400,
                detail="Questions are required."
            )

        result = evaluate_text_answers(
            category=request.round_type,
            questions=request.questions,
            answers=request.answers
        )

        return {
            "success": True,
            "message": "Answers evaluated successfully.",
            "round_type": request.round_type,
            "evaluation": result
        }

    except HTTPException:
        raise

    except Exception as error:

        traceback.print_exc()

        print(
            "TEXT EVALUATION ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to evaluate answers."
        )


# ----------------------------------
# CODING ANSWER EVALUATION API
# ----------------------------------

@app.post("/evaluate-coding")
async def evaluate_coding(request: CodingEvaluationRequest):

    print(
        "CODING EVALUATION REQUEST RECEIVED",
        flush=True
    )

    try:

        if not request.questions:

            raise HTTPException(
                status_code=400,
                detail="Coding questions are required."
            )

        if len(request.questions) > 20:

            raise HTTPException(
                status_code=400,
                detail="Too many coding questions."
            )

        result = evaluate_coding_answers(
            questions=request.questions,
            submissions=request.submissions
        )

        print(
            "CODING EVALUATION COMPLETED SUCCESSFULLY",
            flush=True
        )

        return {
            "success": True,
            "message": "Coding answers evaluated successfully.",
            "evaluation": result
        }

    except HTTPException:
        raise

    except Exception as error:

        traceback.print_exc()

        print(
            "CODING EVALUATION ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to evaluate coding answers."
        )
