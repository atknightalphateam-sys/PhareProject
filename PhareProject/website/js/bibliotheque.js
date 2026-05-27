let tousDocuments = [];
let categorieActive = "tous";
let filiereActive = "toutes";

async function chargerDocuments() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?select=*&order=uploaded_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );
    tousDocuments = await res.json();
    document.getElementById("stat-total").textContent = tousDocuments.length;
    afficher(tousDocuments);
  } catch (e) {
    document.getElementById("docs-grid").innerHTML = `
      <div class="empty-state">
        <i class="fa fa-exclamation-circle"></i>
        Erreur de connexion.
      </div>`;
  }
}

function afficher(docs) {
  const grid = document.getElementById("docs-grid");
  if (!docs.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-folder-open"></i>
        Aucun document trouvé.
      </div>`;
    return;
  }
  grid.innerHTML = docs
    .map(
      (doc) => `
    <div class="doc-card">
      <div class="doc-card-top">
        <div class="doc-format ${fmtClass(doc.format)}">
          ${(doc.format || "?").toUpperCase()}
        </div>
        <div class="doc-cat-badge">${doc.categorie || ""}</div>
      </div>
      <div class="doc-name">${doc.nom}</div>
      <div class="doc-desc">${doc.description || ""}</div>
      <div class="doc-footer">
        <div class="doc-filiere">
          <i class="fa fa-graduation-cap"></i>
          ${doc.filiere || "Général"}
        </div>
        <button class="doc-dl" onclick="window.open('${doc.url}', '_blank')">
          <i class="fa fa-download"></i> Télécharger
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

function fmtClass(fmt) {
  const m = {
    pdf: "fmt-pdf",
    docx: "fmt-docx",
    pptx: "fmt-pptx",
    jpg: "fmt-img",
    jpeg: "fmt-img",
    png: "fmt-img",
  };
  return m[fmt] || "fmt-other";
}

function setFiliere(f, btn) {
  filiereActive = f;
  document
    .querySelectorAll(".filiere-tab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filtrer();
}

function setCategorie(cat, btn) {
  categorieActive = cat;
  document
    .querySelectorAll(".filtre-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filtrer();
}

function filtrer() {
  const q = document.getElementById("recherche").value.toLowerCase();
  let docs = tousDocuments;
  if (filiereActive !== "toutes")
    docs = docs.filter((d) => d.filiere === filiereActive);
  if (categorieActive !== "tous")
    docs = docs.filter((d) => d.categorie === categorieActive);
  if (q)
    docs = docs.filter(
      (d) =>
        (d.nom || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q),
    );
  afficher(docs);
}

window.addEventListener("DOMContentLoaded", chargerDocuments);
