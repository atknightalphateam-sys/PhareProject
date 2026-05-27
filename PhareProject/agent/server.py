import os
import json
import re
import requests as req
import urllib3
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from groq import Groq

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

app = Flask(__name__)
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def lire_fichier(nom):
    chemin = os.path.join(os.path.dirname(__file__), nom)
    if os.path.exists(chemin):
        with open(chemin, "r", encoding="utf-8") as f:
            return f.read()
    return ""

soul = lire_fichier("soul.md")
agent_rules = lire_fichier("agent.md")
skills = lire_fichier("skills.md")
SYSTEM_PROMPT = f"{soul}\n\n{agent_rules}\n\n{skills}"

def get_documents():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    r = req.get(
        f"{SUPABASE_URL}/rest/v1/documents?select=*",
        headers=headers,
        verify=False
    )
    return r.json()

@app.route("/chercher", methods=["POST"])
def chercher():
    data = request.json
    demande = data.get("demande", "").strip()

    # Etape 1 - Groq classe le message en secret
    classification = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": f"""
Analyse ce message et réponds UNIQUEMENT par un seul mot :
- RECHERCHE si l'utilisateur cherche un document, cours, fichier, exercice, résumé ou épreuve
- CONVERSATION si c'est une salutation, remerciement, question générale ou autre chose

Message: "{demande}"

Réponds UNIQUEMENT par RECHERCHE ou CONVERSATION, rien d'autre.
"""}]
    )

    type_message = classification.choices[0].message.content.strip().upper()
    print(f"Type: {type_message} | Message: {demande}")

    # Etape 2 - Si c'est une conversation, Phare répond naturellement
    if "CONVERSATION" in type_message:
        reponse_conv = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": demande}
            ]
        )
        return jsonify({"message": reponse_conv.choices[0].message.content.strip()})

    # Etape 3 - Si c'est une recherche, chercher dans la base
    docs = get_documents()
    docs_uniques = list({d['nom']: d for d in docs}.values())

    catalogue = "\n".join([
        f"- ID:{i} | Nom: {d['nom']} | Filiere: {d.get('filiere','?')} | Categorie: {d['categorie']} | Description: {d['description']}"
        for i, d in enumerate(docs_uniques)
    ])

    prompt = f"""
Tu es un assistant qui cherche des documents dans un catalogue.

Catalogue des documents disponibles :
{catalogue}

Un etudiant cherche : "{demande}"

Reponds UNIQUEMENT en JSON valide avec ce format exact :
{{"ids": [0, 1, 2]}}

Donne les indices (ID) de TOUS les documents pertinents sans limite. Si rien ne correspond, donne {{"ids": []}}
"""

    reponse = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    texte = reponse.choices[0].message.content.strip()
    print(f"Groq a repondu: {texte}")

    try:
        match = re.search(r'\{.*\}', texte, re.DOTALL)
        data_json = json.loads(match.group())
        ids = data_json.get("ids", [])

        resultats = []
        for i in ids:
            if 0 <= i < len(docs_uniques):
                d = docs_uniques[i]
                resultats.append({
                    "nom": d["nom"],
                    "description": d.get("description", ""),
                    "url": d["url"]
                })

        if resultats:
            return jsonify({"docs": resultats})
        else:
            return jsonify({"message": "Je n'ai trouve aucun document correspondant a ta demande. Essaie avec d'autres mots-cles !"})

    except Exception as e:
        print(f"ERREUR: {e} | Texte: {texte}")
        return jsonify({"message": "Probleme technique, reessaie."})

if __name__ == "__main__":
   # Par ceci :
app.run(host="0.0.0.0", port=5000, debug=False)
