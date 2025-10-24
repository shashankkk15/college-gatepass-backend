const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = "./data.json";

app.use(cors());
app.use(bodyParser.json());

// Read/write helpers
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { students: [], requests: [], moderators: [], gatekeepers: [], admins: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------------- STUDENT ----------------
app.post("/api/request-pass", async (req, res) => {
  const { name, id, reason, expectedTime, duration } = req.body;
  const data = readData();

  const newRequest = {
    id: uuidv4(),
    name,
    studentId: id,
    reason,
    expectedTime,
    duration,
    status: "Pending",
    remarks: "",
    qr: "",        // QR code will be generated on approval
    entryTime: null,
    exitTime: null
  };

  data.requests.push(newRequest);
  writeData(data);
  res.json({ message: "Request sent successfully", request: newRequest });
});

// ---------------- MODERATOR ----------------
app.get("/api/moderator/requests", (req, res) => {
  const data = readData();
  const pending = data.requests.filter(r => r.status === "Pending");
  res.json(pending);
});

app.post("/api/moderator/approve/:id", async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const data = readData();
  const request = data.requests.find(r => r.id === id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.status = "Approved";
  request.remarks = remarks || "";
  // generate QR code
  request.qr = await QRCode.toDataURL(request.id);
  writeData(data);
  res.json({ message: "Request Approved", request });
});

app.post("/api/moderator/reject/:id", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const data = readData();
  const request = data.requests.find(r => r.id === id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.status = "Rejected";
  request.remarks = reason;
  writeData(data);
  res.json({ message: "Request Rejected", request });
});

// ---------------- GATEKEEPER ----------------
app.post("/api/gate/scan", (req, res) => {
  const { qrId, type } = req.body; // type = 'entry' or 'exit'
  const data = readData();
  const request = data.requests.find(r => r.id === qrId);
  if (!request) return res.status(404).json({ message: "Invalid QR" });

  if (type === "entry") request.entryTime = new Date();
  if (type === "exit") request.exitTime = new Date();
  writeData(data);
  res.json({ message: "Scan recorded", request });
});

// ---------------- ADMIN ----------------
app.get("/api/admin/logs", (req, res) => {
  const data = readData();
  res.json(data.requests);
});

console.log("✅ Server running on port", PORT);
app.listen(PORT);
