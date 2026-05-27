let fichierSelectionne = null;

function initDropZone() {
  const zone = document.getElementById("drop-zone");
  const input = document.getElementById("fichier");

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) setFichier(file);
  });

  input.addEventListener("change", () => {
    if (input.files[0]) setFichier(input.files[0]);
  });
}

function setFichier(file) {
  fichierSelectionne = file;
  const ext = file.name.split(".").pop().toLowerCase();
  const allowed = ["pdf", "docx", "pptx", "jpg", "jpeg", "png"];
  if (!allowed.includes(ext)) {
    afficherErreur(
      "upload-error",
      "Format non supporté. Utilise PDF, DOCX, PPTX ou image.",
    );
    fichierSelectionne = null;
    return;
  }
  document.getElementById("drop-icon").className = "fa fa-file-alt";
  document.getElementById("drop-text").textContent = file.name;
  document.getElementById("drop-sub").textContent =
    (file.size / 1024 / 1024).toFixed(2) + " MB";
}

function validerChamps() {
  const champs = [
    { id: "nom", err: "err-nom", msg: "Le nom est obligatoire" },
    {
      id: "description",
      err: "err-description",
      msg: "La description est obligatoire",
    },
    { id: "filiere", err: "err-filiere", msg: "Choisis une filière" },
    { id: "categorie", err: "err-categorie", msg: "Choisis une catégorie" },
    {
      id: "contributeur",
      err: "err-contributeur",
      msg: "Ton prénom est obligatoire",
    },
  ];

  let valide = true;

  champs.forEach((c) => {
    const input = document.getElementById(c.id);
    const err = document.getElementById(c.err);
    const val = input.value.trim();
    if (!val || val === "") {
      input.classList.add("error");
      err.textContent = c.msg;
      err.style.display = "block";
      valide = false;
    } else {
      input.classList.remove("error");
      err.style.display = "none";
    }
  });

  if (!fichierSelectionne) {
    document.getElementById("err-fichier").style.display = "block";
    valide = false;
  } else {
    document.getElementById("err-fichier").style.display = "none";
  }

  return valide;
}

function afficherErreur(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = "block";
}

async function uploader() {
  document.getElementById("upload-success").style.display = "none";
  document.getElementById("upload-error").style.display = "none";

  if (!validerChamps()) return;

  const nom = document.getElementById("nom").value.trim();
  const description = document.getElementById("description").value.trim();
  const filiere = document.getElementById("filiere").value;
  const categorie = document.getElementById("categorie").value;
  const contributeur = document.getElementById("contributeur").value.trim();
  const ext = fichierSelectionne.name.split(".").pop().toLowerCase();
  const chemin = `${Date.now()}_${fichierSelectionne.name.replace(/\s+/g, "_")}`;

  const btn = document.getElementById("btn-upload");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Upload en cours...';

  try {
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/documents/${chemin}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": fichierSelectionne.type,
        },
        body: fichierSelectionne,
      },
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.message || "Erreur storage");
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/documents/${chemin}`;

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        nom,
        description,
        filiere,
        categorie,
        format: ext,
        url,
        contributeur,
      }),
    });

    if (!dbRes.ok) throw new Error("Erreur base de données");

    document.getElementById("upload-success").style.display = "block";
    resetForm();
  } catch (e) {
    afficherErreur("upload-error", "Erreur : " + e.message);
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa fa-upload"></i> Uploader';
}

function resetForm() {
  document.getElementById("nom").value = "";
  document.getElementById("description").value = "";
  document.getElementById("contributeur").value = "";
  document.getElementById("filiere").selectedIndex = 0;
  document.getElementById("categorie").selectedIndex = 0;
  document.getElementById("drop-icon").className = "fa fa-cloud-upload-alt";
  document.getElementById("drop-text").textContent =
    "Glisse ton fichier ici ou clique pour choisir";
  document.getElementById("drop-sub").textContent = "PDF, DOCX, PPTX, Images";
  fichierSelectionne = null;
}

window.addEventListener("DOMContentLoaded", initDropZone);
