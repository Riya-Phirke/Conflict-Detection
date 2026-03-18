from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)

print("Loading Transformer model... (first run may take 1–2 minutes)")

# Load model with full softmax scores
sentiment_model = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    return_all_scores=True
)

print("Model Loaded Successfully!")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json

    text1 = data.get("user1Message", "")
    text2 = data.get("user2Message", "")

    # Get full probability distribution
    result1 = sentiment_model(text1)[0]
    result2 = sentiment_model(text2)[0]

    def extract_probs(result):
        probs = {}
        for item in result:
            probs[item["label"].lower()] = item["score"]
        return probs

    probs1 = extract_probs(result1)
    probs2 = extract_probs(result2)

    neg1 = probs1.get("negative", 0)
    neg2 = probs2.get("negative", 0)
    pos1 = probs1.get("positive", 0)
    pos2 = probs2.get("positive", 0)
    neu1 = probs1.get("neutral", 0)
    neu2 = probs2.get("neutral", 0)

    # 🔥 Conflict Probability Logic (Softmax-Based)

    # Case 1: Both strongly negative
    both_negative_score = (neg1 + neg2) / 2

    # Case 2: Opposite tone (one positive, one negative)
    opposite_tone_score = abs(pos1 - neg2)

    # Take strongest signal
    raw_conflict_score = max(both_negative_score, opposite_tone_score)

    probability = int(raw_conflict_score * 100)

    # Clamp to 100
    probability = min(100, probability)

    conflict = probability > 40

    # 🔥 Emotion Intensity Classification
    emotion = "Calm"

    if probability > 85:
        emotion = "Severe Conflict"
    elif probability > 65:
        emotion = "High Tension"
    elif probability > 40:
        emotion = "Mild Disagreement"

    # 🔥 Resolution Suggestion
    resolution = None

    if conflict:
        resolution = (
            "The interaction shows emotional intensity. "
            "Consider reframing statements using collaborative and calm language. "
            "Focus on shared goals rather than blame."
        )

    # Final output
    return jsonify({
        "sentiment1": max(probs1, key=probs1.get),
        "sentiment2": max(probs2, key=probs2.get),
        "probability": probability,
        "conflict": conflict,
        "emotion": emotion,
        "resolution": resolution,
        "explainability": {
            "user1_probs": probs1,
            "user2_probs": probs2
        }
    })


if __name__ == "__main__":
    app.run(port=8000)