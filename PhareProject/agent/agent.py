import os
from dotenv import load_dotenv
from supabase import create_client
from groq import Groq

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

def lire_fichier(nom):
    chemin = os.path.join(os.path.dirname(__file__), nom)
    if os.path.exists(chemin):
        with open(chemin, "r", encoding="utf-8") as f:
            return f.read()
    return ""

soul = lire_fichier("soul.md")
agent_rules = lire_fichier("agent.md")
skills = lire_fichier("skills.md")

SYSTEM_PROMPT = f"""
{soul}

{agent_rules}

{skills}
"""

def chercher_documents(demande: str):
    result = supabase.table("documents").select("*").execute()
    docs = result.data

    if not docs:
        return "Aucun document disponible pour le moment."

    docs_uniques = list({d['nom']: d for d in docs}.values())

    catalogue = "\n".join([
        f"- Nom: {d['nom']} | Catégorie: {d['categorie']} | Description: {d['description']} | URL: {d['url']}"
        for d in docs_uniques
    ])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + f"\n\nCatalogue actuel:\n{catalogue}\n\nIMPORTANT: Quand tu trouves un document, inclus directement son URL dans ta réponse."},
        {"role": "user", "content": demande}
    ]

    reponse = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    return reponse.choices[0].message.content.strip()

if __name__ == "__main__":
    print("👋 Bonjour ! Je suis Phare, ton assistant pédagogique.")
    print("Tape 'quit' pour quitter.\n")

    while True:
        demande = input("Toi: ")
        if demande.lower() == "quit":
            break
        reponse = chercher_documents(demande)
        print(f"\nPhare: {reponse}\n")