const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// ========================
// CREATE
// ========================
app.post("/signalements", async (req, res) => {
  console.log("requtes post")

    try {
    
    const data = {
      titre: req.body.titre,
      description: req.body.description,
      status: "nouveau",
      surface: req.body.surface,
      budget: req.body.budget || 0,
      userId: req.body.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("signalements").add(data);
    res.status(201).json({ id: docRef.id, message: "Signalement créé" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// READ ALL
// ========================
app.get("/signalements", async (req, res) => {
  try {
    const snapshot = await db.collection("signalements").get();
    const result = [];

    snapshot.forEach(doc => {
      result.push({ id: doc.id, ...doc.data() });
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// READ ONE
// ========================
app.get("/signalements/:id", async (req, res) => {
  try {
    const doc = await db.collection("signalements").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Introuvable" });
    }

    res.json({ id: doc.id, ...doc.data() });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// UPDATE
// ========================
app.put("/signalements/:id", async (req, res) => {
  try {
    await db.collection("signalements").doc(req.params.id).update(req.body);
    res.json({ message: "Signalement modifié" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// DELETE
// ========================
app.delete("/signalements/:id", async (req, res) => {
  try {
    await db.collection("signalements").doc(req.params.id).delete();
    res.json({ message: "Signalement supprimé" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
app.listen(3000, () => {
  console.log("API Firebase démarrée sur http://localhost:3000");
});
