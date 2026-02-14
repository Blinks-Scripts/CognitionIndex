import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

from prompts import (
    INTERVIEWER_PROMPT,
    FOLLOW_UP_PROMPT,
    EXTRACTOR_PROMPT,
    ASSESSOR_PROMPT,
    ARTIFACTOR_PROMPT,
    EVALUATOR_PROMPT,
    BATCH_EVALUATOR_PROMPT,
    REFERENCE_DETECTION_PROMPT,
    BATCH_REFERENCE_DETECTION_PROMPT,
    BATCH_DEEP_DIVE_REFERENCE_PROMPT
)

load_dotenv()

app = Flask(__name__)
CORS(app)

def get_client(api_key=None):
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)

def clean_json_response(content):
    """Removes markdown code blocks if present and strips whitespace."""
    content = content.strip()
    # Handle ```json ... ``` blocks
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    # Sometimes there is extra text before the first '{'
    first_brace = content.find('{')
    last_brace = content.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        content = content[first_brace:last_brace+1]

    return content.strip()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/new-question', methods=['POST'])
def new_question():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": INTERVIEWER_PROMPT}],
        temperature=1.0
    )
    return jsonify({"question": response.choices[0].message.content})

@app.route('/followup-question', methods=['POST'])
def followup_question():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    conversation = data.get("conversation", [])
    evaluation = data.get("evaluation", {})

    messages = [
        {"role": "system", "content": FOLLOW_UP_PROMPT},
        {"role": "user", "content": json.dumps(conversation)},
        {"role": "user", "content": f"{json.dumps(evaluation.get('overall_assessment', ''))}\n{json.dumps(evaluation.get('recommendations', ''))}"}
    ]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    return jsonify({"question": response.choices[0].message.content})

@app.route('/extract-signals', methods=['POST'])
def extract_signals():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    conversation = data.get("conversation", [])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EXTRACTOR_PROMPT},
            {"role": "user", "content": json.dumps(conversation)}
        ],
        response_format={"type": "json_object"}
    )

    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse signals", "details": str(e), "raw": content}), 500

@app.route('/assess-signals', methods=['POST'])
def assess_signals():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    conversation = data.get("conversation", [])
    signals = data.get("signals", {})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": ASSESSOR_PROMPT},
            {"role": "user", "content": json.dumps(signals)},
            {"role": "user", "content": json.dumps(conversation)}
        ],
        response_format={"type": "json_object"}
    )

    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse assessment", "details": str(e), "raw": content}), 500

@app.route('/generate-artifact', methods=['POST'])
def generate_artifact():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    conversation = data.get("conversation", [])
    signals = data.get("extractedSignals", {})
    assessment = data.get("signalAssessment", {})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": ARTIFACTOR_PROMPT},
            {"role": "user", "content": json.dumps({"conversation": conversation, "extractedSignals": signals, "signalAssessment": assessment})}
        ],
        response_format={"type": "json_object"}
    )

    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse artifact", "details": str(e), "raw": content}), 500

@app.route('/evaluate-artifact', methods=['POST'])
def evaluate_artifact():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    signals = data.get("extractedSignals", {})
    assessment = data.get("signalAssessment", {})
    artifact = data.get("artifact", {})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EVALUATOR_PROMPT},
            {"role": "user", "content": json.dumps(signals)},
            {"role": "user", "content": json.dumps(assessment)},
            {"role": "user", "content": json.dumps(artifact)}
        ],
        response_format={"type": "json_object"}
    )

    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse evaluation", "details": str(e), "raw": content}), 500

@app.route('/evaluate-batch', methods=['POST'])
def evaluate_batch():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    artifacts = data.get("artifacts", [])
    messages = [{"role": "system", "content": BATCH_EVALUATOR_PROMPT}]

    for artifact in artifacts:
        messages.append({"role": "user", "content": json.dumps(artifact)})
        messages.append({"role": "assistant", "content": "Provide another artifact if needed."})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        response_format={"type": "json_object"}
    )
    print(json.dumps(response.choices[0].message.content, indent=2))
    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse batch evaluation", "details": str(e), "raw": content}), 500

@app.route('/detect-reference', methods=['POST'])
def detect_reference():
    data = request.json
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    strength = data.get("strength")
    conversation = data.get("conversation", [])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": REFERENCE_DETECTION_PROMPT},
            {"role": "user", "content": json.dumps({"strength": strength, "conversation": conversation})}
        ],
        response_format={"type": "json_object"}
    )

    content = clean_json_response(response.choices[0].message.content)
    try:
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": "Failed to parse reference detection", "details": str(e), "raw": content}), 500

@app.route('/detect-batch-reference', methods=['POST'])
def detect_batch_reference():
    data = request.json
    print("Received batch reference request for pattern:", data.get("pattern"))
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    pattern = data.get("pattern")
    conversations = data.get("conversations", [])

    results = []

    for convo_obj in conversations:
        convo_id = convo_obj.get("id")
        convo_title = convo_obj.get("title")
        messages = convo_obj.get("conversation", [])

        try:
            system_content = BATCH_REFERENCE_DETECTION_PROMPT + "\n\n" + pattern
            print("\n\n\n#####")
            print(f"Processing conversation: {convo_title} ({convo_id})")
            print(f"System content: {system_content}")
            print("#####\n\n\n")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": "Run detection on the following conversation: " + json.dumps(messages)}
                ],
                response_format={"type": "json_object"}
            )

            content = clean_json_response(response.choices[0].message.content)
            detection = json.loads(content)

            results.append({
                "conversation_id": convo_id,
                "conversation_title": convo_title,
                "reference": detection.get("reference"),
                "supporting_material": detection.get("supporting_material", [])
            })
        except Exception as e:
            print(f"Error processing conversation {convo_id}: {str(e)}")
            continue

    return jsonify({"results": results})

@app.route('/deep-dive-reference', methods=['POST'])
def deep_dive_reference():
    data = request.json
    print("Received deep dive request for point:", data.get("point"))
    client = get_client(data.get("api_key"))
    if not client:
        return jsonify({"error": "No API key provided"}), 400

    point = data.get("point")
    conversation = data.get("conversation", [])

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": BATCH_DEEP_DIVE_REFERENCE_PROMPT},
                {"role": "user", "content": json.dumps({"point": point, "conversation": conversation})}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return jsonify(result)
    except Exception as e:
        print(f"Error in deep dive reference: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv("PORT", 5001)))
