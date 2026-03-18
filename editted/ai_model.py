from fastapi import FastAPI
from transformers import pipeline
import uvicorn

app = FastAPI()

emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)

@app.post("/analyze-tone")
async def analyze_tone(data: dict):

    text = data["text"]

    result = emotion_model(text)[0]

    return {
        "emotion": result["label"],
        "confidence": float(result["score"])
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)