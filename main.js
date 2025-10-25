import express from "express";
import cors from "cors";
import fs from "fs";
import { randomUUID } from "crypto";
import QRCode from "qrcode";

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "./database.json";

// Helper to read/write DB
function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 🧍 STUDENT: Submit new gate pass
app.post("/api/request-pass", (req, res) => {
  const { name, id, reason, expectedTime, duration } = req.body;
  const db = readDB();

  const newRequest = {
    uuid: randomUUID(),
    name,
    id,
    reason,
    expectedTime,
    duration,
    status: "pending",
    qr: null,
    rejectionReason: null,
    entryTime: null,
    exitTime: null,
  };

  db.requests.push(newRequest);
  writeDB(db);

  res.json({ message: "Request submitted successfully", request: newRequest });
});

// 🧍 STUDENT: Check status
app.get("/api/student/status/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const requests = db.requests.filter((r) => r.id === id);
  res.json({ requests });
});

// 🧑‍🏫 MODERATOR: Get all pending requests
app.get("/api/moderator/requests", (req, res) => {
  const db = readDB();
  const pending = db.requests.filter((r) => r.status === "pending");
  res.json({ requests: pending });
});

// 🧑‍🏫 MODERATOR: Approve a request
app.post("/api/moderator/approve/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const db = readDB();
  const request = db.requests.find((r) => r.uuid === uuid);

  if (!request) return res.status(404).json({ error: "Request not found" });

  const qrData = {
    name: request.name,
    id: request.id,
    reason: request.reason,
    approvedAt: new Date().toISOString(),
  };

  const qrImage = await QRCode.toDataURL(JSON.stringify(qrData));

  request.status = "approved";
  request.qr = qrImage;

  writeDB(db);
  res.json({ message: "Request approved successfully" });
});

// 🧑‍🏫 MODERATOR: Reject a request
app.post("/api/moderator/reject/:uuid", (req, res) => {
  const { uuid } = req.params;
  const { reason } = req.body;
  const db = readDB();
  const request = db.requests.find((r) => r.uuid === uuid);

  if (!request) return res.status(404).json({ error: "Request not found" });

  request.status = "rejected";
  request.rejectionReason = reason;
  writeDB(db);

  res.json({ message: "Request rejected successfully" });
});

// 🚪 GATEKEEPER: Scan QR
app.post("/api/gate/scan", (req, res) => {
  const { id } = req.body;
  const db = readDB();
  const request = db.requests.find((r) => r.id === id && r.status === "approved");

  if (!request)
    return res.status(400).json({ valid: false, message: "Invalid or expired pass" });

  if (!request.entryTime) {
    request.entryTime = new Date().toISOString();
    writeDB(db);
    return res.json({ valid: true, message: "Entry recorded" });
  } else if (!request.exitTime) {
    request.exitTime = new Date().toISOString();
    writeDB(db);
    return res.json({ valid: true, message: "Exit recorded" });
  } else {
    return res.json({ valid: false, message: "Pass already used" });
  }
});

// 🧑‍💼 ADMIN: View all logs
app.get("/api/admin/logs", (req, res) => {
  const db = readDB();
  res.json({ requests: db.requests });
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
